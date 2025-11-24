# Funnel Engine

Multi-stage funnel orchestration system for AI voice agent campaigns.

**Version:** 1.0.0
**Based on:** webhook_worker PostgreSQL SKIP LOCKED pattern
**Status:** Production-ready

---

## Overview

The Funnel Engine provides sophisticated workflow orchestration for voice agent campaigns. It allows users to create multi-stage funnels with conditional branching, delays, webhooks, and integrations.

### Key Features

✅ **Visual Flow Builder** - Drag-and-drop funnel creation
✅ **Multi-Stage Workflows** - Call, delay, condition, webhook, email, SMS nodes
✅ **Conditional Branching** - Route based on call outcomes
✅ **Retry Logic** - Exponential backoff (30s → 480s)
✅ **Horizontal Scaling** - PostgreSQL SKIP LOCKED for concurrent workers
✅ **Event Sourcing** - Complete audit trail
✅ **Multi-Tenant Safe** - userId isolation everywhere

---

## Architecture

```
┌─────────────────┐
│  Flask Routes   │  POST /api/funnels, PUT /api/funnels/{id}/graph
│  (routes.py)    │  POST /api/funnels/{id}/start
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Enqueue        │  enqueue_funnel_stage()
│  (enqueue.py)   │  enqueue_next_stage()
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PostgreSQL      │  funnel_stage_queue (SKIP LOCKED)
│ Queue           │  Status: pending → processing → completed
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Funnel Worker   │  Poll queue (5s interval)
│ (SKIP LOCKED)   │  Process stages in background
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Funnel Executor │  Execute node logic (call, delay, webhook, etc.)
│ (executor.py)   │  Enqueue next stage based on outcome
└─────────────────┘
```

---

## Database Schema

### Core Tables

1. **funnels** - Funnel configuration and metadata
2. **funnel_nodes** - Individual stages (call, delay, condition, etc.)
3. **funnel_edges** - Transitions between stages
4. **funnel_executions** - Execution instances (one per lead)
5. **funnel_execution_events** - Event sourcing log
6. **funnel_stage_queue** - Background processing queue (SKIP LOCKED)

### Key Indexes

```sql
-- CRITICAL: Optimized for worker polling with SKIP LOCKED
CREATE INDEX idx_funnel_queue_poll ON funnel_stage_queue(status, next_retry_at)
    WHERE status IN ('pending', 'failed');
```

---

## Installation

### 1. Database Migration

```bash
# Run migration SQL
psql $DATABASE_URL -f migrations.sql

# Verify tables created
psql $DATABASE_URL -c "\dt funnel*"
```

### 2. Install Dependencies

```bash
pip install sqlalchemy psycopg2-binary flask requests
```

### 3. Register Flask Blueprint

```python
# In your main Flask app (e.g., backend/app.py)
from funnel_engine.routes import funnel_bp

app.register_blueprint(funnel_bp)
```

### 4. Configure Workers

```bash
# Copy systemd service files
sudo cp systemd/funnel-worker@.service /etc/systemd/system/
sudo cp systemd/funnel-worker.target /etc/systemd/system/
sudo cp systemd/funnel-worker.env.example /opt/livekit1/backend/funnel_engine/funnel-worker.env

# Edit configuration
sudo nano /opt/livekit1/backend/funnel_engine/funnel-worker.env

# Reload systemd
sudo systemctl daemon-reload

# Start workers
sudo systemctl start funnel-worker.target

# Enable on boot
sudo systemctl enable funnel-worker.target
```

---

## Usage

### Create a Funnel

```bash
POST /api/funnels
{
  "name": "Sales Outreach Funnel",
  "description": "Initial contact → follow-up",
  "status": "draft"
}

# Response: { "id": "funnel-123", ... }
```

### Build Funnel Graph

```bash
PUT /api/funnels/funnel-123/graph
{
  "nodes": [
    {
      "id": "node-1",
      "type": "call",
      "label": "Initial Call",
      "config": { "agent_id": "agent-456" },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "node-2",
      "type": "delay",
      "label": "Wait 1 Day",
      "config": { "delay_seconds": 86400 },
      "position": { "x": 300, "y": 100 }
    },
    {
      "id": "node-3",
      "type": "email",
      "label": "Follow-up Email",
      "config": { "template_id": "template-789" },
      "position": { "x": 500, "y": 100 }
    },
    {
      "id": "node-4",
      "type": "end",
      "label": "End",
      "config": {},
      "position": { "x": 700, "y": 100 }
    }
  ],
  "edges": [
    {
      "source": "node-1",
      "target": "node-2",
      "condition": "answered",
      "label": "If Answered"
    },
    {
      "source": "node-1",
      "target": "node-4",
      "condition": "voicemail",
      "label": "If Voicemail"
    },
    {
      "source": "node-2",
      "target": "node-3",
      "condition": "completed",
      "label": "After Delay"
    },
    {
      "source": "node-3",
      "target": "node-4",
      "condition": "sent",
      "label": "Email Sent"
    }
  ]
}
```

