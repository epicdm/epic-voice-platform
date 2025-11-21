# Operations Directory

Production deployment configurations and scripts for LiveKit Agents platform.

## Directory Structure

```
ops/
├── config/                      # Production configuration
│   └── webhook-delivery.env     # Webhook worker environment variables
├── systemd/                     # Systemd service units
│   ├── webhook-delivery.service # Worker service template
│   └── webhook-delivery.target  # Multi-worker target
├── scripts/                     # Deployment and management scripts
│   └── deploy-webhook-delivery.sh  # Automated deployment
└── README.md                    # This file
```

## Webhook Delivery Worker

### Quick Deployment

```bash
# Automated deployment (recommended)
sudo /opt/livekit1/ops/scripts/deploy-webhook-delivery.sh

# Manual deployment steps
1. Configure: /opt/livekit1/ops/config/webhook-delivery.env
2. Deploy schema: psql -f backend/webhook_worker/DATABASE_SCHEMA.sql
3. Install systemd: cp ops/systemd/* /etc/systemd/system/
4. Enable: systemctl enable webhook-delivery.target
5. Start: systemctl start webhook-delivery.target
```

### Configuration

**Location**: `/opt/livekit1/ops/config/webhook-delivery.env`

**Required Settings**:
- `DATABASE_URL`: PostgreSQL connection string
- `WEBHOOK_SECRET_ENCRYPTION_KEY`: Generate with:
  ```bash
  python3 -c "import base64; import os; print(base64.b64encode(os.urandom(32)).decode())"
  ```

**Optional Settings**:
- `WORKER_POLL_INTERVAL`: Polling frequency (default: 5s)
- `WORKER_BATCH_SIZE`: Batch size (default: 10)
- `RETRY_MAX_ATTEMPTS`: Max retries (default: 5)
- `LOG_LEVEL`: Logging level (default: INFO)

**Security**:
```bash
# Secure configuration file
sudo chown root:www-data /opt/livekit1/ops/config/webhook-delivery.env
sudo chmod 640 /opt/livekit1/ops/config/webhook-delivery.env
```

### Service Management

**Start/Stop/Restart**:
```bash
# All workers
sudo systemctl start webhook-delivery.target
sudo systemctl stop webhook-delivery.target
sudo systemctl restart webhook-delivery.target

# Individual worker
sudo systemctl start webhook-delivery@1.service
sudo systemctl restart webhook-delivery@1.service
```

**Status**:
```bash
# All workers
systemctl status webhook-delivery.target

# Individual worker
systemctl status webhook-delivery@1.service

# Check if running
systemctl is-active webhook-delivery.target
```

**Enable/Disable on Boot**:
```bash
# Enable
sudo systemctl enable webhook-delivery.target

# Disable
sudo systemctl disable webhook-delivery.target
```

### Logging

**View Logs**:
```bash
# Live tail all workers
sudo journalctl -u 'webhook-delivery@*' -f

# View specific worker
sudo journalctl -u webhook-delivery@1.service -f

# Last 100 lines
sudo journalctl -u 'webhook-delivery@*' -n 100

# Since specific time
sudo journalctl -u 'webhook-delivery@*' --since "1 hour ago"

# Filter by log level
sudo journalctl -u 'webhook-delivery@*' -p err  # errors only
```

**Search Logs**:
```bash
# Search for keyword
sudo journalctl -u 'webhook-delivery@*' | grep "ERROR"

# Search with context
sudo journalctl -u 'webhook-delivery@*' | grep -A 5 -B 5 "Dead letter"
```

### Monitoring

**Queue Monitor**:
```bash
# One-time snapshot
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py

# Continuous monitoring
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py --watch

# Custom refresh interval
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py --watch --interval 5

# Filter by user
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py --user-id user_123

# Alerts only (problems)
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py --watch --alerts-only
```

**Database Queries**:
```sql
-- Queue statistics
SELECT * FROM get_webhook_queue_stats();

-- Dead letter queue
SELECT COUNT(*) FROM webhook_delivery_queue WHERE status = 'dead_letter';

-- Recent failures
SELECT id, event_type, last_error, attempt_count
FROM webhook_delivery_queue
WHERE status IN ('failed', 'dead_letter')
ORDER BY "updatedAt" DESC
LIMIT 10;

-- Partner health
SELECT * FROM v_partner_webhook_health;
```

### Scaling Workers

**Add More Workers**:
```bash
# Start additional instances
sudo systemctl start webhook-delivery@4.service
sudo systemctl start webhook-delivery@5.service

# Enable on boot
sudo systemctl enable webhook-delivery@4.service
sudo systemctl enable webhook-delivery@5.service

# Update target file
sudo nano /etc/systemd/system/webhook-delivery.target
# Add: Wants=webhook-delivery@4.service webhook-delivery@5.service

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart webhook-delivery.target
```

**Remove Workers**:
```bash
# Stop and disable
sudo systemctl stop webhook-delivery@3.service
sudo systemctl disable webhook-delivery@3.service

# Update target file to remove from Wants=
```

### Troubleshooting

