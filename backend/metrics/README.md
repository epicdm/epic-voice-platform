# Prometheus Metrics Exporter

Comprehensive metrics collection and export for the LiveKit Voice Agent Platform.

## Overview

This module provides Prometheus-compatible metrics for monitoring:
- **Campaign Engine**: Call lifecycle, success rates, performance
- **Webhook Worker**: Delivery throughput, retries, queue health
- **System Health**: Resource utilization, error rates, latencies

## Features

- ✅ **Prometheus Integration**: Standard exposition format for scraping
- ✅ **Custom Business Metrics**: Campaign success rates, webhook delivery stats
- ✅ **Performance Tracking**: Latency histograms, duration percentiles
- ✅ **Queue Monitoring**: Real-time queue size and age tracking
- ✅ **Multi-Worker Support**: Per-worker and aggregate metrics
- ✅ **Thread-Safe**: Safe for concurrent access in multi-threaded applications
- ✅ **Zero External Dependencies**: Uses prometheus_client library only

## Quick Start

### 1. Install Dependencies

```bash
# Add prometheus_client to your dependencies
uv add prometheus_client

# Or with pip
pip install prometheus_client
```

### 2. Register Flask Endpoint

```python
# In your main Flask application (e.g., admin_dashboard.py, user_dashboard.py)
from flask import Flask
from backend.metrics.routes import metrics_bp

app = Flask(__name__)

# Register metrics endpoint
app.register_blueprint(metrics_bp)

# Now metrics available at http://localhost:5000/metrics
```

### 3. Instrument Campaign Engine

```python
# In campaign_engine.py
from backend.metrics.campaign_collector import CampaignMetricsCollector

class CampaignEngine:
    def __init__(self):
        self.metrics = CampaignMetricsCollector()
        # ... existing initialization

    async def create_outbound_call(self, campaign_call_id, lead_phone, agent_id, user_id):
        # Record call initiation
        self.metrics.record_call_initiated(campaign_id, user_id)

        with self.metrics.time_processing(campaign_id):
            # ... create call logic
            pass

        # On success
        self.metrics.record_call_completed(campaign_id, user_id, outcome, duration)

        # On failure
        self.metrics.record_call_failed(campaign_id, user_id, error_type)
```

### 4. Instrument Webhook Worker

```python
# In backend/webhook_worker/worker.py
from backend.metrics.webhook_collector import WebhookMetricsCollector

class WebhookWorker:
    def __init__(self, worker_id: str):
        self.metrics = WebhookMetricsCollector(worker_id)
        # ... existing initialization

    def process_webhook(self, webhook):
        # Record webhook queued (if not already done on enqueue)
        self.metrics.record_queued(webhook.event_type, webhook.partner_id)

        with self.metrics.time_delivery(webhook.partner_id) as timer:
            response = requests.post(webhook.url, ...)

            if response.status_code == 200:
                timer.set_success(webhook.event_type)
            else:
                timer.set_failed(webhook.event_type, response.status_code)

        # Update queue health
        self.metrics.update_queue_health(queue_size, oldest_age)
```

## Metrics Reference

### Campaign Metrics

#### Counters

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `campaign_calls_initiated_total` | Counter | campaign_id, user_id | Total calls initiated |
| `campaign_calls_completed_total` | Counter | campaign_id, user_id, outcome | Total calls completed |
| `campaign_calls_failed_total` | Counter | campaign_id, user_id, error_type | Total call failures |
| `campaign_cost_total` | Counter | campaign_id, user_id | Total campaign cost ($) |

#### Gauges

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `campaign_active_campaigns` | Gauge | user_id | Number of active campaigns |
| `campaign_pending_leads` | Gauge | campaign_id | Pending leads in campaign |
| `campaign_concurrent_calls` | Gauge | - | Current concurrent calls |
| `campaign_success_rate` | Gauge | campaign_id | Campaign success rate (0-1) |

#### Histograms