### Activate Funnel

```bash
PUT /api/funnels/funnel-123
{
  "status": "active"
}
```

### Start Execution

```bash
POST /api/funnels/funnel-123/start
{
  "contact_data": {
    "phone": "+17678189426",
    "email": "john@example.com",
    "name": "John Doe"
  },
  "context": {
    "campaign_id": "campaign-001"
  }
}

# Response: { "execution_id": "exec-789", ... }
```

### Monitor Execution

```bash
GET /api/funnels/executions/exec-789

# Response:
{
  "id": "exec-789",
  "status": "active",
  "current_node_id": "node-2",
  "last_outcome": "answered",
  "events": [
    {
      "type": "node_entered",
      "node_id": "node-1",
      "created_at": "2025-11-15T10:00:00Z"
    },
    {
      "type": "node_completed",
      "node_id": "node-1",
      "outcome": "answered",
      "created_at": "2025-11-15T10:02:30Z"
    },
    {
      "type": "transition",
      "node_id": "node-1",
      "outcome": "answered",
      "metadata": { "next_node_id": "node-2" },
      "created_at": "2025-11-15T10:02:31Z"
    }
  ]
}
```

---

## Node Types

### 1. CALL Node

Initiates an AI voice call.

```json
{
  "type": "call",
  "config": {
    "agent_id": "agent-456"
  }
}
```

**Outcomes:** `answered`, `voicemail`, `no_answer`, `failed`

### 2. DELAY Node

Waits for a specified duration.

```json
{
  "type": "delay",
  "config": {
    "delay_seconds": 86400  // 1 day
  }
}
```

**Outcomes:** `completed`

### 3. CONDITION Node

Evaluates a condition and branches.

```json
{
  "type": "condition",
  "config": {
    "condition_type": "last_outcome_equals",
    "expected_value": "answered"
  }
}
```

**Outcomes:** `true`, `false`

### 4. WEBHOOK Node

Sends HTTP request to external endpoint.

```json
{
  "type": "webhook",
  "config": {
    "webhook_url": "https://api.example.com/funnel-event",
    "method": "POST",
    "timeout": 30
  }
}
```

**Outcomes:** `success`, `failed`

### 5. EMAIL Node

Sends an email.

```json
{
  "type": "email",
  "config": {
    "template_id": "template-789",
    "subject": "Follow-up from our call"
  }
}
```

**Outcomes:** `sent`, `failed`

### 6. SMS Node

Sends an SMS.

```json
{
  "type": "sms",
  "config": {
    "message": "Thanks for speaking with us today!"
  }
}
```

**Outcomes:** `sent`, `failed`

### 7. END Node

Marks the end of the funnel.

```json
{
  "type": "end",
  "config": {}
}
```

**Outcomes:** `completed`

---

## Worker Management

### Start Workers

```bash
# Start all workers (3 instances)
sudo systemctl start funnel-worker.target

# Start specific worker
sudo systemctl start funnel-worker@1
```

### Check Status

```bash
# Check all workers
sudo systemctl status funnel-worker.target

# Check specific worker
sudo systemctl status funnel-worker@1

# View logs
journalctl -u funnel-worker@1 -f
```

### Scale Horizontally

```bash
# Add 4th worker
sudo systemctl start funnel-worker@4

# Add to target (persist)
sudo nano /etc/systemd/system/funnel-worker.target
# Add: Wants=funnel-worker@4.service
```

### Stop Workers

```bash
# Stop all workers
sudo systemctl stop funnel-worker.target

# Stop specific worker
sudo systemctl stop funnel-worker@1
```

---

## Monitoring

### Queue Statistics

```bash
GET /api/funnels/queue/stats

# Response:
{
  "total_pending": 42,
  "total_processing": 3,
  "total_completed": 1523,
  "total_failed": 8,
  "avg_retry_count": 1.2
}
```

### Database Views

