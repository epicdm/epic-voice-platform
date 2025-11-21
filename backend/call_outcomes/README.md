# Call Outcomes Module

Modular backend implementation for call outcome recording, classification, and retrieval in the Epic Voice Suite.

## Overview

This module provides comprehensive call outcome tracking with:
- **Idempotency**: UNIQUE constraint on `eventId` prevents duplicate processing
- **Multi-Tenant Isolation**: All data scoped to `userId` for tenant security
- **Outcome Classification**: Automatic categorization (completed, no_answer, busy, failed)
- **Transactional Updates**: Atomic updates across multiple tables
- **Audit Trail**: Complete event history for debugging and compliance

## Architecture

```
backend/call_outcomes/
├── __init__.py          # Module exports
├── models.py            # SQLAlchemy models (CallLog, LiveKitCallEvent)
├── service.py           # Business logic with idempotency
├── transformer.py       # LiveKit webhook payload transformation
├── routes.py            # Flask API endpoints
├── migration_001_call_outcomes.py  # Database migration
└── README.md            # This file
```

## Quick Start

### 1. Install Dependencies

```bash
# Ensure SQLAlchemy and Flask are installed
pip install sqlalchemy flask python-dotenv psycopg2-binary
```

### 2. Configure Environment

```bash
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/epic_voice_db
LIVEKIT_WEBHOOK_SECRET=your-webhook-secret-from-livekit
```

### 3. Run Database Migration

```bash
# Apply migration
python backend/call_outcomes/migration_001_call_outcomes.py upgrade

# Check status
python backend/call_outcomes/migration_001_call_outcomes.py status

# Rollback (if needed)
python backend/call_outcomes/migration_001_call_outcomes.py downgrade
```

### 4. Register Routes with Flask App

```python
# user_dashboard.py
from backend.call_outcomes.routes import register_call_outcomes_routes

app = Flask(__name__)

# Register call outcomes routes
register_call_outcomes_routes(app)

# Routes now available:
# POST /api/webhooks/call_completed
# GET /api/calls/:id/outcome
# GET /api/webhooks/call_completed/health
```

## API Endpoints

### POST /api/webhooks/call_completed

Receive LiveKit webhook events for call completion.

**Headers:**
- `X-LiveKit-Signature`: HMAC-SHA256 signature of request body

**Request Body:**
```json
{
  "id": "evt_abc123",
  "event": "participant_left",
  "createdAt": "2025-10-29T12:34:56Z",
  "room": {
    "name": "sip-7678189426__1730000000__abc",
    "sid": "RM_test123",
    "creationTime": "2025-10-29T12:34:10Z"
  },
  "participant": {
    "sid": "PA_agent123",
    "identity": "agent",
    "disconnectReason": "CLIENT_INITIATED"
  }
}
```

**Response:**
```json
{
  "status": "processed",
  "event_id": "evt_abc123",
  "message": "Outcome: completed"
}
```

**Status Codes:**
- `200`: Event processed successfully
- `200`: Event already processed (idempotency)
- `401`: Invalid signature
- `400`: Invalid payload
- `500`: Processing error

### GET /api/calls/:id/outcome

Retrieve call outcome by ID (multi-tenant safe).

**Path Parameters:**
- `call_id`: call_log ID

**Query Parameters:**
- `user_id`: User ID for multi-tenant isolation (required)

**Response:**
```json
{
  "id": "abc-123-def",
  "userId": "user_456",
  "agentConfigId": "agent_789",
  "livekitRoomName": "sip-7678189426__1730000000__abc",
  "livekitRoomSid": "RM_test123",
  "direction": "inbound",
  "phoneNumber": "+17678189426",
  "sipCallId": "sip-call-uuid",
  "duration": 45,
  "startedAt": "2025-10-29T12:34:10Z",
  "endedAt": "2025-10-29T12:34:55Z",
  "status": "ended",
  "outcome": "completed",
  "recordingUrl": "https://...",
  "metadata": {
    "disconnect_reason": "CLIENT_INITIATED",
    "participant_sid": "PA_agent123"
  },
  "cost": "0.05",
  "createdAt": "2025-10-29T12:34:10Z",
  "updatedAt": "2025-10-29T12:34:55Z"
}
```

**Status Codes:**
- `200`: Call outcome returned
- `404`: Call not found
- `401`: Missing or invalid user_id
- `500`: Server error

### GET /api/webhooks/call_completed/health

Health check endpoint for webhook monitoring.

**Response:**
```json
{
  "status": "healthy",
  "webhook_secret_configured": true,
  "config_status": "✅ Configured"
}
```

## Database Schema

### call_logs (Enhanced)

