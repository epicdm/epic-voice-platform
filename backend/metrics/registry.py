"""
Prometheus Metrics Registry

Defines all Prometheus metrics for the LiveKit Voice Agent Platform.

Metric Types:
- Counter: Monotonically increasing values (calls initiated, webhooks delivered)
- Gauge: Values that can go up or down (active campaigns, queue size)
- Histogram: Distributions and percentiles (call duration, latency)
- Summary: Similar to histogram but with quantiles calculated on server
"""

from prometheus_client import (
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    Summary,
    generate_latest,
    CONTENT_TYPE_LATEST
)
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

# Custom registry for application metrics (separate from default)
metrics_registry = CollectorRegistry()


class CampaignMetrics:
    """
    Metrics for campaign engine operations.

    Tracks:
    - Call lifecycle (initiated, completed, failed)
    - Campaign execution (active campaigns, lead processing)
    - Performance (call duration, processing latency)
    - Success rates (by outcome type)
    """

    def __init__(self, registry: CollectorRegistry):
        # Call lifecycle counters
        self.calls_initiated_total = Counter(
            'campaign_calls_initiated_total',
            'Total number of campaign calls initiated',
            ['campaign_id', 'user_id'],
            registry=registry
        )

        self.calls_completed_total = Counter(
            'campaign_calls_completed_total',
            'Total number of campaign calls completed',
            ['campaign_id', 'user_id', 'outcome'],
            registry=registry
        )

        self.calls_failed_total = Counter(
            'campaign_calls_failed_total',
            'Total number of campaign calls failed',
            ['campaign_id', 'user_id', 'error_type'],
            registry=registry
        )

        # Campaign execution gauges
        self.active_campaigns = Gauge(
            'campaign_active_campaigns',
            'Number of currently active campaigns',
            ['user_id'],
            registry=registry
        )

        self.pending_leads = Gauge(
            'campaign_pending_leads',
            'Number of leads pending processing',
            ['campaign_id'],
            registry=registry
        )

        self.concurrent_calls = Gauge(
            'campaign_concurrent_calls',
            'Number of concurrent active calls',
            registry=registry
        )

        # Performance metrics
        self.call_duration_seconds = Histogram(
            'campaign_call_duration_seconds',
            'Duration of campaign calls in seconds',
            ['campaign_id', 'outcome'],
            buckets=[10, 30, 60, 120, 300, 600, 1800],  # 10s to 30min
            registry=registry
        )

        self.processing_latency_seconds = Histogram(
            'campaign_processing_latency_seconds',
            'Time taken to process and initiate a call',
            ['campaign_id'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0],  # 100ms to 10s
            registry=registry
        )

        self.poll_cycle_duration_seconds = Histogram(
            'campaign_poll_cycle_duration_seconds',
            'Duration of campaign engine poll cycle',
            buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
            registry=registry
        )

        # Business metrics
        self.success_rate = Gauge(
            'campaign_success_rate',
            'Campaign call success rate (0-1)',
            ['campaign_id'],
            registry=registry
        )

        self.cost_total = Counter(
            'campaign_cost_total',
            'Total campaign cost in dollars',
            ['campaign_id', 'user_id'],
            registry=registry
        )

        logger.info("Campaign metrics registered")

    def record_call_initiated(self, campaign_id: str, user_id: str):
        """Record a campaign call initiation."""
        self.calls_initiated_total.labels(
            campaign_id=campaign_id,
            user_id=user_id
        ).inc()

    def record_call_completed(self, campaign_id: str, user_id: str, outcome: str, duration: float):
        """Record a campaign call completion."""
        self.calls_completed_total.labels(
            campaign_id=campaign_id,
            user_id=user_id,
            outcome=outcome
        ).inc()

        self.call_duration_seconds.labels(
            campaign_id=campaign_id,
            outcome=outcome
        ).observe(duration)

    def record_call_failed(self, campaign_id: str, user_id: str, error_type: str):
        """Record a campaign call failure."""
        self.calls_failed_total.labels(
            campaign_id=campaign_id,
            user_id=user_id,
            error_type=error_type
        ).inc()

    def record_processing_latency(self, campaign_id: str, latency: float):
        """Record campaign call processing latency."""
        self.processing_latency_seconds.labels(
            campaign_id=campaign_id
        ).observe(latency)

    def set_active_campaigns(self, user_id: str, count: int):
        """Set the number of active campaigns for a user."""
        self.active_campaigns.labels(user_id=user_id).set(count)

    def set_pending_leads(self, campaign_id: str, count: int):
        """Set the number of pending leads for a campaign."""
        self.pending_leads.labels(campaign_id=campaign_id).set(count)

    def set_concurrent_calls(self, count: int):
        """Set the number of concurrent active calls."""
        self.concurrent_calls.set(count)