| Metric | Type | Labels | Buckets | Description |
|--------|------|--------|---------|-------------|
| `campaign_call_duration_seconds` | Histogram | campaign_id, outcome | 10s-30min | Call duration distribution |
| `campaign_processing_latency_seconds` | Histogram | campaign_id | 100ms-10s | Call processing time |
| `campaign_poll_cycle_duration_seconds` | Histogram | - | 0.5s-30s | Engine poll cycle duration |

### Webhook Metrics

#### Counters

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `webhook_queued_total` | Counter | event_type, partner_id | Total webhooks queued |
| `webhook_delivered_total` | Counter | event_type, partner_id | Total successful deliveries |
| `webhook_failed_total` | Counter | event_type, partner_id, status_code | Total delivery failures |
| `webhook_dead_letter_total` | Counter | event_type, partner_id | Webhooks in dead letter queue |
| `webhook_retry_attempts_total` | Counter | partner_id, attempt_number | Total retry attempts |
| `webhook_worker_processed_total` | Counter | worker_id | Webhooks processed by worker |

#### Gauges

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `webhook_queue_size` | Gauge | - | Current queue size |
| `webhook_queue_oldest_age_seconds` | Gauge | - | Age of oldest webhook |
| `webhook_active_workers` | Gauge | - | Active worker instances |
| `webhook_worker_uptime_seconds` | Gauge | worker_id | Worker uptime |

#### Histograms

| Metric | Type | Labels | Buckets | Description |
|--------|------|--------|---------|-------------|
| `webhook_delivery_latency_seconds` | Histogram | partner_id | 50ms-10s | HTTP delivery latency |
| `webhook_queue_processing_duration_seconds` | Histogram | partner_id | 100ms-30s | Queue to delivery time |

## API Endpoints

### GET /metrics

Prometheus exposition format for scraping.

**Response Format:**
```
# HELP campaign_calls_initiated_total Total number of campaign calls initiated
# TYPE campaign_calls_initiated_total counter
campaign_calls_initiated_total{campaign_id="abc123",user_id="user456"} 145
campaign_calls_initiated_total{campaign_id="xyz789",user_id="user456"} 89
```

**Prometheus Configuration:**
```yaml
scrape_configs:
  - job_name: 'livekit-platform'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s
    scrape_timeout: 10s
```

### GET /metrics/json

JSON format for debugging and custom dashboards.

**Response:**
```json
{
  "timestamp": "2025-10-29T12:34:56Z",
  "metrics": {
    "campaign_calls_initiated_total{campaign_id=abc,user_id=123}": 45,
    "webhook_delivered_total{event_type=call_ended,partner_id=xyz}": 123
  },
  "registry": "application"
}
```

### GET /metrics/health

Health check for metrics system.

**Response:**
```json
{
  "status": "healthy",
  "registry": "application",
  "metric_families": 25,
  "total_metrics": 158,
  "collectors": {
    "campaign_metrics": "registered",
    "webhook_metrics": "registered"
  }
}
```

## Integration Examples

### Campaign Engine Full Integration

```python
#!/usr/bin/env python3
"""Campaign Engine with Prometheus metrics"""

from backend.metrics.campaign_collector import CampaignMetricsCollector
import time

class CampaignEngine:
    def __init__(self):
        self.metrics = CampaignMetricsCollector()
        self.logger = logging.getLogger('CampaignEngine')

    async def run(self):
        """Main campaign processing loop with metrics."""
        while self.running:
            with self.metrics.time_poll_cycle():
                # Poll for campaigns
                campaigns = self.get_active_campaigns()

                # Update active campaign gauge
                for user_id, count in self.count_campaigns_by_user(campaigns).items():
                    self.metrics.update_active_campaigns(user_id, count)

                # Process each campaign
                for campaign in campaigns:
                    await self.process_campaign(campaign)

                # Update concurrent calls gauge
                self.metrics.update_concurrent_calls(self.get_active_call_count())

            await asyncio.sleep(self.poll_interval)

    async def process_campaign(self, campaign):
        """Process a single campaign with metrics."""
        # Get pending leads
        leads = self.get_pending_leads(campaign.id)
        self.metrics.update_pending_leads(campaign.id, len(leads))

        for lead in leads:
            # Record call initiation
            self.metrics.record_call_initiated(campaign.id, campaign.user_id)

            with self.metrics.time_processing(campaign.id):
                result = await self.create_outbound_call(
                    campaign_call_id=lead.id,
                    lead_phone=lead.phone,
                    agent_id=campaign.agent_id,
                    user_id=campaign.user_id
                )

            if result['success']:
                # Will record completion when call ends (from webhook)
                pass
            else:
                # Record immediate failure
                error_type = self.classify_error(result['error'])
                self.metrics.record_call_failed(
                    campaign.id,
                    campaign.user_id,
                    error_type
                )

    def on_call_completed(self, call_log):
        """Handle call completion event (from webhook)."""
        self.metrics.record_call_completed(
            campaign_id=call_log.campaign_id,
            user_id=call_log.user_id,
            outcome=call_log.outcome,
            duration=call_log.duration_seconds,
            cost=call_log.cost
        )

        # Update success rate
        success_rate = self.calculate_success_rate(call_log.campaign_id)
        self.metrics.update_success_rate(call_log.campaign_id, success_rate)
```