**Workers Not Starting**:
```bash
# Check service status
systemctl status webhook-delivery@1.service

# View recent logs
sudo journalctl -u webhook-delivery@1.service -n 50

# Check configuration
cat /opt/livekit1/ops/config/webhook-delivery.env | grep DATABASE_URL

# Test database connection
PGPASSWORD="password" psql -U postgres -d epic_voice_db -c "SELECT 1;"

# Check Python environment
/opt/livekit1/venv/bin/python3 --version
/opt/livekit1/venv/bin/python3 -c "import sqlalchemy; print('OK')"
```

**Workers Not Processing**:
```bash
# Check queue depth
python3 /opt/livekit1/backend/webhook_worker/queue_monitor.py

# Check for webhooks in queue
PGPASSWORD="password" psql -U postgres -d epic_voice_db \
  -c "SELECT status, COUNT(*) FROM webhook_delivery_queue GROUP BY status;"

# Check worker logs for errors
sudo journalctl -u 'webhook-delivery@*' -p err -n 50
```

**High Memory Usage**:
```bash
# Check memory usage
systemctl status webhook-delivery@1.service | grep Memory

# Adjust memory limit in service file
sudo nano /etc/systemd/system/webhook-delivery@.service
# Change: MemoryLimit=512M

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart webhook-delivery@1.service
```

**Dead Letter Queue Growing**:
```sql
-- Investigate failures
SELECT
    event_type,
    last_error,
    last_response_status,
    COUNT(*) as count
FROM webhook_delivery_queue
WHERE status = 'dead_letter'
GROUP BY event_type, last_error, last_response_status
ORDER BY count DESC;

-- Retry specific webhooks (after fixing issues)
UPDATE webhook_delivery_queue
SET status = 'pending',
    attempt_count = 0,
    next_retry_at = NOW()
WHERE id = 'webhook_id_here';
```

### Performance Tuning

**Increase Throughput**:
```bash
# In /opt/livekit1/ops/config/webhook-delivery.env
WORKER_BATCH_SIZE=20           # Process more per batch
WORKER_POLL_INTERVAL=2         # Poll more frequently
MAX_CONCURRENT_DELIVERIES=15   # More concurrent HTTP requests

# Add more worker instances
sudo systemctl start webhook-delivery@4.service
sudo systemctl start webhook-delivery@5.service
```

**Reduce Resource Usage**:
```bash
# In /opt/livekit1/ops/config/webhook-delivery.env
WORKER_BATCH_SIZE=5            # Smaller batches
WORKER_POLL_INTERVAL=10        # Poll less frequently
MAX_CONCURRENT_DELIVERIES=5    # Fewer concurrent requests

# Reduce worker instances
sudo systemctl stop webhook-delivery@3.service
```

### Maintenance

**Backup Configuration**:
```bash
sudo cp /opt/livekit1/ops/config/webhook-delivery.env \
       /opt/livekit1/ops/config/webhook-delivery.env.backup.$(date +%Y%m%d)
```

**Update Worker Code**:
```bash
# Stop workers
sudo systemctl stop webhook-delivery.target

# Update code (git pull, etc.)
cd /opt/livekit1
git pull

# Restart workers
sudo systemctl start webhook-delivery.target
```

**Clean Up Old Logs**:
```bash
# Rotate journal logs
sudo journalctl --vacuum-time=7d    # Keep last 7 days
sudo journalctl --vacuum-size=500M  # Keep last 500MB
```

**Database Maintenance**:
```sql
-- Clean up old delivered webhooks (30 days)
SELECT cleanup_delivered_webhooks(30);

-- Vacuum tables
VACUUM ANALYZE webhook_delivery_queue;
VACUUM ANALYZE webhook_delivery_log;
```

## Security

### File Permissions

```bash
# Configuration
/opt/livekit1/ops/config/webhook-delivery.env: 640 root:www-data

# Systemd units
/etc/systemd/system/webhook-delivery*.service: 644 root:root
/etc/systemd/system/webhook-delivery.target: 644 root:root

# Scripts
/opt/livekit1/ops/scripts/*.sh: 755 root:root
```

### Network Security

- Workers require outbound HTTPS access for webhook delivery
- No inbound ports required (workers poll database)
- PostgreSQL should be firewalled (localhost only or VPC)

### Secrets Management

- `WEBHOOK_SECRET_ENCRYPTION_KEY`: Stored in environment file (640 permissions)
- Partner webhook secrets: Encrypted in database using encryption key
- Database password: In DATABASE_URL (640 permissions)

## Support

**Documentation**:
- Worker README: `/opt/livekit1/backend/webhook_worker/README.md`
- Deployment Guide: `/opt/livekit1/backend/webhook_worker/DEPLOYMENT_GUIDE.md`
- Design Spec: `/opt/livekit1/backend/webhook_worker/DESIGN_SPECIFICATION.md`

**Testing**:
```bash
# Run worker tests
cd /opt/livekit1/backend/webhook_worker
python3 test_basic.py
```

**Development Mode**:
```bash
# Run worker locally (not systemd)
cd /opt/livekit1/backend/webhook_worker
./dev_quickstart.sh
```

---

**Version**: 1.0.0
**Last Updated**: 2025-10-29
