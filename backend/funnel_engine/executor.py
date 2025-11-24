"""
Funnel Executor

Core execution engine for processing funnel stages.
Handles different node types and manages execution state.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
import logging
import requests
import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from .models import (
    FunnelExecution,
    FunnelNode,
    FunnelExecutionEvent,
    NodeType,
    ExecutionStatus,
)
from .enqueue import enqueue_next_stage

logger = logging.getLogger(__name__)


class FunnelExecutor:
    """
    Funnel stage execution engine

    Processes individual funnel stages and manages state transitions
    """

    def __init__(self, db: Session):
        """
        Initialize executor

        Args:
            db: Database session
        """
        self.db = db

    def process_stage(
        self,
        execution_id: str,
        node_id: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Process a funnel stage

        Args:
            execution_id: Funnel execution ID
            node_id: Node/stage to process
            payload: Optional execution data

        Returns:
            Outcome string (e.g., "completed", "answered", "failed")
        """
        # Get execution
        execution = self.db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id
        ).first()

        if not execution:
            raise ValueError(f"Execution {execution_id} not found")

        # Get node
        node = self.db.query(FunnelNode).filter(
            FunnelNode.id == node_id
        ).first()

        if not node:
            raise ValueError(f"Node {node_id} not found")

        # Log event: node_entered
        self._log_event(
            execution_id=execution_id,
            user_id=execution.user_id,
            event_type="node_entered",
            node_id=node_id,
            metadata={"payload": payload},
        )

        # Update execution state
        execution.current_node_id = node_id
        execution.updated_at = datetime.utcnow()
        self.db.commit()

        # Process based on node type
        try:
            outcome = self._execute_node(execution, node, payload)

            # Log event: node_completed
            self._log_event(
                execution_id=execution_id,
                user_id=execution.user_id,
                event_type="node_completed",
                node_id=node_id,
                outcome=outcome,
                metadata={"payload": payload},
            )

            # Update execution last outcome
            execution.last_outcome = outcome
            self.db.commit()

            # Check if end node
            if node.node_type == NodeType.END:
                self._complete_execution(execution, outcome)
                return outcome

            # Enqueue next stage based on outcome
            next_queue = enqueue_next_stage(
                db=self.db,
                execution_id=execution_id,
                current_node_id=node_id,
                outcome=outcome,
                user_id=execution.user_id,
                funnel_id=execution.funnel_id,
                payload=payload,
            )

            if not next_queue:
                # No next stage found - complete execution
                self._complete_execution(execution, outcome)

            # Log event: transition
            if next_queue:
                self._log_event(
                    execution_id=execution_id,
                    user_id=execution.user_id,
                    event_type="transition",
                    node_id=node_id,
                    outcome=outcome,
                    metadata={"next_node_id": next_queue.node_id},
                )

            return outcome

        except Exception as e:
            logger.error(f"Error processing stage {node_id}: {e}", exc_info=True)

            # Log event: failed
            self._log_event(
                execution_id=execution_id,
                user_id=execution.user_id,
                event_type="failed",
                node_id=node_id,
                error_message=str(e),
            )

            # Update execution status
            execution.status = ExecutionStatus.FAILED
            execution.updated_at = datetime.utcnow()
            self.db.commit()

            raise

    def _execute_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute a specific node type

        Args:
            execution: Funnel execution
            node: Node to execute
            payload: Execution data

        Returns:
            Outcome string
        """
        if node.node_type == NodeType.CALL:
            return self._execute_call_node(execution, node, payload)
        elif node.node_type == NodeType.DELAY:
            return self._execute_delay_node(execution, node, payload)
        elif node.node_type == NodeType.CONDITION:
            return self._execute_condition_node(execution, node, payload)
        elif node.node_type == NodeType.WEBHOOK:
            return self._execute_webhook_node(execution, node, payload)
        elif node.node_type == NodeType.EMAIL:
            return self._execute_email_node(execution, node, payload)
        elif node.node_type == NodeType.SMS:
            return self._execute_sms_node(execution, node, payload)
        elif node.node_type == NodeType.END:
            return "completed"
        else:
            raise ValueError(f"Unknown node type: {node.node_type}")

    def _execute_call_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute CALL node - initiate AI voice call

        Args:
            execution: Funnel execution
            node: Call node
            payload: Execution data

        Returns:
            Call outcome ("pending", "answered", "voicemail", "no_answer", "failed")
        """
        config = node.config or {}
        agent_id = config.get("agent_id")

        if not agent_id:
            raise ValueError(f"Call node {node.id} missing agent_id in config")

        # Get contact phone number from payload or execution
        contact_data = payload or execution.contact_data or {}
        phone_number = contact_data.get("phone") or contact_data.get("phoneNumber")

        if not phone_number:
            raise ValueError(f"Execution {execution.id} missing phone number")

        logger.info(
            f"CALL NODE: agent={agent_id}, phone={phone_number}, "
            f"execution={execution.id}, node={node.id}"
        )

        # Check if call already initiated
        if not execution.context:
            execution.context = {}

        # If call not yet initiated, start it
        if "call_initiated" not in execution.context:
            try:
                from .call_service import CallService

                call_service = CallService(self.db)

                # Initiate the call via LiveKit
                # Note: from_number is optional - if not specified, uses agent's assigned number
                call_result = call_service.initiate_call(
                    agent_id=agent_id,
                    to_number=phone_number,
                    from_number=config.get("from_number"),  # Optional override (rarely used)
                    execution_id=execution.id,
                    node_id=node.id
                )

                # Store call details in execution context
                execution.context["call_initiated"] = True
                execution.context["call_details"] = {
                    "room_name": call_result["room_name"],
                    "sip_call_id": call_result["sip_call_id"],
                    "participant_id": call_result["participant_id"],
                    "to_number": call_result["to_number"],
                    "from_number": call_result["from_number"],
                    "agent_id": agent_id,
                    "node_id": node.id
                }
                self.db.commit()

                logger.info(
                    f"✅ Call initiated: room={call_result['room_name']}, "
                    f"sip_call_id={call_result['sip_call_id']}"
                )

            except Exception as e:
                logger.error(f"❌ Failed to initiate call: {e}", exc_info=True)
                # Mark as failed and return failed outcome
                execution.context["call_failed"] = True
                execution.context["call_error"] = str(e)
                self.db.commit()
                return "failed"

        # Call has been initiated - now waiting for completion webhook
        # Check if we have a call outcome from webhook
        if "call_outcome" in execution.context:
            outcome = execution.context["call_outcome"]
            logger.info(f"✅ Call completed with outcome: {outcome}")
            return outcome

        # Call is still pending (waiting for webhook)
        logger.info(f"⏳ Call pending (waiting for completion webhook)")
        return "pending"

    def _execute_delay_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute DELAY node - wait for specified duration

        Args:
            execution: Funnel execution
            node: Delay node
            payload: Execution data

        Returns:
            "completed" after delay
        """
        config = node.config or {}
        delay_seconds = config.get("duration", 0)  # Fixed: was "delay_seconds"

        logger.info(
            f"DELAY NODE: {delay_seconds}s delay for execution={execution.id}, "
            f"node={node.id}"
        )

        # Initialize context if needed
        if not execution.context:
            execution.context = {}

        # Check if this is first time or re-entry
        if "delay_until" not in execution.context:
            # First time - schedule completion
            completion_time = datetime.utcnow() + timedelta(seconds=delay_seconds)
            execution.context["delay_until"] = completion_time.isoformat()
            self.db.commit()

            logger.info(
                f"DELAY NODE: Scheduled for {completion_time.isoformat()} "
                f"(+{delay_seconds}s from now)"
            )

            # Re-queue for later execution
            from .enqueue import enqueue_funnel_stage
            enqueue_funnel_stage(
                db=self.db,
                execution_id=execution.id,
                node_id=node.id,
                user_id=execution.user_id,
                funnel_id=execution.funnel_id,
                payload=payload or {},
                execute_at=completion_time,  # Schedule for future
            )

            return "waiting"
        else:
            # Re-entry - check if delay elapsed
            completion_time = datetime.fromisoformat(execution.context["delay_until"])

            if datetime.utcnow() >= completion_time:
                logger.info(f"DELAY NODE: Delay elapsed, proceeding")
                return "completed"
            else:
                # Still waiting - re-queue
                logger.info(
                    f"DELAY NODE: Still waiting until {completion_time.isoformat()}"
                )
                from .enqueue import enqueue_funnel_stage
                enqueue_funnel_stage(
                    db=self.db,
                    execution_id=execution.id,
                    node_id=node.id,
                    user_id=execution.user_id,
                    funnel_id=execution.funnel_id,
                    payload=payload or {},
                    execute_at=completion_time,
                )
                return "waiting"

    def _execute_condition_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute CONDITION node - evaluate condition and return outcome

        Args:
            execution: Funnel execution
            node: Condition node
            payload: Execution data

        Returns:
            Condition outcome ("true", "false", or custom)
        """
        config = node.config or {}
        condition_type = config.get("condition_type")

        # Simple condition evaluation
        # TODO: Implement more sophisticated condition logic

        if condition_type == "last_outcome_equals":
            expected = config.get("expected_value")
            actual = execution.last_outcome
            return "true" if actual == expected else "false"

        elif condition_type == "field_exists":
            field = config.get("field_name")
            contact_data = execution.contact_data or {}
            return "true" if contact_data.get(field) else "false"

        elif condition_type == "field_equals":
            field = config.get("field_name")
            expected = config.get("expected_value")
            contact_data = execution.contact_data or {}
            actual = contact_data.get(field)
            return "true" if actual == expected else "false"

        else:
            logger.warning(f"Unknown condition type: {condition_type}")
            return "false"

    def _execute_webhook_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute WEBHOOK node - send HTTP request to external endpoint

        Args:
            execution: Funnel execution
            node: Webhook node
            payload: Execution data

        Returns:
            HTTP status outcome ("success", "failed")
        """
        config = node.config or {}
        webhook_url = config.get("webhook_url")
        method = config.get("method", "POST").upper()
        timeout = config.get("timeout", 30)

        if not webhook_url:
            raise ValueError(f"Webhook node {node.id} missing webhook_url in config")

        # Prepare webhook payload
        webhook_payload = {
            "execution_id": execution.id,
            "funnel_id": execution.funnel_id,
            "node_id": node.id,
            "contact_data": execution.contact_data,
            "context": execution.context,
            "custom_data": payload,
        }

        try:
            logger.info(f"WEBHOOK NODE: {method} {webhook_url}")

            response = requests.request(
                method=method,
                url=webhook_url,
                json=webhook_payload,
                timeout=timeout,
            )

            response.raise_for_status()

            logger.info(
                f"Webhook succeeded: status={response.status_code}, "
                f"execution={execution.id}"
            )

            return "success"

        except requests.exceptions.RequestException as e:
            logger.error(f"Webhook failed: {e}", exc_info=True)
            return "failed"

    def _execute_email_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute EMAIL node - send email

        Args:
            execution: Funnel execution
            node: Email node
            payload: Execution data

        Returns:
            "sent" or "failed"
        """
        config = node.config or {}
        from_email = config.get("from_email", "noreply@epic.dm")
        subject = config.get("subject", "Message from Epic Voice AI")
        body = config.get("body", "")
        html_body = config.get("html_body")

        contact_data = execution.contact_data or {}
        to_email = contact_data.get("email")

        if not to_email:
            raise ValueError(f"Execution {execution.id} missing email")

        logger.info(
            f"EMAIL NODE: to={to_email}, subject={subject}"
        )

        try:
            # Get SMTP credentials from environment
            smtp_host = os.getenv("SMTP_HOST", "live.smtp.mailtrap.io")
            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("SMTP_USER", "api")
            smtp_password = os.getenv("SENDGRID_API_KEY")  # Using existing var name

            if not smtp_password:
                raise ValueError("SMTP credentials not configured (SENDGRID_API_KEY missing)")

            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = from_email
            msg["To"] = to_email
            msg["Subject"] = subject

            # Add plain text part
            if body:
                msg.attach(MIMEText(body, "plain"))

            # Add HTML part if provided
            if html_body:
                msg.attach(MIMEText(html_body, "html"))
            elif not body:
                # No body at all - use subject as body
                msg.attach(MIMEText(subject, "plain"))

            # Send via SMTP
            logger.info(f"Connecting to SMTP: {smtp_host}:{smtp_port}")
            with smtplib.SMTP(smtp_host, smtp_port) as server:
                server.starttls()
                server.login(smtp_user, smtp_password)
                server.send_message(msg)

            logger.info(f"✅ Email sent successfully to {to_email}")
            return "sent"

        except Exception as e:
            logger.error(f"❌ Failed to send email: {e}", exc_info=True)
            return "failed"

    def _execute_sms_node(
        self,
        execution: FunnelExecution,
        node: FunnelNode,
        payload: Optional[Dict[str, Any]],
    ) -> str:
        """
        Execute SMS node - send SMS

        Args:
            execution: Funnel execution
            node: SMS node
            payload: Execution data

        Returns:
            "sent" or "failed"
        """
        config = node.config or {}
        message = config.get("message")

        contact_data = execution.contact_data or {}
        phone = contact_data.get("phone") or contact_data.get("phoneNumber")

        if not phone:
            raise ValueError(f"Execution {execution.id} missing phone number")

        # TODO: Integrate with SMS service (Twilio, etc.)
        logger.info(
            f"SMS NODE: to={phone}, message={message[:50]}..., "
            f"execution={execution.id}"
        )

        # Placeholder - would actually send SMS
        return "sent"

    def _complete_execution(
        self,
        execution: FunnelExecution,
        final_outcome: str,
    ) -> None:
        """
        Mark execution as completed

        Args:
            execution: Funnel execution
            final_outcome: Final outcome
        """
        execution.status = ExecutionStatus.COMPLETED
        execution.completed_at = datetime.utcnow()
        execution.last_outcome = final_outcome
        execution.updated_at = datetime.utcnow()
        self.db.commit()

        logger.info(
            f"Execution {execution.id} completed with outcome: {final_outcome}"
        )

    def _log_event(
        self,
        execution_id: str,
        user_id: str,
        event_type: str,
        node_id: Optional[str] = None,
        outcome: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> FunnelExecutionEvent:
        """
        Log execution event (event sourcing pattern)

        Args:
            execution_id: Execution ID
            user_id: User ID
            event_type: Event type
            node_id: Optional node ID
            outcome: Optional outcome
            metadata: Optional metadata
            error_message: Optional error message

        Returns:
            Event record
        """
        import uuid

        event = FunnelExecutionEvent(
            id=str(uuid.uuid4()),
            execution_id=execution_id,
            user_id=user_id,
            event_type=event_type,
            node_id=node_id,
            outcome=outcome,
            event_metadata=metadata,
            error_message=error_message,
        )

        self.db.add(event)
        self.db.commit()

        return event