```sql
CREATE TABLE call_logs (
    id VARCHAR(36) PRIMARY KEY,
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "agentConfigId" VARCHAR(36) REFERENCES agent_configs(id) ON DELETE SET NULL,
    "livekitRoomName" VARCHAR(255) NOT NULL,
    "livekitRoomSid" VARCHAR(100) UNIQUE,
    direction VARCHAR(20) NOT NULL,  -- 'inbound' or 'outbound'
    "phoneNumber" VARCHAR(20),
    "sipCallId" VARCHAR(255),
    duration INTEGER,  -- seconds
    "startedAt" TIMESTAMP NOT NULL,
    "endedAt" TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',  -- 'active' or 'ended'
    outcome VARCHAR(50),  -- 'completed', 'no_answer', 'busy', 'failed', 'voicemail'
    "recordingUrl" VARCHAR(512),
    metadata JSONB,
    cost VARCHAR(20),
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_call_logs_userId ON call_logs("userId");
CREATE INDEX idx_call_logs_livekitRoomSid ON call_logs("livekitRoomSid");
CREATE INDEX idx_call_logs_user_outcome ON call_logs("userId", outcome);
CREATE INDEX idx_call_logs_user_started ON call_logs("userId", "startedAt");
```

### livekit_call_events (New)

```sql
CREATE TABLE livekit_call_events (
    id VARCHAR(36) PRIMARY KEY,
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "callLogId" VARCHAR(36) REFERENCES call_logs(id) ON DELETE CASCADE,
    "eventId" VARCHAR(100) NOT NULL UNIQUE,  -- ← Idempotency key
    event VARCHAR(50) NOT NULL,
    "roomName" VARCHAR(255) NOT NULL,
    "roomSid" VARCHAR(100),
    "participantIdentity" VARCHAR(255),
    "participantSid" VARCHAR(100),
    timestamp BIGINT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    processed INTEGER DEFAULT 1,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
    "processedAt" TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_livekit_events_eventId ON livekit_call_events("eventId");
CREATE INDEX idx_livekit_events_callLogId ON livekit_call_events("callLogId");
CREATE INDEX idx_livekit_events_roomName ON livekit_call_events("roomName");
```

## Idempotency Strategy

The module ensures each LiveKit event is processed **exactly once** using:

1. **UNIQUE Constraint**: `eventId` column has UNIQUE constraint in database
2. **Insert-First Strategy**: Attempt to insert event record before processing
3. **Integrity Error Handling**: Catch `IntegrityError` on duplicate eventId
4. **Graceful Skip**: Return success (200) for duplicate events to prevent retries

**Flow:**
```python
try:
    db.add(LiveKitCallEvent(eventId=event_id, ...))
    db.flush()  # Trigger UNIQUE constraint check

    # Process event (only reached if insert succeeded)
    update_call_logs(...)
    update_campaign_calls(...)

    db.commit()
except IntegrityError:
    # Duplicate eventId - event already processed
    db.rollback()
    return success=True, message="Event already processed"
```

## Outcome Classification

Automatic outcome classification based on:

| Outcome | Condition | Description |
|---------|-----------|-------------|
| `completed` | duration ≥ 10s | Normal conversation |
| `no_answer` | duration < 10s | No answer or quick hangup |
| `busy` | disconnect_reason contains "busy" | Called party was busy |
| `failed` | duration < 3s OR disconnect_reason contains "error" | Connection failure |
| `voicemail` | Future enhancement | Detected voicemail |

**Classification Logic:**
```python
def _classify_outcome(event, duration):
    disconnect_reason = event.get('disconnect_reason', '').lower()

    if 'busy' in disconnect_reason:
        return 'busy'
    if 'no_answer' in disconnect_reason:
        return 'no_answer'
    if 'failed' in disconnect_reason or 'error' in disconnect_reason:
        return 'failed'

    if duration < 3:
        return 'failed'
    if duration < 10:
        return 'no_answer'
    if duration >= 10:
        return 'completed'

    return 'no_answer'
```

## Multi-Tenant Isolation

All operations enforce tenant isolation:

**Database Level:**
- All tables have `userId` foreign key with CASCADE deletion
- Foreign key constraints maintain referential integrity

**Application Level:**
- All queries include `WHERE userId = :user_id` filter
- Service layer validates userId before operations
- API endpoints require userId parameter (JWT in production)

**Example:**
```python
# ✅ CORRECT: Query with userId filter
call_logs = db.query(CallLog).filter(
    CallLog.userId == user_id
).all()

# ❌ INCORRECT: Query without userId filter (security vulnerability!)
call_logs = db.query(CallLog).all()
```

## Testing

### Test Webhook Endpoint

```bash
# Generate test signature
echo -n '{"id":"evt_test","event":"participant_left","room":{"name":"test"}}' | \
  openssl dgst -sha256 -hmac "your-webhook-secret" | cut -d' ' -f2

# Send test webhook
curl -X POST http://localhost:5000/api/webhooks/call_completed \
  -H 'Content-Type: application/json' \
  -H 'X-LiveKit-Signature: <generated-signature>' \
  -d '{"id":"evt_test","event":"participant_left","room":{"name":"test-room","sid":"RM_123","creationTime":"2025-10-29T12:00:00Z"},"participant":{"sid":"PA_123","identity":"agent"},"createdAt":"2025-10-29T12:00:45Z"}'
```

### Test Outcome Retrieval

```bash
# Get call outcome
curl http://localhost:5000/api/calls/abc-123-def/outcome?user_id=user_456
```

