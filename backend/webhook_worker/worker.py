#!/usr/bin/env python3
"""
Webhook Delivery Worker

Production-ready worker for processing webhook delivery queue with:
- Exponential backoff retry logic
- HMAC-SHA256 signature generation
- Multi-tenant isolation
- Horizontal scaling with PostgreSQL SKIP LOCKED
- Systemd integration

Usage:
    python worker.py --instance 1
    python worker.py --instance 2 --debug
"""

import argparse
import signal
import sys
import time
import json
import uuid
from datetime import datetime
from typing import List, Optional
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import WebhookDeliveryQueue, WebhookDeliveryLog, Base
from signer import WebhookSigner
from retry import RetryStrategy
from config import WorkerConfig, setup_logging


class WebhookWorker:
    """
    Webhook delivery worker with retry logic and HMAC signing.

    Features:
    - Polls database queue for pending webhooks
    - Delivers webhooks with HMAC-SHA256 signatures
    - Handles retries with exponential backoff
    - Logs all delivery attempts for audit trail
    - Supports graceful shutdown via SIGTERM/SIGINT
    """

    def __init__(self, worker_id: str):
        """
        Initialize webhook worker.

        Args:
            worker_id: Unique worker instance identifier (e.g., "1", "2", "3")
        """
        self.worker_id = worker_id
        self.running = True
        self.logger = setup_logging(worker_id)

        # Validate configuration
        WorkerConfig.validate()

        # Database connection
        self.logger.info("Connecting to database...")
        engine = create_engine(
            WorkerConfig.DATABASE_URL,
            pool_pre_ping=True,
            pool_size=WorkerConfig.DB_POOL_SIZE,
            pool_timeout=WorkerConfig.DB_POOL_TIMEOUT
        )
        Base.metadata.bind = engine
        self.Session = sessionmaker(bind=engine)

        # HTTP session with connection pooling
        self.http_session = self._create_http_session()

        # Metrics
        self.metrics = {
            'delivered': 0,
            'failed': 0,
            'dead_letter': 0,
            'total_processed': 0,
            'start_time': datetime.utcnow()
        }

        self.logger.info(f"Worker {self.worker_id} initialized successfully")

    def _create_http_session(self) -> requests.Session:
        """Create HTTP session with connection pooling and retry logic."""
        session = requests.Session()

        # Connection pooling
        adapter = HTTPAdapter(
            pool_connections=WorkerConfig.HTTP_POOL_SIZE,
            pool_maxsize=WorkerConfig.HTTP_POOL_SIZE,
            max_retries=Retry(
                total=WorkerConfig.HTTP_MAX_RETRIES,
                backoff_factor=0.3,
                status_forcelist=[500, 502, 503, 504],
                allowed_methods=["POST"]
            )
        )
        session.mount('http://', adapter)
        session.mount('https://', adapter)

        return session

    def dequeue_webhooks(self, db: Session) -> List[WebhookDeliveryQueue]:
        """
        Dequeue webhooks ready for delivery using SKIP LOCKED.

        Args:
            db: Database session

        Returns:
            List of webhooks to process
        """
        webhooks = db.query(WebhookDeliveryQueue).filter(
            WebhookDeliveryQueue.status.in_(['pending', 'failed']),
            WebhookDeliveryQueue.next_retry_at <= datetime.utcnow()
        ).order_by(
            WebhookDeliveryQueue.next_retry_at.asc()
        ).limit(
            WorkerConfig.WORKER_BATCH_SIZE
        ).with_for_update(
            skip_locked=True  # PostgreSQL SKIP LOCKED for concurrency
        ).all()

        # Mark as processing
        for webhook in webhooks:
            webhook.status = 'processing'
            webhook.last_attempt_at = datetime.utcnow()
            webhook.attempt_count += 1

        db.commit()

        return webhooks

    def deliver_webhook(
        self,
        webhook: WebhookDeliveryQueue,
        db: Session
    ) -> bool:
        """
        Deliver webhook with HMAC signature.

        Args:
            webhook: Webhook delivery queue entry
            db: Database session

        Returns:
            True if delivery successful (2xx response)
        """
        start_time = time.time()
        success = False
        response_status = None
        response_body = None
        error_message = None
        network_error = False

        try:
            # Generate HMAC signature
            headers = WebhookSigner.create_webhook_headers(
                payload=webhook.payload,
                secret=webhook.secret
            )

            # HTTP POST delivery
            self.logger.info(
                f"Delivering webhook {webhook.id} (attempt {webhook.attempt_count}/{webhook.max_attempts}) "
                f"to {webhook.url}"
            )

            response = self.http_session.post(
                url=webhook.url,
                json=webhook.payload,
                headers=headers,
                timeout=WorkerConfig.HTTP_TIMEOUT
            )

            response_status = response.status_code
            response_body = response.text[:1000]  # Truncate for storage

            # Check success (2xx status codes)
            success = 200 <= response_status < 300

            if success:
                self.logger.info(
                    f"✅ Webhook {webhook.id} delivered successfully (status {response_status})"
                )
            else:
                self.logger.warning(
                    f"⚠️ Webhook {webhook.id} delivery failed with status {response_status}"
                )

        except requests.exceptions.Timeout:
            error_message = "Request timeout"
            network_error = True
            self.logger.warning(f"⏱️ Webhook {webhook.id} timed out")

        except requests.exceptions.ConnectionError as e:
            error_message = f"Connection error: {str(e)}"
            network_error = True
            self.logger.warning(f"🔌 Webhook {webhook.id} connection error: {e}")

        except Exception as e:
            error_message = f"Unexpected error: {str(e)}"
            self.logger.error(f"❌ Webhook {webhook.id} unexpected error: {e}", exc_info=True)

        # Calculate response time
        response_time_ms = int((time.time() - start_time) * 1000)

        # Update webhook status
        self._update_webhook_status(
            webhook=webhook,
            db=db,
            success=success,
            response_status=response_status,
            response_body=response_body,
            error_message=error_message
        )

        # Log delivery attempt (audit trail)
        if WorkerConfig.AUDIT_LOG_ENABLED:
            self._log_delivery_attempt(
                webhook=webhook,
                db=db,
                success=success,
                response_status=response_status,
                response_body=response_body,
                response_time_ms=response_time_ms,
                error_message=error_message,
                network_error=network_error
            )

        return success

    def _update_webhook_status(
        self,
        webhook: WebhookDeliveryQueue,
        db: Session,
        success: bool,
        response_status: Optional[int],
        response_body: Optional[str],
        error_message: Optional[str]
    ) -> None:
        """Update webhook delivery status in queue."""
        webhook.last_response_status = response_status
        webhook.last_response_body = response_body
        webhook.last_error = error_message

        if success:
            # Delivery successful
            webhook.status = 'delivered'
            webhook.deliveredAt = datetime.utcnow()
            self.metrics['delivered'] += 1

        elif RetryStrategy.should_retry(webhook.attempt_count, response_status):
            # Retry with exponential backoff
            webhook.status = 'failed'
            webhook.next_retry_at = RetryStrategy.calculate_next_retry(webhook.attempt_count)
            self.metrics['failed'] += 1

            self.logger.info(
                f"🔄 Webhook {webhook.id} will retry at {webhook.next_retry_at.isoformat()}"
            )

        else:
            # Max retries exceeded - dead letter queue
            webhook.status = 'dead_letter'
            self.metrics['dead_letter'] += 1

            self.logger.error(
                f"💀 Webhook {webhook.id} moved to dead letter queue after "
                f"{webhook.attempt_count} attempts"
            )

        db.commit()

    def _log_delivery_attempt(
        self,
        webhook: WebhookDeliveryQueue,
        db: Session,
        success: bool,
        response_status: Optional[int],
        response_body: Optional[str],
        response_time_ms: int,
        error_message: Optional[str],
        network_error: bool
    ) -> None:
        """Log delivery attempt to audit table."""
        log_entry = WebhookDeliveryLog(
            id=str(uuid.uuid4()),
            webhookQueueId=webhook.id,
            userId=webhook.userId,
            attempt_number=webhook.attempt_count,
            attempt_timestamp=datetime.utcnow(),
            url=webhook.url,
            request_payload=webhook.payload,
            response_status=response_status,
            response_body=response_body,
            response_time_ms=response_time_ms,
            error_message=error_message,
            network_error=network_error,
            success=success
        )
        db.add(log_entry)
        db.commit()

    def process_batch(self) -> int:
        """
        Process one batch of webhooks from queue.

        Returns:
            Number of webhooks processed
        """
        db = self.Session()
        try:
            # Dequeue webhooks (SKIP LOCKED ensures no conflicts)
            webhooks = self.dequeue_webhooks(db)

            if not webhooks:
                return 0

            self.logger.info(f"Processing batch of {len(webhooks)} webhooks")

            # Deliver webhooks
            for webhook in webhooks:
                self.deliver_webhook(webhook, db)
                self.metrics['total_processed'] += 1

            return len(webhooks)

        except Exception as e:
            self.logger.error(f"Batch processing error: {e}", exc_info=True)
            db.rollback()
            return 0

        finally:
            db.close()

    def run(self) -> None:
        """Main worker loop."""
        self.logger.info(f"🚀 Worker {self.worker_id} started")
        self.logger.info(f"Configuration: {WorkerConfig.to_dict()}")

        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGTERM, self._handle_shutdown)
        signal.signal(signal.SIGINT, self._handle_shutdown)

        while self.running:
            try:
                processed = self.process_batch()

                if processed > 0:
                    self.logger.debug(f"Processed {processed} webhooks")
                else:
                    # No webhooks - sleep before polling again
                    time.sleep(WorkerConfig.WORKER_POLL_INTERVAL)

            except Exception as e:
                self.logger.error(f"Worker loop error: {e}", exc_info=True)
                time.sleep(WorkerConfig.WORKER_POLL_INTERVAL)

        self.logger.info("Worker stopped")

    def _handle_shutdown(self, signum, frame):
        """Handle graceful shutdown signals."""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False

    def print_metrics(self) -> None:
        """Print worker metrics summary."""
        uptime = (datetime.utcnow() - self.metrics['start_time']).total_seconds()
        self.logger.info(
            f"📊 Worker {self.worker_id} Metrics:\n"
            f"  Uptime: {uptime:.0f}s\n"
            f"  Total Processed: {self.metrics['total_processed']}\n"
            f"  Delivered: {self.metrics['delivered']}\n"
            f"  Failed (retrying): {self.metrics['failed']}\n"
            f"  Dead Letter: {self.metrics['dead_letter']}\n"
        )


def main():
    """Main entry point for webhook worker."""
    parser = argparse.ArgumentParser(description='Webhook Delivery Worker')
    parser.add_argument(
        '--instance',
        type=str,
        required=True,
        help='Worker instance number (e.g., 1, 2, 3)'
    )
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug logging'
    )
    args = parser.parse_args()

    # Override log level if debug flag set
    if args.debug:
        WorkerConfig.LOG_LEVEL = 'DEBUG'

    # Create and run worker
    worker = WebhookWorker(worker_id=args.instance)

    try:
        worker.run()
    except KeyboardInterrupt:
        worker.logger.info("Worker interrupted by user")
    finally:
        worker.print_metrics()
        sys.exit(0)


if __name__ == '__main__':
    main()
