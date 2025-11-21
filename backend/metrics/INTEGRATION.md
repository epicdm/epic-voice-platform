# Metrics Integration Guide

Step-by-step guide for integrating Prometheus metrics into the campaign engine and webhook worker.

## Prerequisites

1. **Install prometheus_client**:
   ```bash
   cd /opt/livekit1
   uv add prometheus_client
   ```

2. **Verify installation**:
   ```bash
   uv run python -c "import prometheus_client; print('✓ Prometheus client installed')"
   ```

## Integration Steps

### Step 1: Register Metrics Endpoint

Choose the Flask application where you want to expose metrics:

#### Option A: Admin Dashboard (Recommended)

Edit `/opt/livekit1/admin_dashboard.py`:

```python
from flask import Flask
from backend.metrics.routes import metrics_bp

app = Flask(__name__)

# Register metrics blueprint
app.register_blueprint(metrics_bp)
print("✓ Metrics endpoint registered at /metrics")

# ... rest of your application code
```

#### Option B: Separate Metrics Server

Create `/opt/livekit1/metrics_server.py`:

```python
"""
Standalone metrics server for Prometheus scraping.

Usage:
    python metrics_server.py

Metrics available at:
    http://localhost:8000/metrics
"""

from flask import Flask
from backend.metrics.routes import metrics_bp

app = Flask(__name__)
app.register_blueprint(metrics_bp)

if __name__ == '__main__':
    print("Starting metrics server on http://0.0.0.0:8000")
    print("Metrics endpoint: http://0.0.0.0:8000/metrics")
    app.run(host='0.0.0.0', port=8000)
```

Run with:
```bash
uv run python metrics_server.py
```

### Step 2: Instrument Campaign Engine

Edit `/opt/livekit1/campaign_engine.py`:

#### 2.1 Add Import

Add at the top of the file:

```python
# Existing imports
import logging
from datetime import datetime
# ... other imports

# Add metrics import
from backend.metrics.campaign_collector import CampaignMetricsCollector
```

#### 2.2 Initialize Collector

In the `CampaignEngine.__init__` method:

```python
class CampaignEngine:
    def __init__(self):
        # Existing initialization
        self.livekit_url = os.getenv('LIVEKIT_URL')
        # ... other initialization

        # Add metrics collector
        self.metrics = CampaignMetricsCollector()
        logger.info("Metrics collector initialized")
```

#### 2.3 Instrument Call Initiation

In the `create_outbound_call` method, add metrics at the beginning:

```python
async def create_outbound_call(
    self,
    campaign_call_id: str,
    lead_phone: str,
    agent_id: str,
    user_id: str,
    from_number: str = "+17678183366"
) -> Dict[str, Any]:
    """Create an outbound call using LiveKit SIP API"""

    # Record call initiation
    campaign_id = self._extract_campaign_id(campaign_call_id)  # Extract from call ID
    self.metrics.record_call_initiated(campaign_id, user_id)

    # Time the processing
    with self.metrics.time_processing(campaign_id):
        # Existing call creation logic
        db = SessionLocal()
        try:
            # ... existing code to create call
            pass
```

#### 2.4 Instrument Call Completion

When a call completes (likely in webhook handler or event processor), add:

```python
def handle_call_completed(self, call_log):
    """Handle call completion event."""

    # Extract data
    campaign_id = call_log.campaign_id
    user_id = call_log.user_id
    outcome = call_log.outcome  # e.g., "success", "no_answer", "failed"
    duration = call_log.duration_seconds
    cost = call_log.cost

    # Record completion
    self.metrics.record_call_completed(
        campaign_id=campaign_id,
        user_id=user_id,
        outcome=outcome,
        duration=duration,
        cost=cost
    )

    # Update success rate
    success_rate = self.calculate_campaign_success_rate(campaign_id)
    self.metrics.update_success_rate(campaign_id, success_rate)
```

#### 2.5 Instrument Call Failures

When a call fails immediately (before reaching LiveKit), add:

```python
# In create_outbound_call, when errors occur:
except Exception as e:
    logger.error(f"Failed to create call: {e}")

    # Classify error for metrics
    error_type = "sip_error"
    if "trunk" in str(e).lower():
        error_type = "trunk_config_error"
    elif "agent" in str(e).lower():
        error_type = "agent_config_error"
    elif "timeout" in str(e).lower():
        error_type = "timeout"

    # Record failure
    self.metrics.record_call_failed(campaign_id, user_id, error_type)

    return {
        'success': False,
        'error': str(e)
    }
```

#### 2.6 Instrument Main Loop

In the main campaign processing loop:

```python
async def run(self):
    """Main campaign engine loop."""

    while self.running:
        # Time the poll cycle
        with self.metrics.time_poll_cycle():
            # Get active campaigns
            campaigns = self.get_active_campaigns()

            # Update active campaigns gauge
            campaigns_by_user = {}
            for campaign in campaigns:
                if campaign.user_id not in campaigns_by_user:
                    campaigns_by_user[campaign.user_id] = 0
                campaigns_by_user[campaign.user_id] += 1

            for user_id, count in campaigns_by_user.items():
                self.metrics.update_active_campaigns(user_id, count)

            # Process campaigns
            for campaign in campaigns:
                await self.process_campaign(campaign)

            # Update concurrent calls gauge
            concurrent_calls = self.get_active_call_count()
            self.metrics.update_concurrent_calls(concurrent_calls)

        # Sleep between polls
        await asyncio.sleep(self.poll_interval)
```

#### 2.7 Instrument Pending Leads

When processing a campaign:

```python
async def process_campaign(self, campaign):
    """Process a single campaign."""

    # Get pending leads
    pending_leads = self.get_pending_leads(campaign.id)

    # Update pending leads gauge
    self.metrics.update_pending_leads(campaign.id, len(pending_leads))

    # Process each lead
    for lead in pending_leads[:self.max_concurrent_calls]:
        await self.create_outbound_call(
            campaign_call_id=f"{campaign.id}-{lead.id}",
            lead_phone=lead.phone,
            agent_id=campaign.agent_id,
            user_id=campaign.user_id
        )
```

### Step 3: Instrument Webhook Worker

Edit `/opt/livekit1/backend/webhook_worker/worker.py`:

#### 3.1 Add Import

```python
# At the top of worker.py
from backend.metrics.webhook_collector import WebhookMetricsCollector
```

#### 3.2 Initialize Collector

In `WebhookWorker.__init__`:

```python
class WebhookWorker:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        # ... existing initialization

        # Add metrics collector
        self.metrics = WebhookMetricsCollector(worker_id)
        self.logger.info(f"Metrics collector initialized for worker {worker_id}")
```

#### 3.3 Instrument Webhook Queueing

In the webhook enqueue function (likely in `enqueue.py`):

```python
# In backend/webhook_worker/enqueue.py
from backend.metrics.webhook_collector import webhook_metrics

def enqueue_webhook(event_type: str, partner_id: str, payload: dict):
    """Queue a webhook for delivery."""

    # Create webhook queue entry
    webhook = WebhookDeliveryQueue(
        event_type=event_type,
        partner_id=partner_id,
        payload=payload
    )
    db.add(webhook)
    db.commit()

    # Record queued metric
    webhook_metrics.record_webhook_queued(event_type, partner_id)
```

#### 3.4 Instrument Webhook Delivery

In `process_webhook` method:

```python
def process_webhook(self, webhook: WebhookDeliveryQueue) -> bool:
    """Process a single webhook with metrics."""

    # Check if this is a retry
    if webhook.attempt_count > 1:
        self.metrics.record_retry(webhook.partner_id, webhook.attempt_count)

    # Time the entire processing
    with self.metrics.time_processing(webhook.partner_id):
        # Time the HTTP delivery
        with self.metrics.time_delivery(webhook.partner_id) as timer:
            try:
                # Make HTTP request
                response = self.http_session.post(
                    webhook.url,
                    json=webhook.payload,
                    headers=self.generate_signature_headers(webhook),
                    timeout=10
                )

                # Record result
                if response.status_code == 200:
                    timer.set_success(webhook.event_type)
                    self._mark_delivered(webhook.id)
                    return True
                else:
                    timer.set_failed(webhook.event_type, response.status_code)
                    self._schedule_retry(webhook)
                    return False

            except requests.RequestException as e:
                self.logger.error(f"Webhook delivery failed: {e}")
                timer.set_failed(webhook.event_type, 0)  # 0 = connection error
                self._schedule_retry(webhook)
                return False
```

#### 3.5 Instrument Dead Letter Queue

When moving webhooks to dead letter:

```python
def _move_to_dead_letter(self, webhook: WebhookDeliveryQueue):
    """Move webhook to dead letter queue after exhausting retries."""

    # Update database
    webhook.status = 'dead_letter'
    db.commit()

    # Record metric
    self.metrics.record_dead_letter(webhook.event_type, webhook.partner_id)

    self.logger.warning(
        f"Webhook moved to dead letter: id={webhook.id}, "
        f"partner={webhook.partner_id}, attempts={webhook.attempt_count}"
    )
```

#### 3.6 Instrument Main Loop

In the worker's main loop:

```python
def run(self):
    """Main worker processing loop."""

    self.logger.info(f"Worker {self.worker_id} starting")

    while self.running:
        try:
            # Update worker uptime
            self.metrics.update_worker_uptime()

            # Get queue health metrics
            queue_size = self._get_queue_size()
            oldest_age = self._get_oldest_webhook_age()

            self.metrics.update_queue_health(queue_size, oldest_age)

            # Fetch and process webhooks
            webhooks = self._fetch_pending_webhooks(batch_size=10)

            for webhook in webhooks:
                self.process_webhook(webhook)

            # Update active workers count (query database)
            active_workers = self._count_active_workers()
            self.metrics.update_active_workers(active_workers)

            # Sleep between polls
            time.sleep(self.poll_interval)

        except Exception as e:
            self.logger.error(f"Worker error: {e}", exc_info=True)
            time.sleep(5)  # Back off on error
```