### Webhook Worker Full Integration

```python
#!/usr/bin/env python3
"""Webhook Worker with Prometheus metrics"""

from backend.metrics.webhook_collector import WebhookMetricsCollector
import requests

class WebhookWorker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.metrics = WebhookMetricsCollector(worker_id)
        self.logger = logging.getLogger(f'WebhookWorker-{worker_id}')

    def run(self):
        """Main worker loop with metrics."""
        while self.running:
            # Update worker uptime
            self.metrics.update_worker_uptime()

            # Get queue health
            queue_info = self.get_queue_info()
            self.metrics.update_queue_health(
                queue_size=queue_info['size'],
                oldest_age_seconds=queue_info['oldest_age']
            )

            # Process webhooks
            webhooks = self.fetch_pending_webhooks(batch_size=10)

            for webhook in webhooks:
                self.process_webhook(webhook)

            time.sleep(self.poll_interval)

    def process_webhook(self, webhook):
        """Process single webhook with metrics."""
        with self.metrics.time_processing(webhook.partner_id):
            # Check if this is a retry
            if webhook.attempt_count > 1:
                self.metrics.record_retry(webhook.partner_id, webhook.attempt_count)

            # Deliver webhook
            with self.metrics.time_delivery(webhook.partner_id) as timer:
                try:
                    response = requests.post(
                        webhook.url,
                        json=webhook.payload,
                        headers=self.generate_headers(webhook),
                        timeout=10
                    )

                    if response.status_code == 200:
                        timer.set_success(webhook.event_type)
                        self.mark_webhook_delivered(webhook.id)
                    else:
                        timer.set_failed(webhook.event_type, response.status_code)
                        self.schedule_retry(webhook)

                except requests.RequestException as e:
                    timer.set_failed(webhook.event_type, 0)  # Connection error
                    self.schedule_retry(webhook)

            # Check if exhausted retries
            if webhook.attempt_count >= self.max_retries:
                self.metrics.record_dead_letter(webhook.event_type, webhook.partner_id)
                self.move_to_dead_letter(webhook.id)
```

## Prometheus Setup

### 1. Install Prometheus