class WebhookMetrics:
    """
    Metrics for webhook delivery worker operations.

    Tracks:
    - Delivery lifecycle (queued, delivered, failed)
    - Retry behavior (retry attempts, dead letter queue)
    - Performance (delivery latency, throughput)
    - Queue health (size, age)
    """

    def __init__(self, registry: CollectorRegistry):
        # Delivery lifecycle counters
        self.webhooks_queued_total = Counter(
            'webhook_queued_total',
            'Total number of webhooks queued for delivery',
            ['event_type', 'partner_id'],
            registry=registry
        )

        self.webhooks_delivered_total = Counter(
            'webhook_delivered_total',
            'Total number of webhooks successfully delivered',
            ['event_type', 'partner_id'],
            registry=registry
        )

        self.webhooks_failed_total = Counter(
            'webhook_failed_total',
            'Total number of webhook delivery failures',
            ['event_type', 'partner_id', 'status_code'],
            registry=registry
        )

        self.webhooks_dead_letter_total = Counter(
            'webhook_dead_letter_total',
            'Total number of webhooks moved to dead letter queue',
            ['event_type', 'partner_id'],
            registry=registry
        )

        # Retry metrics
        self.retry_attempts_total = Counter(
            'webhook_retry_attempts_total',
            'Total number of webhook retry attempts',
            ['partner_id', 'attempt_number'],
            registry=registry
        )

        self.retry_exhausted_total = Counter(
            'webhook_retry_exhausted_total',
            'Total number of webhooks that exhausted all retries',
            ['partner_id'],
            registry=registry
        )

        # Performance metrics
        self.delivery_latency_seconds = Histogram(
            'webhook_delivery_latency_seconds',
            'Webhook HTTP request latency in seconds',
            ['partner_id'],
            buckets=[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],  # 50ms to 10s
            registry=registry
        )

        self.queue_processing_duration_seconds = Histogram(
            'webhook_queue_processing_duration_seconds',
            'Time to process webhook from queue to delivery',
            ['partner_id'],
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
            registry=registry
        )

        # Queue health gauges
        self.queue_size = Gauge(
            'webhook_queue_size',
            'Number of webhooks pending delivery',
            registry=registry
        )

        self.queue_oldest_age_seconds = Gauge(
            'webhook_queue_oldest_age_seconds',
            'Age of oldest webhook in queue',
            registry=registry
        )

        self.active_workers = Gauge(
            'webhook_active_workers',
            'Number of active webhook worker instances',
            registry=registry
        )

        # Worker health metrics
        self.worker_uptime_seconds = Gauge(
            'webhook_worker_uptime_seconds',
            'Webhook worker uptime in seconds',
            ['worker_id'],
            registry=registry
        )

        self.worker_processed_total = Counter(
            'webhook_worker_processed_total',
            'Total webhooks processed by worker',
            ['worker_id'],
            registry=registry
        )

        logger.info("Webhook metrics registered")

    def record_webhook_queued(self, event_type: str, partner_id: str):
        """Record a webhook queued for delivery."""
        self.webhooks_queued_total.labels(
            event_type=event_type,
            partner_id=partner_id
        ).inc()

    def record_webhook_delivered(self, event_type: str, partner_id: str, latency: float):
        """Record a successful webhook delivery."""
        self.webhooks_delivered_total.labels(
            event_type=event_type,
            partner_id=partner_id
        ).inc()

        self.delivery_latency_seconds.labels(
            partner_id=partner_id
        ).observe(latency)

    def record_webhook_failed(self, event_type: str, partner_id: str, status_code: int):
        """Record a webhook delivery failure."""
        self.webhooks_failed_total.labels(
            event_type=event_type,
            partner_id=partner_id,
            status_code=str(status_code)
        ).inc()

    def record_webhook_dead_letter(self, event_type: str, partner_id: str):
        """Record a webhook moved to dead letter queue."""
        self.webhooks_dead_letter_total.labels(
            event_type=event_type,
            partner_id=partner_id
        ).inc()

    def record_retry_attempt(self, partner_id: str, attempt_number: int):
        """Record a webhook retry attempt."""
        self.retry_attempts_total.labels(
            partner_id=partner_id,
            attempt_number=str(attempt_number)
        ).inc()

    def record_processing_duration(self, partner_id: str, duration: float):
        """Record queue processing duration."""
        self.queue_processing_duration_seconds.labels(
            partner_id=partner_id
        ).observe(duration)

    def set_queue_size(self, size: int):
        """Set the current queue size."""
        self.queue_size.set(size)

    def set_queue_oldest_age(self, age_seconds: float):
        """Set the age of the oldest webhook in queue."""
        self.queue_oldest_age_seconds.set(age_seconds)

    def set_active_workers(self, count: int):
        """Set the number of active worker instances."""
        self.active_workers.set(count)

    def set_worker_uptime(self, worker_id: str, uptime_seconds: float):
        """Set worker uptime."""
        self.worker_uptime_seconds.labels(worker_id=worker_id).set(uptime_seconds)

    def record_worker_processed(self, worker_id: str):
        """Record a webhook processed by worker."""
        self.worker_processed_total.labels(worker_id=worker_id).inc()


# Initialize metric instances
campaign_metrics = CampaignMetrics(metrics_registry)
webhook_metrics = WebhookMetrics(metrics_registry)


def get_metrics_snapshot() -> Dict[str, Any]:
    """
    Get a snapshot of current metrics in JSON format.

    Useful for debugging and monitoring dashboards.

    Returns:
        dict: Metrics snapshot with human-readable values
    """
    from prometheus_client.parser import text_string_to_metric_families

    metrics_text = generate_latest(metrics_registry).decode('utf-8')
    metrics_dict = {}

    for family in text_string_to_metric_families(metrics_text):
        for sample in family.samples:
            metric_name = sample.name
            labels = sample.labels
            value = sample.value

            key = f"{metric_name}"
            if labels:
                key += f"{{{','.join([f'{k}={v}' for k, v in labels.items()])}}}"

            metrics_dict[key] = value

    return {
        'timestamp': None,  # Will be set by caller
        'metrics': metrics_dict,
        'registry': 'application'
    }


logger.info("Metrics registry initialized successfully")
