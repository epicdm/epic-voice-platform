"""
Funnel Webhook Handlers

Handles webhook callbacks for funnel executions, particularly call completions.
"""

import logging
from typing import Optional
from flask import Blueprint, request, jsonify
from sqlalchemy.orm import Session

from .models import FunnelExecution
from .enqueue import enqueue_funnel_stage

logger = logging.getLogger(__name__)

funnel_webhook_bp = Blueprint('funnel_webhooks', __name__, url_prefix='/api/funnels/webhooks')


def get_db():
    """Get database session"""
    from backend.database_setup import SessionLocal
    return SessionLocal()


@funnel_webhook_bp.route('/call-completed', methods=['POST'])
def handle_call_completed():
    """
    Handle call completion webhook

    Expected payload:
    {
        "execution_id": "uuid",
        "room_name": "funnel-xxx-yyy",
        "sip_call_id": "...",
        "outcome": "answered|no_answer|voicemail|failed",
        "duration": 120,
        "call_log_id": "uuid"
    }
    """
    db = get_db()

    try:
        data = request.json
        execution_id = data.get('execution_id')
        outcome = data.get('outcome')
        room_name = data.get('room_name')

        if not execution_id or not outcome:
            return jsonify({'error': 'execution_id and outcome are required'}), 400

        logger.info(
            f"📞 Call completed webhook: execution={execution_id}, "
            f"outcome={outcome}, room={room_name}"
        )

        # Get the execution
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id
        ).first()

        if not execution:
            logger.warning(f"Execution {execution_id} not found")
            return jsonify({'error': 'Execution not found'}), 404

        # Update execution context with call outcome
        if not execution.context:
            execution.context = {}

        execution.context["call_outcome"] = outcome
        execution.context["call_completed"] = True
        execution.context["call_duration"] = data.get('duration', 0)

        if data.get('call_log_id'):
            execution.context["call_log_id"] = data.get('call_log_id')

        db.commit()

        logger.info(
            f"✅ Updated execution {execution_id} with call outcome: {outcome}"
        )

        # Re-queue the CALL node so it can process the outcome and move to next stage
        if execution.current_node_id:
            logger.info(
                f"📬 Re-queueing CALL node to process outcome and continue funnel"
            )

            enqueue_funnel_stage(
                db=db,
                execution_id=execution.id,
                node_id=execution.current_node_id,
                user_id=execution.user_id,
                funnel_id=execution.funnel_id,
                payload=execution.contact_data or {},
                execute_at=None  # Execute immediately
            )

            logger.info(f"✅ CALL node re-queued for execution {execution_id}")

        return jsonify({
            'success': True,
            'execution_id': execution_id,
            'outcome': outcome
        })

    except Exception as e:
        logger.error(f"Error handling call completion webhook: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    finally:
        db.close()


@funnel_webhook_bp.route('/livekit-event', methods=['POST'])
def handle_livekit_event():
    """
    Handle LiveKit room events

    This can parse LiveKit's webhook events to extract call outcomes.
    LiveKit sends events like:
    - room_started
    - participant_joined
    - participant_left
    - room_finished

    We can use these to determine call outcomes.
    """
    db = get_db()

    try:
        data = request.json
        event_type = data.get('event')
        room_name = data.get('room', {}).get('name')

        logger.info(f"LiveKit event: {event_type}, room={room_name}")

        # Extract execution_id from room name (format: funnel-{exec_id[:8]}-{uuid})
        if room_name and room_name.startswith('funnel-'):
            parts = room_name.split('-')
            if len(parts) >= 2:
                exec_id_prefix = parts[1]

                # Find execution by prefix
                execution = db.query(FunnelExecution).filter(
                    FunnelExecution.id.like(f"{exec_id_prefix}%")
                ).first()

                if execution:
                    logger.info(f"Found execution {execution.id} for room {room_name}")

                    # Handle different event types
                    if event_type == 'room_finished':
                        # Call ended - determine outcome based on duration
                        duration = data.get('room', {}).get('duration', 0)

                        if duration > 5:  # More than 5 seconds = answered
                            outcome = "answered"
                        else:
                            outcome = "no_answer"

                        # Update execution with outcome
                        if not execution.context:
                            execution.context = {}

                        execution.context["call_outcome"] = outcome
                        execution.context["call_completed"] = True
                        execution.context["call_duration"] = duration

                        db.commit()

                        logger.info(
                            f"✅ Auto-determined call outcome: {outcome} "
                            f"(duration={duration}s)"
                        )

                        # Re-queue for processing
                        if execution.current_node_id:
                            enqueue_funnel_stage(
                                db=db,
                                execution_id=execution.id,
                                node_id=execution.current_node_id,
                                user_id=execution.user_id,
                                funnel_id=execution.funnel_id,
                                payload=execution.contact_data or {},
                                execute_at=None
                            )

        return jsonify({'success': True})

    except Exception as e:
        logger.error(f"Error handling LiveKit event: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

    finally:
        db.close()