```bash
# Download Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # LiveKit Platform Metrics
  - job_name: 'livekit-platform'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 15s

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

### 3. Start Prometheus

```bash
./prometheus --config.file=prometheus.yml
```

Access Prometheus UI at http://localhost:9090

## Grafana Dashboards

### Example Dashboard Panels

#### Campaign Success Rate
```promql
# Success rate by campaign (last 1 hour)
sum(rate(campaign_calls_completed_total{outcome="success"}[1h])) by (campaign_id)
/
sum(rate(campaign_calls_completed_total[1h])) by (campaign_id)
```

#### Webhook Delivery Latency (p95)
```promql
# 95th percentile delivery latency
histogram_quantile(0.95,
  sum(rate(webhook_delivery_latency_seconds_bucket[5m])) by (le, partner_id)
)
```

#### Campaign Call Volume
```promql
# Calls per minute by outcome
sum(rate(campaign_calls_completed_total[1m])) by (outcome)
```

#### Webhook Queue Size
```promql
# Current queue size
webhook_queue_size
```

#### Active Workers
```promql
# Number of active webhook workers
webhook_active_workers
```

## Alerting Rules

### Prometheus Alert Rules

Create `alerts.yml`:

```yaml
groups:
  - name: campaign_alerts
    interval: 30s
    rules:
      # High campaign failure rate
      - alert: HighCampaignFailureRate
        expr: |
          (
            sum(rate(campaign_calls_failed_total[5m]))
            /
            sum(rate(campaign_calls_initiated_total[5m]))
          ) > 0.3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Campaign failure rate above 30%"
          description: "{{ $value | humanizePercentage }} of calls are failing"

      # Campaign processing slow
      - alert: SlowCampaignProcessing
        expr: |
          histogram_quantile(0.95,
            sum(rate(campaign_processing_latency_seconds_bucket[5m])) by (le)
          ) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Campaign processing latency above 5s"

  - name: webhook_alerts
    interval: 30s
    rules:
      # Webhook queue backing up
      - alert: WebhookQueueBacklog
        expr: webhook_queue_size > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Webhook queue has {{ $value }} pending items"

      # High webhook failure rate
      - alert: HighWebhookFailureRate
        expr: |
          (
            sum(rate(webhook_failed_total[5m]))
            /
            sum(rate(webhook_queued_total[5m]))
          ) > 0.2
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Webhook failure rate above 20%"

      # Webhook worker down
      - alert: WebhookWorkerDown
        expr: webhook_active_workers < 1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "No active webhook workers detected"

      # Old webhooks in queue
      - alert: StaleWebhooksInQueue
        expr: webhook_queue_oldest_age_seconds > 3600  # 1 hour
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Oldest webhook in queue is {{ $value | humanizeDuration }} old"
```

## Performance Considerations

### Memory Usage
- Each unique label combination creates a new time series
- Limit high-cardinality labels (e.g., don't use phone numbers as labels)
- Estimated memory: ~1-2KB per time series

### Collection Overhead
- Metric collection adds ~0.1-1ms per operation
- Use context managers for automatic timing
- Collectors are thread-safe (no locking overhead)

### Scrape Interval
- Recommended: 15s for production
- Shorter intervals (5s) for debugging
- Longer intervals (60s) for low-traffic systems

## Troubleshooting

### Issue: "Module 'prometheus_client' not found"

**Solution:**
```bash
uv add prometheus_client
# or
pip install prometheus_client
```

### Issue: Metrics not appearing

**Check:**
1. Blueprint registered: `app.register_blueprint(metrics_bp)`
2. Endpoint accessible: `curl http://localhost:5000/metrics`
3. Prometheus scraping: Check Prometheus targets page

### Issue: High memory usage

**Solution:**
- Reduce label cardinality (limit unique label values)
- Increase scrape interval in Prometheus
- Set retention limits in Prometheus config

### Issue: Metrics not updating

**Check:**
1. Metrics collection code is being called
2. No exceptions in metric recording (check logs)
3. Correct labels being used
4. Prometheus scraping interval

## Best Practices

1. **Label Cardinality**: Keep unique label combinations < 10,000
2. **Label Values**: Use categorical values, not IDs or phone numbers
3. **Timing**: Use context managers for automatic duration recording
4. **Error Handling**: Metric recording failures should not break application logic
5. **Monitoring**: Set up alerts for queue backlogs and high failure rates
6. **Retention**: Configure appropriate Prometheus retention (default: 15 days)

## Next Steps

1. **Register Blueprint** - Add metrics endpoint to Flask app
2. **Instrument Code** - Add metric collection to campaign engine and webhook worker
3. **Deploy Prometheus** - Set up Prometheus scraping
4. **Create Dashboards** - Build Grafana dashboards for visualization
5. **Configure Alerts** - Set up alerting rules for critical issues

## Support

For issues or questions:
- Check logs for metric collection errors
- Verify Prometheus is scraping: http://localhost:9090/targets
- Test endpoints: `curl http://localhost:5000/metrics/health`
- Review Prometheus query syntax at https://prometheus.io/docs/prometheus/latest/querying/basics/
