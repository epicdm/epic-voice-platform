# Webhook Delivery Worker

Production-ready webhook delivery system for LiveKit Agents platform.

## Features

✅ **Queue-Based Architecture**: PostgreSQL-backed queue with SKIP LOCKED for concurrency
✅ **Retry Logic**: Exponential backoff (30s → 60s → 120s → 240s → 480s)
✅ **HMAC Signing**: SHA-256 signature generation for webhook authenticity
✅ **Multi-Tenant**: User-scoped isolation for SaaS deployments
✅ **Horizontal Scaling**: Multiple worker instances with automatic coordination
✅ **Systemd Integration**: Production deployment with service management
✅ **Dead Letter Queue**: Automatic handling of failed webhooks
✅ **Audit Logging**: Complete delivery attempt history

## Quick Start

### 1. Install Dependencies

```bash
pip install sqlalchemy psycopg2-binary requests python-dotenv
```

### 2. Setup Database

```bash
PGPASSWORD="your_password" psql -U postgres -d epic_voice_db -f DATABASE_SCHEMA.sql
```

### 3. Configure Environment

```bash
# Copy environment template
sudo cp systemd/webhook-worker.env.example /etc/webhook-worker/webhook-worker.env

# Generate encryption key
python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"

# Edit configuration
sudo nano /etc/webhook-worker/webhook-worker.env
```

### 4. Run Worker (Development)

```bash
# Single worker instance
python3 worker.py --instance 1

# With debug logging
python3 worker.py --instance 1 --debug
```

### 5. Deploy to Production (Systemd)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for complete deployment instructions.

```bash
# Copy systemd units
sudo cp systemd/webhook-worker@.service /etc/systemd/system/
sudo cp systemd/webhook-worker.target /etc/systemd/system/

# Enable and start workers
sudo systemctl daemon-reload
sudo systemctl enable webhook-worker.target
sudo systemctl start webhook-worker.target

# Check status
sudo systemctl status webhook-worker.target
sudo journalctl -u 'webhook-worker@*' -f
```

## Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Flask     │         │   PostgreSQL     │         │   Worker    │
│Application  │─enqueue→│ Delivery Queue   │←poll────│  Instance 1 │
│             │         │  (SKIP LOCKED)   │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
                                 │                           │
                                 │                    deliver webhook
                                 │                           │
                                 ↓                           ↓
                        ┌──────────────────┐       ┌─────────────────┐
                        │   Delivery Log   │       │  Partner API    │
                        │  (Audit Trail)   │       │ (HMAC Verified) │
                        └──────────────────┘       └─────────────────┘
```

## Integration with Call Outcomes

```python
from database import db
from webhook_worker.enqueue import enqueue_call_outcome_webhook

# In your call completion handler
outcome_data = {
    "call_id": call_id,
    "room_name": room_name,
    "event_type": "call.completed",
    "timestamp": datetime.utcnow().isoformat(),
    "duration": duration_seconds,
    "status": "completed"
}

# Enqueue webhooks for all subscribed partners
webhook_ids = enqueue_call_outcome_webhook(
    db=db,
    user_id=user_id,
    call_id=call_id,
    outcome_data=outcome_data
)

print(f"Enqueued {len(webhook_ids)} partner webhooks")
```

## Partner Configuration

```python
from database import db
from webhook_worker.models import PartnerWebhook

# Create partner webhook configuration
partner = PartnerWebhook(
    id=str(uuid.uuid4()),
    userId="user_123",
    partner_name="Acme Corp",
    partner_slug="acme-corp",
    url="https://acme.com/webhooks",
    secret="partner_secret_key",
    enabled_events=["call.completed", "call.failed"],
    custom_payload_fields={"brand": "AcmeVoice"},
    enabled=True
)

db.add(partner)
db.commit()
```

## Module Structure

```
backend/webhook_worker/
├── models.py              # SQLAlchemy database models
├── worker.py              # Main worker process (executable)
├── signer.py              # HMAC-SHA256 signing
├── retry.py               # Exponential backoff strategy
├── config.py              # Configuration management
├── enqueue.py             # Enqueueing utilities
├── test_webhook_worker.py # Test suite
├── __init__.py            # Module exports
├── README.md              # This file
├── DESIGN_SPECIFICATION.md # Complete design document
├── DATABASE_SCHEMA.sql    # Database schema
├── DEPLOYMENT_GUIDE.md    # Deployment instructions
└── systemd/               # Systemd service files
    ├── webhook-worker@.service
    ├── webhook-worker.target
    └── webhook-worker.env.example
```

## Testing

```bash
# Run test suite
pytest test_webhook_worker.py -v