```sql
-- Queue health
SELECT * FROM v_funnel_queue_health;

-- Funnel execution health
SELECT * FROM v_funnel_execution_health;

-- Get queue stats for specific user
SELECT * FROM get_funnel_queue_stats('user-001');

-- Get funnel summary
SELECT * FROM get_funnel_execution_summary('funnel-123');
```

### Cleanup Old Data

```sql
-- Clean up completed queue entries older than 30 days
SELECT cleanup_funnel_queue(30);
```

---

## Retry Strategy

**Exponential Backoff with Jitter (copied from webhook_worker):**

```
Attempt 1: 30s  delay (±3s jitter)
Attempt 2: 60s  delay (±6s jitter)
Attempt 3: 120s delay (±12s jitter)
---
Total: ~210 seconds (3.5 minutes)
Dead letter after 3 attempts (default max_attempts)
```

---

## Multi-Tenant Isolation

**All queries enforce userId filtering:**

```python
# ALWAYS filter by userId
funnel = db.query(Funnel).filter(
    Funnel.id == funnel_id,
    Funnel.user_id == user_id,  # CRITICAL
).first()
```

**Database-level enforcement:**
- All tables have `user_id` foreign key
- All API endpoints check `g.user_id`
- Cascade deletes preserve isolation

---

## Development

### Run Worker Locally

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@localhost:5432/livekit_saas"
export WORKER_POLL_INTERVAL=5
export WORKER_BATCH_SIZE=10
export WORKER_NAME="funnel-worker-dev"

# Run worker
python funnel_worker.py
```

### Testing

```python
from funnel_engine import FunnelExecutor, enqueue_funnel_stage

# Create test execution
execution = create_test_execution()

# Enqueue first stage
enqueue_funnel_stage(
    db=db,
    execution_id=execution.id,
    node_id="node-1",
    user_id=user_id,
    funnel_id=funnel_id,
)

# Process stage manually
executor = FunnelExecutor(db)
outcome = executor.process_stage(
    execution_id=execution.id,
    node_id="node-1",
)
```

---

## Troubleshooting

### Worker Not Processing Stages

```bash
# Check worker is running
sudo systemctl status funnel-worker@1

# Check logs
journalctl -u funnel-worker@1 -n 100

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check queue entries
psql $DATABASE_URL -c "SELECT * FROM funnel_stage_queue WHERE status = 'pending' LIMIT 5"
```

### Stages Stuck in "pending"

```bash
# Check retry times
psql $DATABASE_URL -c "
SELECT id, execution_id, status, attempt_count, next_retry_at
FROM funnel_stage_queue
WHERE status = 'pending'
ORDER BY next_retry_at
LIMIT 10
"

# Reset stuck entries
psql $DATABASE_URL -c "
UPDATE funnel_stage_queue
SET next_retry_at = NOW()
WHERE status = 'pending'
  AND next_retry_at > NOW() + INTERVAL '1 hour'
"
```

### Failed Stages

```bash
# View failed stages
psql $DATABASE_URL -c "
SELECT id, execution_id, node_id, attempt_count, last_error
FROM funnel_stage_queue
WHERE status = 'failed'
  AND attempt_count >= max_attempts
ORDER BY created_at DESC
LIMIT 10
"
```

---

## Performance

### Expected Performance

- **Queue polling:** ~5ms per poll
- **Stage processing:** 50-500ms per stage
- **Throughput:** ~100-200 stages/second (3 workers)
- **Horizontal scaling:** Linear (add more workers)

### Optimization Tips

1. **Index tuning** - Monitor slow queries
2. **Worker count** - Scale based on queue depth
3. **Batch size** - Increase for high throughput
4. **Poll interval** - Decrease for low latency

---

## Security

### API Authentication

All endpoints require authentication via Flask `g.user_id`.

### Database Isolation

All queries filter by `user_id` to prevent cross-tenant access.

### Webhook Signing

For webhook nodes, consider implementing HMAC signing (see webhook_worker/signer.py).

---

## Roadmap

- [ ] A/B testing support (funnel variants)
- [ ] Landing page integration
- [ ] n8n webhook triggers
- [ ] Social automation (LinkedIn, Twitter)
- [ ] Advanced analytics dashboard
- [ ] Funnel templates library

---

## Support

**Documentation:** `/tmp/livekit_analysis/`
**Source:** `/opt/livekit1/backend/funnel_engine/`
**Issues:** Contact development team

---

**Version:** 1.0.0
**Last Updated:** 2025-11-15
**Status:** Production-ready ✅
