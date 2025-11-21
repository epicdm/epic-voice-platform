# Webhook Worker - Deployment Guide

**Version**: 1.0.0
**Date**: 2025-10-29

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Environment Configuration](#environment-configuration)
4. [Systemd Installation](#systemd-installation)
5. [Starting Workers](#starting-workers)
6. [Verification](#verification)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

- **OS**: Linux with systemd (Ubuntu 20.04+, Debian 11+, RHEL 8+)
- **Python**: 3.9 or later
- **PostgreSQL**: 12 or later
- **Disk Space**: 100MB for application, 10GB+ for queue storage
- **Memory**: 512MB per worker instance (minimum)

### Python Dependencies

```bash
pip install sqlalchemy psycopg2-binary requests python-dotenv prometheus-client
```

### Database Permissions

Worker needs these permissions:
```sql
GRANT SELECT, INSERT, UPDATE ON webhook_delivery_queue TO webhook_worker;
GRANT SELECT ON partner_webhooks TO webhook_worker;
GRANT SELECT, INSERT ON webhook_delivery_log TO webhook_worker;
```

---

## Database Setup

### Step 1: Run Schema Migration

```bash
cd /opt/livekit1

# Connect to PostgreSQL
PGPASSWORD="your_password" psql -U postgres -d epic_voice_db -f backend/webhook_worker/DATABASE_SCHEMA.sql
```

### Step 2: Verify Tables Created

```bash
PGPASSWORD="your_password" psql -U postgres -d epic_voice_db -c "\dt webhook*"
```

Expected output:
```
                     List of relations
 Schema |           Name            | Type  |  Owner
--------+---------------------------+-------+----------
 public | partner_webhooks          | table | postgres
 public | webhook_delivery_queue    | table | postgres
 public | webhook_delivery_log      | table | postgres
```

### Step 3: Verify Indexes

```bash
PGPASSWORD="your_password" psql -U postgres -d epic_voice_db -c "\di idx_wdq*"
```

---

## Environment Configuration

### Step 1: Create Configuration Directory

```bash
sudo mkdir -p /etc/webhook-worker
sudo chown www-data:www-data /etc/webhook-worker
sudo chmod 750 /etc/webhook-worker
```

### Step 2: Copy Environment Template

```bash
sudo cp backend/webhook_worker/systemd/webhook-worker.env.example \
    /etc/webhook-worker/webhook-worker.env
```

### Step 3: Generate Encryption Key

```bash
python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"
```

Copy output to `WEBHOOK_SECRET_ENCRYPTION_KEY` in env file.

### Step 4: Configure Environment

Edit `/etc/webhook-worker/webhook-worker.env`:

```bash
sudo nano /etc/webhook-worker/webhook-worker.env
```

**Minimal Required Configuration**:
```bash
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/epic_voice_db
WEBHOOK_SECRET_ENCRYPTION_KEY=YOUR_GENERATED_KEY
LOG_LEVEL=INFO
```

### Step 5: Secure Environment File

```bash
sudo chown root:www-data /etc/webhook-worker/webhook-worker.env
sudo chmod 640 /etc/webhook-worker/webhook-worker.env
```

---

## Systemd Installation

### Step 1: Copy Service Files

```bash
# Copy service unit (templated for multiple instances)
sudo cp backend/webhook_worker/systemd/webhook-worker@.service \
    /etc/systemd/system/

# Copy target unit (manages all instances)
sudo cp backend/webhook_worker/systemd/webhook-worker.target \
    /etc/systemd/system/
```

### Step 2: Reload Systemd

```bash
sudo systemctl daemon-reload
```

### Step 3: Verify Service Files

```bash
systemctl cat webhook-worker@1.service
systemctl cat webhook-worker.target
```

---

## Starting Workers

### Option 1: Start All Workers (Recommended)

```bash
# Enable target to start on boot
sudo systemctl enable webhook-worker.target

# Start all workers
sudo systemctl start webhook-worker.target

# Check status
sudo systemctl status webhook-worker.target
```

### Option 2: Start Individual Workers

```bash
# Start worker 1
sudo systemctl start webhook-worker@1.service

# Start worker 2
sudo systemctl start webhook-worker@2.service

# Start worker 3
sudo systemctl start webhook-worker@3.service

# Enable individual workers on boot
sudo systemctl enable webhook-worker@1.service
sudo systemctl enable webhook-worker@2.service
sudo systemctl enable webhook-worker@3.service
```

### Scaling Workers

**Add More Workers**:
```bash
# Start additional instances
sudo systemctl start webhook-worker@4.service
sudo systemctl start webhook-worker@5.service

# Update target file to include new workers
sudo nano /etc/systemd/system/webhook-worker.target
```

Add to `[Unit]` section:
```ini
Wants=webhook-worker@1.service webhook-worker@2.service webhook-worker@3.service webhook-worker@4.service webhook-worker@5.service
```

Then reload:
```bash
sudo systemctl daemon-reload
sudo systemctl restart webhook-worker.target
```

---

## Verification

### Step 1: Check Worker Status

```bash
# Check all workers
systemctl status webhook-worker.target

# Check individual worker
systemctl status webhook-worker@1.service
```

Expected output:
```
● webhook-worker@1.service - Webhook Delivery Worker (Instance 1)
   Loaded: loaded (/etc/systemd/system/webhook-worker@.service; enabled)
   Active: active (running) since ...
```

### Step 2: View Logs

```bash
# View logs for all workers
sudo journalctl -u 'webhook-worker@*' -f

# View logs for specific worker
sudo journalctl -u webhook-worker@1.service -f

# View last 100 lines
sudo journalctl -u webhook-worker@1.service -n 100
```

### Step 3: Test Webhook Enqueueing

```python
# Test script: test_enqueue.py
from backend.webhook_worker.models import WebhookDeliveryQueue
from database import db
import uuid
from datetime import datetime

webhook = WebhookDeliveryQueue(
    id=str(uuid.uuid4()),
    userId='test_user_id',
    url='https://webhook.site/test',
    secret='test_secret',
    event_type='call.completed',
    payload={'test': 'data'},
    status='pending',
    attempt_count=0,
    max_attempts=5,
    next_retry_at=datetime.utcnow()
)
db.session.add(webhook)
db.session.commit()
print(f"Enqueued webhook: {webhook.id}")
```

Run test:
```bash
python3 test_enqueue.py
```

### Step 4: Verify Processing

```bash
# Check worker logs for processing
sudo journalctl -u webhook-worker@1.service -n 50 | grep "Delivering webhook"

# Check database
PGPASSWORD="password" psql -U postgres -d epic_voice_db -c \
  "SELECT id, status, attempt_count FROM webhook_delivery_queue LIMIT 5;"
```

---

## Monitoring

### Queue Health Checks

```bash
# Check queue statistics
PGPASSWORD="password" psql -U postgres -d epic_voice_db -c \
  "SELECT * FROM get_webhook_queue_stats();"
```

Expected output:
```
  status   | count | oldest_pending |  avg_attempts
-----------+-------+----------------+---------------
 pending   |    5  | 2025-10-29...  |          1.00
 delivered |   95  | 2025-10-29...  |          1.20
```

### Worker Health Checks

```bash
# Check if all workers are running
systemctl list-units 'webhook-worker@*' --all
```

### Dead Letter Queue Monitoring

```bash
# Check dead letter queue size
PGPASSWORD="password" psql -U postgres -d epic_voice_db -c \
  "SELECT COUNT(*) as dead_letter_count FROM webhook_delivery_queue WHERE status = 'dead_letter';"
```

### Prometheus Metrics (if enabled)

```bash
# Check metrics endpoint
curl http://localhost:9090/metrics
```

Expected metrics:
```
# HELP webhooks_delivered_total Total webhooks delivered
# TYPE webhooks_delivered_total counter
webhooks_delivered_total{user_id="user_1",partner_id="partner_1"} 95

# HELP webhook_queue_size Current queue size
# TYPE webhook_queue_size gauge
webhook_queue_size{status="pending"} 5
```

---

## Troubleshooting

### Workers Not Starting

**Check systemd status**:
```bash
systemctl status webhook-worker@1.service
```

**Common issues**:
1. **Environment file missing**: Check `/etc/webhook-worker/webhook-worker.env` exists
2. **Database connection failed**: Verify `DATABASE_URL` in env file
3. **Python dependencies missing**: Run `pip install -r requirements.txt`
4. **Permissions issue**: Check worker runs as `www-data` user

### Workers Start but Don't Process

**Check logs**:
```bash
sudo journalctl -u webhook-worker@1.service -n 100
```

**Common issues**:
1. **No webhooks in queue**: Verify enqueueing works
2. **Database connection issues**: Check PostgreSQL is running
3. **SKIP LOCKED not supported**: PostgreSQL version < 9.5

### High Failure Rate

**Check failure reasons**:
```sql
SELECT
    last_response_status,
    COUNT(*) as failure_count,
    string_agg(DISTINCT last_error, '; ') as error_messages
FROM webhook_delivery_queue
WHERE status = 'failed' OR status = 'dead_letter'
GROUP BY last_response_status
ORDER BY failure_count DESC;
```

**Common issues**:
1. **Partner endpoint down**: 5xx errors, network timeouts
2. **Invalid webhook secret**: Signature validation failures
3. **Rate limiting**: 429 errors
4. **SSL/TLS issues**: Network errors with https URLs

### Workers Consuming Too Much Memory

**Check memory usage**:
```bash
systemctl status webhook-worker@1.service | grep Memory
```

**Solutions**:
1. **Reduce batch size**: Lower `WORKER_BATCH_SIZE` in env file
2. **Increase memory limit**: Adjust `MemoryLimit` in service file
3. **Reduce concurrent deliveries**: Lower `MAX_CONCURRENT_DELIVERIES`

### Dead Letter Queue Growing

**Investigate failed webhooks**:
```sql
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

**Actions**:
1. **Fix partner endpoints**: Contact partners about non-2xx responses
2. **Retry manually**: Reset status to 'pending' after fixing issues
3. **Archive old failures**: Move to separate table for analysis

---

## Operational Commands

### Restart Workers

```bash
# Restart all workers
sudo systemctl restart webhook-worker.target

# Restart specific worker
sudo systemctl restart webhook-worker@1.service

# Graceful reload (SIGHUP)
sudo systemctl reload webhook-worker@1.service
```

### Stop Workers

```bash
# Stop all workers
sudo systemctl stop webhook-worker.target

# Stop specific worker
sudo systemctl stop webhook-worker@1.service
```

### View Logs

```bash
# Live tail all workers
sudo journalctl -u 'webhook-worker@*' -f

# View specific time range
sudo journalctl -u webhook-worker@1.service --since "1 hour ago"

# Search logs
sudo journalctl -u webhook-worker@1.service | grep "ERROR"
```

### Clean Up Old Webhooks

```sql
-- Clean up delivered webhooks older than 30 days
SELECT cleanup_delivered_webhooks(30);
```

---

## Performance Tuning

### Increase Worker Count

For high throughput, add more workers:
```bash
# Start workers 4-10
for i in {4..10}; do
    sudo systemctl start webhook-worker@$i.service
done
```

### Adjust Batch Size

Higher batch size = more throughput, more memory:
```bash
# In /etc/webhook-worker/webhook-worker.env
WORKER_BATCH_SIZE=20  # Increase from default 10
```

### Reduce Poll Interval

Lower poll interval = faster processing, more CPU:
```bash
# In /etc/webhook-worker/webhook-worker.env
WORKER_POLL_INTERVAL=2  # Decrease from default 5
```

### Database Optimization

```sql
-- Add more indexes for specific query patterns
CREATE INDEX idx_wdq_custom ON webhook_delivery_queue (/* your columns */);

-- Increase shared_buffers in PostgreSQL
-- Edit /etc/postgresql/*/main/postgresql.conf
shared_buffers = 2GB
```

---

## Security Best Practices

1. **Secure Environment File**:
   ```bash
   sudo chmod 640 /etc/webhook-worker/webhook-worker.env
   sudo chown root:www-data /etc/webhook-worker/webhook-worker.env
   ```

2. **Rotate Encryption Keys**:
   - Generate new key periodically
   - Re-encrypt webhook secrets in database
   - Update env file with new key

3. **Audit Logs**:
   - Enable `AUDIT_LOG_ENABLED=true`
   - Review `webhook_delivery_log` table regularly

4. **Network Security**:
   - Use HTTPS URLs for partner webhooks
   - Verify SSL certificates (don't disable verification)
   - Configure firewall to allow outbound HTTPS

---

## Maintenance Schedule

**Daily**:
- Check dead letter queue size
- Review error logs for patterns

**Weekly**:
- Review queue statistics
- Check worker memory/CPU usage
- Verify all workers running

**Monthly**:
- Clean up old delivered webhooks
- Review partner webhook health
- Update dependencies (security patches)

**Quarterly**:
- Rotate webhook secret encryption key
- Performance review and tuning
- Capacity planning

---

**Deployment Status**: Ready for Production
**Estimated Deployment Time**: 30-45 minutes
**Recommended Worker Count**: 3-5 (adjust based on load)

---

**Last Updated**: 2025-10-29
**Version**: 1.0.0