# Run with coverage
pytest test_webhook_worker.py --cov=. --cov-report=html

# Run specific test
pytest test_webhook_worker.py::TestWebhookSigner::test_generate_signature -v
```

## Monitoring

### Queue Statistics

```sql
-- Check queue status
SELECT * FROM get_webhook_queue_stats();

-- Monitor dead letter queue
SELECT COUNT(*) FROM webhook_delivery_queue WHERE status = 'dead_letter';

-- Check recent failures
SELECT * FROM webhook_delivery_queue
WHERE status IN ('failed', 'dead_letter')
ORDER BY "updatedAt" DESC
LIMIT 10;
```

### Worker Logs

```bash
# Live tail all workers
sudo journalctl -u 'webhook-worker@*' -f

# View specific worker
sudo journalctl -u webhook-worker@1.service -n 100

# Search for errors
sudo journalctl -u 'webhook-worker@*' | grep ERROR
```

### System Status

```bash
# Check all workers
systemctl status webhook-worker.target

# Check individual worker
systemctl status webhook-worker@1.service

# Restart all workers
sudo systemctl restart webhook-worker.target
```

## Configuration Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Required | PostgreSQL connection string |
| `WORKER_POLL_INTERVAL` | 5 | Polling interval in seconds |
| `WORKER_BATCH_SIZE` | 10 | Webhooks processed per batch |
| `WORKER_TIMEOUT` | 30 | Worker timeout in seconds |
| `RETRY_BASE_DELAY` | 30 | Base retry delay in seconds |
| `RETRY_MAX_DELAY` | 3600 | Maximum retry delay |
| `RETRY_MAX_ATTEMPTS` | 5 | Max delivery attempts |
| `HTTP_TIMEOUT` | 30 | HTTP request timeout |
| `LOG_LEVEL` | INFO | Logging level |
| `AUDIT_LOG_ENABLED` | true | Enable delivery audit log |

See [systemd/webhook-worker.env.example](./systemd/webhook-worker.env.example) for complete configuration options.

## Troubleshooting

### Workers Not Processing

```bash
# Check worker status
systemctl status webhook-worker@1.service

# View logs
sudo journalctl -u webhook-worker@1.service -n 50

# Verify database connection
PGPASSWORD="password" psql -U postgres -d epic_voice_db -c "SELECT COUNT(*) FROM webhook_delivery_queue WHERE status='pending';"
```

### High Failure Rate

```sql
-- Check failure reasons
SELECT
    last_response_status,
    COUNT(*) as count,
    string_agg(DISTINCT last_error, '; ') as errors
FROM webhook_delivery_queue
WHERE status IN ('failed', 'dead_letter')
GROUP BY last_response_status
ORDER BY count DESC;
```

### Dead Letter Queue Growing

```sql
-- Investigate dead letter webhooks
SELECT
    id,
    event_type,
    attempt_count,
    last_error,
    last_response_status
FROM webhook_delivery_queue
WHERE status = 'dead_letter'
ORDER BY "createdAt" DESC
LIMIT 10;
```

## Performance Tuning

### Scale Workers

```bash
# Start additional workers
sudo systemctl start webhook-worker@4.service
sudo systemctl start webhook-worker@5.service

# Update target to include new workers
sudo nano /etc/systemd/system/webhook-worker.target
sudo systemctl daemon-reload
```

### Optimize Configuration

```bash
# In /etc/webhook-worker/webhook-worker.env

# Increase throughput
WORKER_BATCH_SIZE=20
WORKER_POLL_INTERVAL=2
MAX_CONCURRENT_DELIVERIES=15

# Reduce resource usage
WORKER_BATCH_SIZE=5
WORKER_POLL_INTERVAL=10
MAX_CONCURRENT_DELIVERIES=5
```

## Security Best Practices

1. **Secure Environment File**:
   ```bash
   sudo chmod 640 /etc/webhook-worker/webhook-worker.env
   sudo chown root:www-data /etc/webhook-worker/webhook-worker.env
   ```

2. **Rotate Encryption Keys** periodically

3. **Enable Audit Logging**: `AUDIT_LOG_ENABLED=true`

4. **Use HTTPS URLs** for partner webhooks

5. **Monitor Dead Letter Queue** for suspicious patterns

## Documentation

- [DESIGN_SPECIFICATION.md](./DESIGN_SPECIFICATION.md) - Complete architecture and design
- [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql) - Database schema with comments
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Step-by-step deployment
- [API Documentation](../call_outcomes/API_REFERENCE.md) - API integration guide

## License

Part of LiveKit Agents platform.

## Version

**1.0.0** - Production Ready (2025-10-29)