#### 3.7 Add Helper Methods

Add these helper methods to `WebhookWorker`:

```python
def _get_queue_size(self) -> int:
    """Get current webhook queue size."""
    db = self.Session()
    try:
        count = db.query(WebhookDeliveryQueue).filter(
            WebhookDeliveryQueue.status == 'pending'
        ).count()
        return count
    finally:
        db.close()

def _get_oldest_webhook_age(self) -> float:
    """Get age of oldest webhook in queue (seconds)."""
    db = self.Session()
    try:
        oldest = db.query(WebhookDeliveryQueue).filter(
            WebhookDeliveryQueue.status == 'pending'
        ).order_by(WebhookDeliveryQueue.created_at.asc()).first()

        if oldest:
            age = (datetime.utcnow() - oldest.created_at).total_seconds()
            return age
        return 0
    finally:
        db.close()

def _count_active_workers(self) -> int:
    """Count active worker instances (based on recent heartbeats)."""
    # This would require a worker heartbeat mechanism
    # For now, you can track in a shared table or use Redis
    return 1  # Placeholder
```

## Testing the Integration

### 1. Verify Metrics Endpoint

```bash
# Test health endpoint
curl http://localhost:5000/metrics/health

# Should return:
# {
#   "status": "healthy",
#   "collectors": {
#     "campaign_metrics": "registered",
#     "webhook_metrics": "registered"
#   }
# }
```

### 2. Generate Test Metrics

Start the campaign engine and webhook worker, then check metrics:

```bash
# View all metrics
curl http://localhost:5000/metrics

# View JSON format (easier to read)
curl http://localhost:5000/metrics/json | jq .
```

### 3. Verify Campaign Metrics

Look for campaign metrics in the output:

```
campaign_calls_initiated_total{campaign_id="abc123",user_id="user456"} 5
campaign_active_campaigns{user_id="user456"} 2
campaign_concurrent_calls 3
```

### 4. Verify Webhook Metrics

Look for webhook metrics:

```
webhook_queued_total{event_type="call_ended",partner_id="partner123"} 10
webhook_delivered_total{event_type="call_ended",partner_id="partner123"} 8
webhook_queue_size 2
webhook_active_workers 1
```

## Production Deployment

### 1. Add to Systemd Service

If running campaign engine or webhook worker as systemd service:

```ini
# /etc/systemd/system/campaign-engine.service
[Unit]
Description=Campaign Engine with Metrics
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/livekit1
Environment="PYTHONPATH=/opt/livekit1"
ExecStart=/usr/local/bin/uv run python campaign_engine.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### 2. Configure Prometheus

Create `/etc/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'livekit-platform'
    static_configs:
      - targets: ['localhost:5000']  # Your Flask app
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### 3. Start Prometheus

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Start Prometheus
./prometheus --config.file=/etc/prometheus/prometheus.yml
```

Access Prometheus at http://localhost:9090

### 4. Set Up Grafana (Optional)

```bash
# Install Grafana
sudo apt-get install -y grafana

# Start Grafana
sudo systemctl start grafana-server
sudo systemctl enable grafana-server
```

Access Grafana at http://localhost:3000 (default login: admin/admin)

Add Prometheus data source:
- URL: http://localhost:9090
- Save & Test

## Troubleshooting

### Metrics not appearing

1. **Check Flask blueprint registration**:
   ```python
   # In your Flask app
   print(app.url_map)  # Should show /metrics routes
   ```

2. **Verify metrics endpoint**:
   ```bash
   curl http://localhost:5000/metrics/health
   ```

3. **Check for import errors**:
   ```bash
   uv run python -c "from backend.metrics import metrics_registry; print('OK')"
   ```

### Metrics values always zero

1. **Verify instrumentation code is being called**:
   ```python
   # Add logging
   self.logger.info(f"Recording call initiated: {campaign_id}")
   self.metrics.record_call_initiated(campaign_id, user_id)
   ```

2. **Check for exceptions**:
   ```bash
   grep -i "metric" /var/log/campaign_engine.log
   ```

### Prometheus not scraping

1. **Check Prometheus targets page**: http://localhost:9090/targets
2. **Verify network connectivity**: `curl http://localhost:5000/metrics`
3. **Check Prometheus logs**: `journalctl -u prometheus -f`

## Next Steps

1. ✅ Register metrics endpoint in Flask app
2. ✅ Instrument campaign engine with metrics
3. ✅ Instrument webhook worker with metrics
4. ✅ Test metrics endpoint
5. ⬜ Deploy Prometheus for scraping
6. ⬜ Create Grafana dashboards
7. ⬜ Set up alerting rules

## Additional Resources

- [Prometheus Python Client Documentation](https://github.com/prometheus/client_python)
- [Prometheus Query Language (PromQL)](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Examples](https://grafana.com/grafana/dashboards/)
