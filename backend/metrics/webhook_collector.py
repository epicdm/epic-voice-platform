"""
Webhook Worker Metrics Collector

Helper module for instrumenting the webhook delivery worker with Prometheus metrics.

Usage in webhook worker:
    from backend.metrics.webhook_collector import WebhookMetricsCollector

    collector = WebhookMetricsCollector(worker_id="1")

    # Record webhook queued
    collector.record_queued(event_type, partner_id)

    # Record webhook delivered with timing
    with collector.time_delivery(partner_id) as timer:
        response = requests.post(url, ...)
        timer.set_success(event_type)

    # Update queue health metrics
    collector.update_queue_health(queue_size, oldest_age)
"""

import time
import logging
from typing import Optional
from contextlib import contextmanager
from datetime import datetime

from backend.metrics.registry import webhook_metrics

logger = logging.getLogger(__name__)


class WebhookMetricsCollector:
    """
    Wrapper for webhook metrics with convenience methods.

    Provides:
    - Simple API for webhook worker integration
    - Context managers for timing operations
    - Worker-specific metrics tracking
    - Error handling and logging
    """

    def __init__(self, worker_id: Optional[str] = None):
        """
        Initialize webhook metrics collector.

        Args:
            worker_id: Unique worker identifier (e.g., "1", "2", "worker-1")
        """
        self.metrics = webhook_metrics
        self.worker_id = worker_id
        self.start_time = time.time()

        if worker_id:
            logger.info(f"Webhook metrics collector initialized for worker {worker_id}")
        else:
            logger.info("Webhook metrics collector initialized (no worker ID)")

    def record_queued(self, event_type: str, partner_id: str):
        """
        Record a webhook queued for delivery.

        Args:
            event_type: Type of event (call_ended, room_finished, etc.)
            partner_id: Partner webhook identifier
        """
        try:
            self.metrics.record_webhook_queued(event_type, partner_id)
            logger.debug(f"Recorded webhook queued: event={event_type}, partner={partner_id}")
        except Exception as e:
            logger.error(f"Failed to record webhook queued metric: {e}")

    def record_delivered(self, event_type: str, partner_id: str, latency: float):
        """
        Record a successful webhook delivery.

        Args:
            event_type: Type of event
            partner_id: Partner webhook identifier
            latency: HTTP request latency in seconds
        """
        try:
            self.metrics.record_webhook_delivered(event_type, partner_id, latency)
            logger.debug(
                f"Recorded webhook delivered: event={event_type}, "
                f"partner={partner_id}, latency={latency:.3f}s"
            )

            if self.worker_id:
                self.metrics.record_worker_processed(self.worker_id)
        except Exception as e:
            logger.error(f"Failed to record webhook delivered metric: {e}")

    def record_failed(self, event_type: str, partner_id: str, status_code: int):
        """
        Record a webhook delivery failure.

        Args:
            event_type: Type of event
            partner_id: Partner webhook identifier
            status_code: HTTP status code (or 0 for connection errors)
        """
        try:
            self.metrics.record_webhook_failed(event_type, partner_id, status_code)
            logger.debug(
                f"Recorded webhook failed: event={event_type}, "
                f"partner={partner_id}, status={status_code}"
            )
        except Exception as e:
            logger.error(f"Failed to record webhook failed metric: {e}")

    def record_dead_letter(self, event_type: str, partner_id: str):
        """
        Record a webhook moved to dead letter queue.

        Args:
            event_type: Type of event
            partner_id: Partner webhook identifier
        """
        try:
            self.metrics.record_webhook_dead_letter(event_type, partner_id)
            self.metrics.retry_exhausted_total.labels(partner_id=partner_id).inc()
            logger.debug(
                f"Recorded webhook dead letter: event={event_type}, partner={partner_id}"
            )
        except Exception as e:
            logger.error(f"Failed to record webhook dead letter metric: {e}")

    def record_retry(self, partner_id: str, attempt_number: int):
        """
        Record a webhook retry attempt.

        Args:
            partner_id: Partner webhook identifier
            attempt_number: Retry attempt number (1, 2, 3, etc.)
        """
        try:
            self.metrics.record_retry_attempt(partner_id, attempt_number)
            logger.debug(f"Recorded retry attempt {attempt_number} for partner={partner_id}")
        except Exception as e:
            logger.error(f"Failed to record retry attempt metric: {e}")

    @contextmanager
    def time_delivery(self, partner_id: str):
        """
        Context manager for timing webhook delivery.

        Usage:
            with collector.time_delivery(partner_id) as timer:
                response = requests.post(url, ...)
                if response.status_code == 200:
                    timer.set_success(event_type)
                else:
                    timer.set_failed(event_type, response.status_code)

        Args:
            partner_id: Partner webhook identifier
        """
        class DeliveryTimer:
            def __init__(self, collector, partner_id):
                self.collector = collector
                self.partner_id = partner_id
                self.start_time = time.time()
                self.event_type = None
                self.status_code = None

            def set_success(self, event_type: str):
                """Mark delivery as successful."""
                self.event_type = event_type
                self.status_code = 200

            def set_failed(self, event_type: str, status_code: int):
                """Mark delivery as failed."""
                self.event_type = event_type
                self.status_code = status_code

        timer = DeliveryTimer(self, partner_id)
        try:
            yield timer
        finally:
            latency = time.time() - timer.start_time

            if timer.event_type:
                if timer.status_code == 200:
                    self.record_delivered(timer.event_type, partner_id, latency)
                else:
                    self.record_failed(timer.event_type, partner_id, timer.status_code)

    @contextmanager
    def time_processing(self, partner_id: str):
        """
        Context manager for timing queue processing duration.

        Usage:
            with collector.time_processing(partner_id):
                # ... process webhook from queue to delivery
                pass

        Args:
            partner_id: Partner webhook identifier
        """
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            try:
                self.metrics.record_processing_duration(partner_id, duration)
                logger.debug(f"Recorded processing duration: {duration:.3f}s for partner={partner_id}")
            except Exception as e:
                logger.error(f"Failed to record processing duration: {e}")

    def update_queue_health(self, queue_size: int, oldest_age_seconds: Optional[float] = None):
        """
        Update queue health metrics.

        Args:
            queue_size: Current number of webhooks in queue
            oldest_age_seconds: Age of oldest webhook in seconds (optional)
        """
        try:
            self.metrics.set_queue_size(queue_size)

            if oldest_age_seconds is not None:
                self.metrics.set_queue_oldest_age(oldest_age_seconds)

            logger.debug(f"Updated queue health: size={queue_size}, oldest_age={oldest_age_seconds}")
        except Exception as e:
            logger.error(f"Failed to update queue health metrics: {e}")

    def update_active_workers(self, count: int):
        """
        Update the number of active worker instances.

        Args:
            count: Number of active workers
        """
        try:
            self.metrics.set_active_workers(count)
        except Exception as e:
            logger.error(f"Failed to update active workers gauge: {e}")

    def update_worker_uptime(self):
        """
        Update worker uptime metric.

        Should be called periodically (e.g., every poll cycle).
        """
        if not self.worker_id:
            return

        try:
            uptime = time.time() - self.start_time
            self.metrics.set_worker_uptime(self.worker_id, uptime)
        except Exception as e:
            logger.error(f"Failed to update worker uptime: {e}")

    def get_worker_stats(self) -> dict:
        """
        Get worker statistics for logging.

        Returns:
            dict: Worker statistics
        """
        if not self.worker_id:
            return {}

        uptime = time.time() - self.start_time
        return {
            'worker_id': self.worker_id,
            'uptime_seconds': uptime,
            'uptime_human': f"{uptime / 3600:.1f}h"
        }


# Optional: Create a shared instance for webhook worker
def create_collector(worker_id: str) -> WebhookMetricsCollector:
    """
    Factory function for creating webhook metrics collector.

    Args:
        worker_id: Unique worker identifier

    Returns:
        WebhookMetricsCollector: Configured collector instance
    """
    return WebhookMetricsCollector(worker_id)