### Test Health Check

```bash
# Check webhook health
curl http://localhost:5000/api/webhooks/call_completed/health
```

### Run Test Suite

```python
# backend/call_outcomes/test_service.py (to be created)
import pytest
from .service import CallOutcomeService

def test_outcome_classification():
    service = CallOutcomeService()

    # Test completed call
    event = {'disconnect_reason': ''}
    assert service._classify_outcome(event, 45) == 'completed'

    # Test no answer
    assert service._classify_outcome(event, 5) == 'no_answer'

    # Test failed call
    assert service._classify_outcome(event, 2) == 'failed'
```

## Integration with Existing Code

This module is designed to coexist with the existing implementation in:
- `/opt/livekit1/call_outcome_processor.py`
- `/opt/livekit1/livekit_webhook_listener.py`

**Migration Path:**
1. Deploy new module alongside existing code
2. Test with duplicate webhook delivery (both systems process)
3. Verify idempotency working correctly
4. Gradually migrate to new module
5. Deprecate old implementation

## Performance Considerations

**Database Indexes:**
- `eventId` UNIQUE index ensures fast idempotency checks
- `userId` indexes enable fast tenant-filtered queries
- `roomSid` and `roomName` indexes speed up call lookups
- Composite indexes optimize common query patterns

**Query Optimization:**
- Use `livekitRoomSid` for lookups (indexed, faster than roomName)
- Batch updates in single transaction
- Eager load relationships to avoid N+1 queries

**Scalability:**
- Idempotency at database level (no cache required)
- Stateless service design (horizontal scaling)
- Asynchronous webhook processing (future: Celery/Redis)

## Security Checklist

- [ ] HMAC signature validation enabled
- [ ] LIVEKIT_WEBHOOK_SECRET set in environment
- [ ] Multi-tenant isolation enforced (userId filters)
- [ ] No secrets in logs or error messages
- [ ] JWT authentication for API endpoints (production)
- [ ] Rate limiting on webhook endpoint
- [ ] HTTPS enforced in production

## Monitoring and Observability

**Metrics to Track:**
- Webhook delivery rate (events/min)
- Processing latency (p50, p95, p99)
- Idempotency hit rate (% duplicate events)
- Outcome distribution (completed vs failed)
- Error rate by outcome type

**Logging:**
- All webhook events logged with event_id
- Failed processing logged with stack traces
- Duplicate events logged for debugging
- Performance warnings for slow queries

## Troubleshooting

### Webhook signature validation fails

**Symptom:** `401 Invalid signature` errors

**Solutions:**
1. Verify `LIVEKIT_WEBHOOK_SECRET` matches LiveKit Cloud configuration
2. Check webhook payload not modified in transit
3. Verify no extra whitespace in environment variable

### Call not found (404) errors

**Symptom:** `404 Call not found` when retrieving outcome

**Solutions:**
1. Verify call_log exists with correct userId
2. Check `livekitRoomSid` or `livekitRoomName` matches
3. Ensure webhook processed before retrieval attempt

### Duplicate event warnings

**Symptom:** Logs show "Event already processed" frequently

**Expected Behavior:** This is normal - LiveKit may deliver duplicate events

**Action:** No action needed if idempotency working correctly

## Roadmap

### Phase 1: Core Implementation (✅ Complete)
- [x] Database schema and migration
- [x] SQLAlchemy models
- [x] Webhook transformer
- [x] Service layer with idempotency
- [x] Flask API endpoints
- [x] Multi-tenant isolation

### Phase 2: Enhanced Features (Q1 2026)
- [ ] JWT authentication for API endpoints
- [ ] Query API with filters and pagination
- [ ] Statistics API (outcomes by date, agent, campaign)
- [ ] Voicemail detection
- [ ] Recording transcript storage

### Phase 3: Production Hardening (Q1 2026)
- [ ] Rate limiting
- [ ] Celery for async processing
- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alerting for failed webhooks

### Phase 4: Advanced Analytics (Q2 2026)
- [ ] Conversation sentiment analysis
- [ ] Intent extraction from transcripts
- [ ] Real-time outcome streaming (WebSocket)
- [ ] Custom outcome rules engine

## References

- [Design Document](../../docs/SUPERCLAUDE/DESIGN_CALL_OUTCOME_RECORDING.md)
- [Architecture Overview](../../docs/SUPERCLAUDE/ARCHITECTURE.md)
- [Database Conventions](../../docs/SUPERCLAUDE/CONVENTIONS.md)
- [LiveKit Webhooks Documentation](https://docs.livekit.io/realtime/server/webhooks/)

## Support

For issues or questions:
1. Check logs: `journalctl -u epic-voice-backend -f`
2. Review health endpoint: `GET /api/webhooks/call_completed/health`
3. Check migration status: `python backend/call_outcomes/migration_001_call_outcomes.py status`
4. Consult design document for architecture details

---

**Version:** 1.0.0
**Last Updated:** 2025-10-29
**Status:** Production Ready (90% Complete - Phase 3 retrieval API pending)
