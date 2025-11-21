# Call Outcome Recording System Design

**Feature**: Call Outcome Recording
**Version**: 1.0
**Last Updated**: 2025-10-29
**Status**: 90% Complete (Phases 1-3)

---

## 1. Overview

### Purpose
The Call Outcome Recording system captures, classifies, and stores the results of voice interactions (both inbound and outbound calls) in the Epic Voice Suite. It provides automated outcome classification, comprehensive call history, and campaign analytics through real-time webhook processing.

### Key Requirements
- **Real-time Processing**: Capture call outcomes as LiveKit sessions end
- **Multi-Tenant Isolation**: All data scoped to `userId` for tenant security
- **Idempotency**: Prevent duplicate outcome processing for the same event
- **Outcome Classification**: Automatic categorization (completed, no_answer, busy, failed, voicemail)
- **Campaign Integration**: Link outcomes to campaign calls and update lead status
- **Retrieval API**: Query interface for call history and outcome statistics
- **Audit Trail**: Complete event history for debugging and compliance

---

## 2. Entity Relationship Diagram (ERD)

### Core Tables

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MULTI-TENANT ARCHITECTURE                        │
│                   (All tables filtered by userId scope)                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐
│     users        │  (Tenant root)
├──────────────────┤
│ id (PK)          │
│ email            │
│ name             │
│ createdAt        │
└────────┬─────────┘
         │
         │ (userId FK - CASCADE)
         │
    ┌────┴──────────────────────────────────────────────────┐
    │                                                        │
    │                                                        │
┌───▼──────────────────┐                        ┌───────────▼──────────┐
│   agent_configs      │                        │      campaigns       │
├──────────────────────┤                        ├──────────────────────┤
│ id (PK)              │                        │ id (PK)              │
│ userId (FK)          │                        │ userId (FK)          │
│ name                 │                        │ name                 │
│ instructions         │                        │ agentConfigId (FK)   │───┐
│ llmModel             │                        │ status               │   │
│ voiceId              │                        │ totalLeads           │   │
│ createdAt            │                        │ completedCalls       │   │
└────────┬─────────────┘                        │ createdAt            │   │
         │                                      └──────────┬───────────┘   │
         │                                                 │               │
         │ (agentConfigId FK - SET NULL)                  │               │
         │                                                 │               │
         │                                    ┌────────────▼───────────┐   │
         │                                    │        leads           │   │
         │                                    ├────────────────────────┤   │
         │                                    │ id (PK)                │   │
         │                                    │ userId (FK)            │   │
         │                                    │ campaignId (FK)        │   │
         │                                    │ phoneNumber            │   │
         │                                    │ status                 │   │
         │                                    │ attempts               │   │
         │                                    │ lastCallOutcome        │   │
         │                                    │ createdAt              │   │
         │                                    └──────────┬─────────────┘   │
         │                                               │                 │
         │                                               │                 │
         │ (agentConfigId FK - SET NULL)                 │                 │
         │                                               │                 │
    ┌────▼─────────────────────────────┐                │                 │
    │         call_logs                │                │                 │
    ├──────────────────────────────────┤                │                 │
    │ id (PK)                          │                │                 │
    │ userId (FK)                      │                │                 │
    │ agentConfigId (FK)               │◄───────────────┘                 │
    │ livekitRoomName                  │                                  │
    │ livekitRoomSid                   │                                  │
    │ direction (inbound/outbound)     │                                  │
    │ phoneNumber                      │                                  │
    │ sipCallId                        │                                  │
    │ duration                         │                                  │
    │ status (active/ended)            │                                  │
    │ outcome (completed/no_answer/...) │                                 │
    │ startedAt                        │                                  │
    │ endedAt                          │                                  │
    │ createdAt                        │                                  │
    │ updatedAt                        │                                  │
    └────────┬─────────────────────────┘                                  │
             │                                                             │
             │                                                             │
             │ (callLogId FK - CASCADE)                                   │
             │                                                             │
    ┌────────▼─────────────────────────┐                                  │
    │   livekit_call_events            │                                  │
    ├──────────────────────────────────┤                                  │
    │ id (PK)                          │                                  │
    │ userId (FK)                      │                                  │
    │ callLogId (FK)                   │                                  │
    │ eventId (UNIQUE)                 │  ◄─── Idempotency key            │
    │ event (participant_joined/left)  │                                  │
    │ roomName                         │                                  │
    │ roomSid                          │                                  │
    │ participantIdentity             │                                  │
    │ participantSid                   │                                  │
    │ timestamp                        │                                  │
    │ rawPayload (JSONB)               │                                  │
    │ createdAt                        │                                  │
    └──────────────────────────────────┘                                  │
                                                                           │
    ┌──────────────────────────────────┐                                  │
    │      campaign_calls              │                                  │
    ├──────────────────────────────────┤                                  │
    │ id (PK)                          │                                  │
    │ userId (FK)                      │                                  │
    │ campaignId (FK)                  │◄─────────────────────────────────┘
    │ leadId (FK)                      │
    │ callLogId (FK)                   │◄──── Links outcome to campaign
    │ status (pending/completed/failed)│
    │ scheduledAt                      │
    │ attemptedAt                      │
    │ completedAt                      │
    │ outcome                          │
    │ createdAt                        │
    └──────────────────────────────────┘
```

### Relationship Summary

| Relationship | Type | On Delete | Description |
|-------------|------|-----------|-------------|
| `users` → `agent_configs` | 1:N | CASCADE | User owns agent configurations |
| `users` → `campaigns` | 1:N | CASCADE | User owns campaigns |
| `users` → `leads` | 1:N | CASCADE | User owns leads |
| `users` → `call_logs` | 1:N | CASCADE | User owns call logs |
| `users` → `livekit_call_events` | 1:N | CASCADE | User owns call events |
| `users` → `campaign_calls` | 1:N | CASCADE | User owns campaign calls |
| `agent_configs` → `call_logs` | 1:N | SET NULL | Call references agent config (optional) |
| `agent_configs` → `campaigns` | 1:N | SET NULL | Campaign references agent config (optional) |
| `campaigns` → `leads` | 1:N | CASCADE | Campaign owns leads |
| `campaigns` → `campaign_calls` | 1:N | CASCADE | Campaign owns campaign calls |
| `leads` → `campaign_calls` | 1:N | CASCADE | Lead tracks call attempts |
| `call_logs` → `livekit_call_events` | 1:N | CASCADE | Call has multiple events |
| `call_logs` → `campaign_calls` | 1:1 | SET NULL | Campaign call links to call log |

### Multi-Tenant Isolation

**All tables enforce tenant isolation via `userId` foreign key:**

```sql
-- Example: Queries MUST include userId filter
SELECT * FROM call_logs
WHERE userId = :current_user_id
  AND outcome = 'completed';

-- Foreign keys enforce cascade deletion
ALTER TABLE call_logs
  ADD CONSTRAINT call_logs_userId_fkey
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;
```

---

## 3. Event Flow Architecture

### 3.1 Inbound Call Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        INBOUND CALL EVENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

1. PSTN Call Arrives
   │
   ├─► Magnus Billing SIP Gateway
   │   └─► Receives call on purchased DID
   │       (e.g., +17678189426)
   │
2. Magnus → LiveKit SIP Trunk
   │
   ├─► POST to LiveKit SIP API
   │   URL: https://cloud.livekit.io/sip/dispatch
   │   Body: {
   │     "trunk_id": "TR_xxx",
   │     "from": "+15551234567",
   │     "to": "+17678189426",
   │     "call_id": "sip-call-uuid"
   │   }
   │
3. LiveKit Creates Room
   │
   ├─► Room Name: "sip-7678189426__timestamp__random"
   │   └─► DID embedded in room prefix for routing
   │
4. LiveKit Agent Joins
   │
   ├─► Agent Runtime (agents/tst0002/agent.py)
   │   └─► Entrypoint: prewarm_process()
   │       └─► Extract DID from room name
   │           └─► Query agent_configs via db_config.py
   │               └─► Load configuration for this DID
   │
5. Voice Interaction
   │
   ├─► Voice Pipeline Active
   │   ├─► STT (Deepgram): User speech → text
   │   ├─► LLM (OpenAI): Generate response
   │   └─► TTS (Cartesia): Text → speech
   │
6. Call Ends (User hangs up or agent ends)
   │
   ├─► LiveKit Room Closes
   │   └─► Triggers "participant_left" event
   │
7. LiveKit Webhook Fired
   │
   ├─► POST to https://epicvoice.ai/api/livekit/webhook
   │   Headers: {
   │     "Authorization": "Bearer <api_key>",
   │     "X-LiveKit-Signature": "<hmac_sha256>"
   │   }
   │   Body: {
   │     "event": "participant_left",
   │     "id": "event_unique_id",  ◄─── Idempotency key
   │     "createdAt": 1730000000,
   │     "room": {
   │       "name": "sip-7678189426__123__abc",
   │       "sid": "RM_xxx"
   │     },
   │     "participant": {
   │       "identity": "agent",
   │       "sid": "PA_xxx"
   │     }
   │   }
   │
8. Webhook Processing (user_dashboard.py)
   │
   ├─► Validate HMAC signature
   │   └─► If invalid: return 401 Unauthorized
   │
   ├─► Check event idempotency
   │   └─► Query livekit_call_events WHERE eventId = event.id
   │       └─► If exists: return 200 OK (already processed)
   │
   ├─► Extract DID from room name
   │   └─► Parse "sip-7678189426__" → DID = +17678189426
   │
   ├─► Lookup userId via phone_number_pool
   │   └─► SELECT userId FROM phone_number_pool WHERE phoneNumber = '+17678189426'
   │
   ├─► Lookup call_logs record
   │   └─► SELECT * FROM call_logs
   │       WHERE userId = :userId
   │         AND livekitRoomSid = :room_sid
   │         AND status = 'active'
   │
9. Transactional Database Updates
   │
   ├─► BEGIN TRANSACTION
   │   │
   │   ├─► INSERT INTO livekit_call_events
   │   │   (id, userId, callLogId, eventId, event, roomName, roomSid,
   │   │    participantIdentity, participantSid, timestamp, rawPayload)
   │   │   VALUES (...)
   │   │   ◄─── eventId UNIQUE constraint ensures idempotency
   │   │
   │   ├─► UPDATE call_logs SET
   │   │   status = 'ended',
   │   │   endedAt = NOW(),
   │   │   duration = EXTRACT(EPOCH FROM (NOW() - startedAt)),
   │   │   outcome = 'completed',  ◄─── Default outcome
   │   │   updatedAt = NOW()
   │   │   WHERE id = :call_log_id
   │   │
   │   └─► COMMIT TRANSACTION
   │
10. Response
    │
    └─► Return 200 OK to LiveKit
        └─► Webhook acknowledged successfully

┌─────────────────────────────────────────────────────────────────────────┐
│                     OUTCOME CLASSIFICATION LOGIC                         │
└─────────────────────────────────────────────────────────────────────────┘

Outcome determined by:
1. **completed**: participant_left event received AND duration > 10 seconds
2. **no_answer**: No participant_joined event within 30 seconds
3. **busy**: SIP error code 486 in webhook payload
4. **failed**: SIP error codes 400-499, 500-599
5. **voicemail**: Duration > 30s AND no agent speech detected (future)

Current implementation: All calls default to "completed" on participant_left.
Enhanced classification: Phase 2 (Q1 2026) - TBD
```

### 3.2 Outbound Call Flow (Campaign)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       OUTBOUND CALL EVENT FLOW                           │
└─────────────────────────────────────────────────────────────────────────┘

1. Campaign Started by User
   │
   ├─► POST /api/user/campaigns/:id/start
   │   └─► UPDATE campaigns SET status = 'active'
   │
2. Campaign Engine Polling (campaign_engine.py)
   │
   ├─► Every 30 seconds:
   │   └─► SELECT * FROM campaigns WHERE status = 'active'
   │       └─► For each active campaign:
   │           └─► SELECT * FROM leads
   │               WHERE campaignId = :campaign_id
   │                 AND status = 'pending'
   │                 AND attempts < 3
   │               LIMIT 5  ◄─── Concurrent call limit
   │
3. Create Outbound Call via LiveKit API
   │
   ├─► For each lead:
   │   │
   │   ├─► Generate room name: "campaign-{campaign_id}__lead-{lead_id}__timestamp"
   │   │
   │   ├─► POST https://cloud.livekit.io/sip/outbound
   │   │   Headers: {
   │   │     "Authorization": "ApiKey <key>:<secret>"
   │   │   }
   │   │   Body: {
   │   │     "trunk_id": "TR_outbound_xxx",
   │   │     "number": "+15551234567",  ◄─── Lead phone number
   │   │     "room_name": "campaign-C123__lead-L456__1730000000",
   │   │     "participant_identity": "agent",
   │   │     "play_ringtone": true
   │   │   }
   │   │
   │   ├─► LiveKit Response:
   │   │   {
   │   │     "sip_call_id": "call-uuid",
   │   │     "room_name": "campaign-C123__lead-L456__1730000000",
   │   │     "participant_sid": "PA_xxx"
   │   │   }
   │   │
   │   └─► Database Updates:
   │       │
   │       ├─► INSERT INTO call_logs
   │       │   (id, userId, agentConfigId, livekitRoomName, direction,
   │       │    phoneNumber, sipCallId, status, startedAt)
   │       │   VALUES (
   │       │     uuid(), :user_id, :agent_config_id,
   │       │     'campaign-C123__lead-L456__1730000000', 'outbound',
   │       │     '+15551234567', 'call-uuid', 'active', NOW()
   │       │   )
   │       │
   │       ├─► INSERT INTO campaign_calls
   │       │   (id, userId, campaignId, leadId, callLogId, status, attemptedAt)
   │       │   VALUES (uuid(), :user_id, :campaign_id, :lead_id, :call_log_id, 'pending', NOW())
   │       │
   │       └─► UPDATE leads SET
   │           attempts = attempts + 1,
   │           status = 'calling'
   │           WHERE id = :lead_id
   │
4. LiveKit Agent Joins Room
   │
   ├─► Agent Runtime (agents/tst0002/agent.py)
   │   └─► Parse room name: "campaign-C123__lead-L456__1730000000"
   │       └─► Extract campaign_id = "C123"
   │           └─► Query campaigns table
   │               └─► Load agentConfigId
   │                   └─► Load agent configuration via db_config.py
   │
5. Voice Interaction (same as inbound)
   │
6. Call Ends
   │
   ├─► LiveKit Room Closes
   │   └─► Triggers "participant_left" event
   │
7. LiveKit Webhook Fired
   │
   ├─► POST to https://epicvoice.ai/api/livekit/webhook
   │   Body: {
   │     "event": "participant_left",
   │     "id": "event_unique_id",
   │     "room": {
   │       "name": "campaign-C123__lead-L456__1730000000",
   │       "sid": "RM_xxx"
   │     },
   │     "participant": {
   │       "identity": "agent",
   │       "sid": "PA_xxx"
   │     }
   │   }
   │
8. Webhook Processing (user_dashboard.py)
   │
   ├─► Validate HMAC signature
   ├─► Check idempotency (eventId in livekit_call_events)
   ├─► Parse room name → Extract campaign_id, lead_id
   │
9. Transactional Database Updates
   │
   ├─► BEGIN TRANSACTION
   │   │
   │   ├─► INSERT INTO livekit_call_events (same as inbound)
   │   │
   │   ├─► UPDATE call_logs SET
   │   │   status = 'ended',
   │   │   endedAt = NOW(),
   │   │   duration = EXTRACT(EPOCH FROM (NOW() - startedAt)),
   │   │   outcome = 'completed',
   │   │   updatedAt = NOW()
   │   │   WHERE livekitRoomSid = :room_sid
   │   │
   │   ├─► UPDATE campaign_calls SET
   │   │   status = 'completed',
   │   │   completedAt = NOW(),
   │   │   outcome = 'completed'
   │   │   WHERE callLogId = :call_log_id
   │   │
   │   ├─► UPDATE leads SET
   │   │   status = 'completed',
   │   │   lastCallOutcome = 'completed'
   │   │   WHERE id = :lead_id
   │   │
   │   ├─► UPDATE campaigns SET
   │   │   completedCalls = completedCalls + 1
   │   │   WHERE id = :campaign_id
   │   │
   │   └─► COMMIT TRANSACTION
   │
10. Campaign Engine Continues
    │
    └─► Next polling cycle (30s):
        └─► Fetch next batch of pending leads
            └─► Repeat process until all leads attempted
```

---

## 4. Idempotency Implementation

### Problem Statement
LiveKit webhooks may be delivered multiple times due to:
- Network retries (LiveKit retries failed webhook deliveries)
- Duplicate events (race conditions in LiveKit's event system)
- Replay attacks (malicious duplicate submissions)

**Requirement**: Process each unique event exactly once, even if delivered multiple times.

### Solution: Event ID Unique Constraint

#### Database Schema
```sql
CREATE TABLE livekit_call_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callLogId TEXT REFERENCES call_logs(id) ON DELETE CASCADE,

    -- Idempotency key
    eventId TEXT NOT NULL UNIQUE,  ◄─── UNIQUE constraint enforces idempotency

    event TEXT NOT NULL,  -- participant_joined, participant_left, etc.
    roomName TEXT NOT NULL,
    roomSid TEXT NOT NULL,
    participantIdentity TEXT,
    participantSid TEXT,
    timestamp BIGINT NOT NULL,
    rawPayload JSONB NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index for fast lookups
CREATE INDEX idx_livekit_call_events_eventId ON livekit_call_events(eventId);
CREATE INDEX idx_livekit_call_events_callLogId ON livekit_call_events(callLogId);
CREATE INDEX idx_livekit_call_events_roomSid ON livekit_call_events(roomSid);
```

#### Implementation Pattern

```python
# user_dashboard.py - Webhook handler

@app.route('/api/livekit/webhook', methods=['POST'])
def livekit_webhook():
    """
    Process LiveKit webhooks with idempotency protection.

    Idempotency Strategy:
    1. Extract event.id from webhook payload
    2. Attempt to insert into livekit_call_events with eventId = event.id
    3. If UNIQUE constraint violation: event already processed, return 200 OK
    4. If insert succeeds: process event and update call_logs
    """

    # 1. Validate HMAC signature
    signature = request.headers.get('X-LiveKit-Signature')
    if not validate_livekit_signature(signature, request.data):
        return jsonify({'error': 'Invalid signature'}), 401

    # 2. Parse webhook payload
    payload = request.json
    event_id = payload.get('id')  # ◄─── Unique event identifier from LiveKit
    event_type = payload.get('event')
    room = payload.get('room', {})
    participant = payload.get('participant', {})

    # 3. Extract routing information
    room_name = room.get('name')
    room_sid = room.get('sid')

    # 4. Determine userId from room name
    user_id = extract_user_id_from_room(room_name)
    if not user_id:
        return jsonify({'error': 'Unable to determine userId'}), 400

    # 5. Find associated call_logs record
    call_log = db.session.query(CallLog).filter_by(
        userId=user_id,
        livekitRoomSid=room_sid,
        status='active'
    ).first()

    if not call_log:
        # Call log not found - may be delayed webhook or unknown room
        logger.warning(f"No active call_log found for room {room_sid}")
        return jsonify({'status': 'no_call_log'}), 200

    # 6. Attempt to insert event record (idempotency check)
    try:
        db.session.begin_nested()  # Savepoint for rollback

        event_record = LiveKitCallEvent(
            id=str(uuid.uuid4()),
            userId=user_id,
            callLogId=call_log.id,
            eventId=event_id,  # ◄─── UNIQUE constraint on this column
            event=event_type,
            roomName=room_name,
            roomSid=room_sid,
            participantIdentity=participant.get('identity'),
            participantSid=participant.get('sid'),
            timestamp=payload.get('createdAt'),
            rawPayload=payload
        )

        db.session.add(event_record)
        db.session.commit()  # Commit savepoint

    except IntegrityError as e:
        # UNIQUE constraint violation on eventId
        db.session.rollback()
        logger.info(f"Duplicate event {event_id} - already processed")
        return jsonify({'status': 'duplicate', 'eventId': event_id}), 200

    # 7. Process event (only reached if insert succeeded)
    if event_type == 'participant_left' and participant.get('identity') == 'agent':
        # Agent left room - call ended

        # Calculate duration
        duration = None
        if call_log.startedAt:
            duration = int((datetime.utcnow() - call_log.startedAt).total_seconds())

        # Classify outcome
        outcome = classify_outcome(event_type, duration, payload)

        # Update call_logs
        call_log.status = 'ended'
        call_log.endedAt = datetime.utcnow()
        call_log.duration = duration
        call_log.outcome = outcome
        call_log.updatedAt = datetime.utcnow()

        # If campaign call, update campaign_calls and leads
        if call_log.direction == 'outbound':
            campaign_call = db.session.query(CampaignCall).filter_by(
                callLogId=call_log.id
            ).first()

            if campaign_call:
                campaign_call.status = 'completed'
                campaign_call.completedAt = datetime.utcnow()
                campaign_call.outcome = outcome

                # Update lead
                lead = db.session.query(Lead).filter_by(
                    id=campaign_call.leadId
                ).first()

                if lead:
                    lead.status = 'completed' if outcome == 'completed' else 'failed'
                    lead.lastCallOutcome = outcome

                # Update campaign statistics
                campaign = db.session.query(Campaign).filter_by(
                    id=campaign_call.campaignId
                ).first()

                if campaign:
                    campaign.completedCalls = campaign.completedCalls + 1

        db.session.commit()

    return jsonify({'status': 'processed', 'eventId': event_id}), 200


def classify_outcome(event_type: str, duration: int, payload: dict) -> str:
    """
    Classify call outcome based on event and duration.

    Current implementation (Phase 1):
    - All participant_left events → 'completed'

    Enhanced implementation (Phase 2 - Q1 2026):
    - duration > 10s → 'completed'
    - duration <= 10s → 'no_answer'
    - SIP error 486 → 'busy'
    - SIP errors 400-499, 500-599 → 'failed'
    - duration > 30s AND no agent speech → 'voicemail'
    """

    # Phase 1: Simple classification
    if event_type == 'participant_left':
        return 'completed'

    return 'unknown'
```

### Idempotency Guarantees

| Scenario | Behavior | Result |
|----------|----------|--------|
| First delivery | Event inserted, call_logs updated | HTTP 200, status: processed |
| Duplicate delivery (immediate) | UNIQUE constraint violation | HTTP 200, status: duplicate |
| Duplicate delivery (delayed) | UNIQUE constraint violation | HTTP 200, status: duplicate |
| Replay attack (same eventId) | UNIQUE constraint violation | HTTP 200, status: duplicate |
| Different event (new eventId) | Event inserted, processed | HTTP 200, status: processed |

**Key Properties**:
- **At-most-once processing**: Each event processed zero or one time, never more
- **Automatic deduplication**: Database enforces uniqueness, no application logic needed
- **Race condition safe**: UNIQUE constraint atomic at database level
- **Audit trail preserved**: All event attempts logged (successful inserts only)

---

## 5. Retrieval API Design

### 5.1 Query Call Outcomes

**Endpoint**: `GET /api/user/calls/outcomes`

**Purpose**: Retrieve call history with outcome filtering for a specific user.

**Authentication**: Bearer token (JWT) with `userId` claim

**Multi-Tenant Isolation**: All queries scoped to `userId` from JWT token

#### Request Parameters

```typescript
interface CallOutcomeQueryParams {
  // Pagination
  page?: number;          // Default: 1
  limit?: number;         // Default: 20, Max: 100

  // Filters
  outcome?: 'completed' | 'no_answer' | 'busy' | 'failed' | 'voicemail';
  direction?: 'inbound' | 'outbound';
  agentConfigId?: string;
  campaignId?: string;
  phoneNumber?: string;

  // Date Range
  startDate?: string;     // ISO 8601 format (e.g., "2025-10-01T00:00:00Z")
  endDate?: string;       // ISO 8601 format

  // Sorting
  sortBy?: 'startedAt' | 'endedAt' | 'duration' | 'outcome';
  sortOrder?: 'asc' | 'desc';  // Default: desc
}
```

#### Response Format

```typescript
interface CallOutcomeResponse {
  data: CallOutcome[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CallOutcome {
  id: string;
  livekitRoomName: string;
  livekitRoomSid: string;
  direction: 'inbound' | 'outbound';
  phoneNumber: string;
  sipCallId: string;
  duration: number;        // Seconds
  outcome: 'completed' | 'no_answer' | 'busy' | 'failed' | 'voicemail';
  startedAt: string;       // ISO 8601
  endedAt: string;         // ISO 8601
  agentConfig: {
    id: string;
    name: string;
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
  lead: {
    id: string;
    phoneNumber: string;
  } | null;
}
```

#### Implementation

```python
@app.route('/api/user/calls/outcomes', methods=['GET'])
@jwt_required
def get_call_outcomes():
    """
    Retrieve call outcomes with filtering and pagination.

    Multi-tenant isolation: Queries filtered by userId from JWT token.
    """

    # 1. Extract userId from JWT token
    user_id = get_jwt_identity()

    # 2. Parse query parameters
    page = request.args.get('page', 1, type=int)
    limit = min(request.args.get('limit', 20, type=int), 100)

    outcome_filter = request.args.get('outcome')
    direction_filter = request.args.get('direction')
    agent_config_id = request.args.get('agentConfigId')
    campaign_id = request.args.get('campaignId')
    phone_number = request.args.get('phoneNumber')

    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    sort_by = request.args.get('sortBy', 'startedAt')
    sort_order = request.args.get('sortOrder', 'desc')

    # 3. Build base query with userId filter (multi-tenant isolation)
    query = db.session.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.status == 'ended'  # Only completed calls
    )

    # 4. Apply filters
    if outcome_filter:
        query = query.filter(CallLog.outcome == outcome_filter)

    if direction_filter:
        query = query.filter(CallLog.direction == direction_filter)

    if agent_config_id:
        query = query.filter(CallLog.agentConfigId == agent_config_id)

    if phone_number:
        query = query.filter(CallLog.phoneNumber == phone_number)

    if start_date:
        query = query.filter(CallLog.startedAt >= parse_iso_date(start_date))

    if end_date:
        query = query.filter(CallLog.endedAt <= parse_iso_date(end_date))

    # 5. Apply campaign filter (requires join)
    if campaign_id:
        query = query.join(CampaignCall, CallLog.id == CampaignCall.callLogId)
        query = query.filter(CampaignCall.campaignId == campaign_id)

    # 6. Apply sorting
    sort_column = getattr(CallLog, sort_by, CallLog.startedAt)
    if sort_order == 'desc':
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # 7. Get total count (before pagination)
    total = query.count()

    # 8. Apply pagination
    offset = (page - 1) * limit
    results = query.offset(offset).limit(limit).all()

    # 9. Format response
    data = []
    for call_log in results:
        # Load relationships
        agent_config = None
        if call_log.agentConfigId:
            agent_config = db.session.query(AgentConfig).filter_by(
                id=call_log.agentConfigId
            ).first()

        campaign = None
        lead = None
        campaign_call = db.session.query(CampaignCall).filter_by(
            callLogId=call_log.id
        ).first()

        if campaign_call:
            campaign = db.session.query(Campaign).filter_by(
                id=campaign_call.campaignId
            ).first()
            lead = db.session.query(Lead).filter_by(
                id=campaign_call.leadId
            ).first()

        data.append({
            'id': call_log.id,
            'livekitRoomName': call_log.livekitRoomName,
            'livekitRoomSid': call_log.livekitRoomSid,
            'direction': call_log.direction,
            'phoneNumber': call_log.phoneNumber,
            'sipCallId': call_log.sipCallId,
            'duration': call_log.duration,
            'outcome': call_log.outcome,
            'startedAt': call_log.startedAt.isoformat(),
            'endedAt': call_log.endedAt.isoformat() if call_log.endedAt else None,
            'agentConfig': {
                'id': agent_config.id,
                'name': agent_config.name
            } if agent_config else None,
            'campaign': {
                'id': campaign.id,
                'name': campaign.name
            } if campaign else None,
            'lead': {
                'id': lead.id,
                'phoneNumber': lead.phoneNumber
            } if lead else None
        })

    return jsonify({
        'data': data,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': (total + limit - 1) // limit
        }
    }), 200
```

### 5.2 Query Call Outcome Statistics

**Endpoint**: `GET /api/user/calls/outcomes/stats`

**Purpose**: Retrieve aggregated outcome statistics for analytics and dashboards.

**Authentication**: Bearer token (JWT) with `userId` claim

#### Request Parameters

```typescript
interface CallOutcomeStatsParams {
  // Time Range
  startDate?: string;     // ISO 8601 format
  endDate?: string;       // ISO 8601 format

  // Grouping
  groupBy?: 'outcome' | 'direction' | 'agentConfig' | 'campaign' | 'day' | 'week' | 'month';

  // Filters
  campaignId?: string;
  agentConfigId?: string;
}
```

#### Response Format

```typescript
interface CallOutcomeStatsResponse {
  summary: {
    totalCalls: number;
    totalDuration: number;     // Total seconds
    averageDuration: number;   // Average seconds
    outcomes: {
      completed: number;
      no_answer: number;
      busy: number;
      failed: number;
      voicemail: number;
    };
  };
  groups?: Array<{
    key: string;             // Group key (e.g., "completed", "2025-10-29")
    count: number;
    totalDuration: number;
    averageDuration: number;
  }>;
}
```

#### Implementation

```python
@app.route('/api/user/calls/outcomes/stats', methods=['GET'])
@jwt_required
def get_call_outcome_stats():
    """
    Retrieve aggregated call outcome statistics.

    Multi-tenant isolation: Statistics scoped to userId from JWT token.
    """

    # 1. Extract userId from JWT token
    user_id = get_jwt_identity()

    # 2. Parse query parameters
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    group_by = request.args.get('groupBy')
    campaign_id = request.args.get('campaignId')
    agent_config_id = request.args.get('agentConfigId')

    # 3. Build base query with userId filter
    query = db.session.query(CallLog).filter(
        CallLog.userId == user_id,
        CallLog.status == 'ended'
    )

    # 4. Apply filters
    if start_date:
        query = query.filter(CallLog.startedAt >= parse_iso_date(start_date))

    if end_date:
        query = query.filter(CallLog.endedAt <= parse_iso_date(end_date))

    if agent_config_id:
        query = query.filter(CallLog.agentConfigId == agent_config_id)

    if campaign_id:
        query = query.join(CampaignCall, CallLog.id == CampaignCall.callLogId)
        query = query.filter(CampaignCall.campaignId == campaign_id)

    # 5. Calculate summary statistics
    calls = query.all()

    total_calls = len(calls)
    total_duration = sum(call.duration for call in calls if call.duration)
    average_duration = total_duration / total_calls if total_calls > 0 else 0

    outcome_counts = {
        'completed': sum(1 for call in calls if call.outcome == 'completed'),
        'no_answer': sum(1 for call in calls if call.outcome == 'no_answer'),
        'busy': sum(1 for call in calls if call.outcome == 'busy'),
        'failed': sum(1 for call in calls if call.outcome == 'failed'),
        'voicemail': sum(1 for call in calls if call.outcome == 'voicemail')
    }

    summary = {
        'totalCalls': total_calls,
        'totalDuration': int(total_duration),
        'averageDuration': int(average_duration),
        'outcomes': outcome_counts
    }

    # 6. Calculate grouped statistics (if requested)
    groups = None
    if group_by:
        groups = calculate_groups(calls, group_by)

    return jsonify({
        'summary': summary,
        'groups': groups
    }), 200


def calculate_groups(calls: List[CallLog], group_by: str) -> List[dict]:
    """
    Group call statistics by specified dimension.
    """

    from collections import defaultdict

    groups_data = defaultdict(lambda: {'count': 0, 'total_duration': 0})

    for call in calls:
        # Determine group key
        if group_by == 'outcome':
            key = call.outcome
        elif group_by == 'direction':
            key = call.direction
        elif group_by == 'agentConfig':
            key = call.agentConfigId or 'none'
        elif group_by == 'day':
            key = call.startedAt.strftime('%Y-%m-%d')
        elif group_by == 'week':
            key = call.startedAt.strftime('%Y-W%U')
        elif group_by == 'month':
            key = call.startedAt.strftime('%Y-%m')
        else:
            key = 'unknown'

        # Aggregate statistics
        groups_data[key]['count'] += 1
        if call.duration:
            groups_data[key]['total_duration'] += call.duration

    # Format response
    result = []
    for key, data in groups_data.items():
        avg_duration = data['total_duration'] / data['count'] if data['count'] > 0 else 0
        result.append({
            'key': key,
            'count': data['count'],
            'totalDuration': int(data['total_duration']),
            'averageDuration': int(avg_duration)
        })

    # Sort by count (descending)
    result.sort(key=lambda x: x['count'], reverse=True)

    return result
```

### 5.3 Get Single Call Outcome Details

**Endpoint**: `GET /api/user/calls/outcomes/:id`

**Purpose**: Retrieve detailed information for a single call, including all events.

**Authentication**: Bearer token (JWT) with `userId` claim

#### Response Format

```typescript
interface CallOutcomeDetailResponse {
  call: {
    id: string;
    livekitRoomName: string;
    livekitRoomSid: string;
    direction: 'inbound' | 'outbound';
    phoneNumber: string;
    sipCallId: string;
    duration: number;
    outcome: string;
    startedAt: string;
    endedAt: string;
    agentConfig: {
      id: string;
      name: string;
      instructions: string;
      llmModel: string;
      voiceId: string;
    } | null;
    campaign: {
      id: string;
      name: string;
    } | null;
    lead: {
      id: string;
      phoneNumber: string;
      status: string;
    } | null;
  };
  events: Array<{
    id: string;
    event: string;
    participantIdentity: string;
    participantSid: string;
    timestamp: number;
    createdAt: string;
  }>;
}
```

#### Implementation

```python
@app.route('/api/user/calls/outcomes/<call_id>', methods=['GET'])
@jwt_required
def get_call_outcome_detail(call_id: str):
    """
    Retrieve detailed call outcome information with event history.

    Multi-tenant isolation: Verify call belongs to userId from JWT token.
    """

    # 1. Extract userId from JWT token
    user_id = get_jwt_identity()

    # 2. Query call_logs with userId filter (multi-tenant isolation)
    call_log = db.session.query(CallLog).filter_by(
        id=call_id,
        userId=user_id  # ◄─── Enforce tenant isolation
    ).first()

    if not call_log:
        return jsonify({'error': 'Call not found'}), 404

    # 3. Load related entities
    agent_config = None
    if call_log.agentConfigId:
        agent_config = db.session.query(AgentConfig).filter_by(
            id=call_log.agentConfigId
        ).first()

    campaign = None
    lead = None
    campaign_call = db.session.query(CampaignCall).filter_by(
        callLogId=call_log.id
    ).first()

    if campaign_call:
        campaign = db.session.query(Campaign).filter_by(
            id=campaign_call.campaignId
        ).first()
        lead = db.session.query(Lead).filter_by(
            id=campaign_call.leadId
        ).first()

    # 4. Load all events for this call
    events = db.session.query(LiveKitCallEvent).filter_by(
        callLogId=call_log.id
    ).order_by(LiveKitCallEvent.timestamp.asc()).all()

    # 5. Format response
    return jsonify({
        'call': {
            'id': call_log.id,
            'livekitRoomName': call_log.livekitRoomName,
            'livekitRoomSid': call_log.livekitRoomSid,
            'direction': call_log.direction,
            'phoneNumber': call_log.phoneNumber,
            'sipCallId': call_log.sipCallId,
            'duration': call_log.duration,
            'outcome': call_log.outcome,
            'startedAt': call_log.startedAt.isoformat(),
            'endedAt': call_log.endedAt.isoformat() if call_log.endedAt else None,
            'agentConfig': {
                'id': agent_config.id,
                'name': agent_config.name,
                'instructions': agent_config.instructions,
                'llmModel': agent_config.llmModel,
                'voiceId': agent_config.voiceId
            } if agent_config else None,
            'campaign': {
                'id': campaign.id,
                'name': campaign.name
            } if campaign else None,
            'lead': {
                'id': lead.id,
                'phoneNumber': lead.phoneNumber,
                'status': lead.status
            } if lead else None
        },
        'events': [
            {
                'id': event.id,
                'event': event.event,
                'participantIdentity': event.participantIdentity,
                'participantSid': event.participantSid,
                'timestamp': event.timestamp,
                'createdAt': event.createdAt.isoformat()
            }
            for event in events
        ]
    }), 200
```

---

## 6. Security Considerations

### 6.1 Multi-Tenant Data Isolation

**Enforcement Layers**:

1. **Database Layer**: All tables include `userId` foreign key with CASCADE deletion
2. **Application Layer**: All queries include `WHERE userId = :current_user_id` filter
3. **API Layer**: JWT token extraction provides `userId` for all requests
4. **Foreign Key Layer**: Relationships enforce referential integrity per tenant

**Security Rules**:

```python
# ✅ CORRECT: Query with userId filter
call_logs = db.session.query(CallLog).filter_by(
    userId=get_jwt_identity()
).all()

# ❌ INCORRECT: Query without userId filter (security vulnerability!)
call_logs = db.session.query(CallLog).all()

# ✅ CORRECT: Verify ownership before returning detail
call_log = db.session.query(CallLog).filter_by(
    id=call_id,
    userId=get_jwt_identity()
).first()

# ❌ INCORRECT: Return without ownership verification
call_log = db.session.query(CallLog).filter_by(id=call_id).first()
```

### 6.2 Webhook Authentication

**HMAC-SHA256 Signature Validation**:

```python
import hmac
import hashlib

def validate_livekit_signature(signature: str, payload: bytes) -> bool:
    """
    Validate LiveKit webhook signature using HMAC-SHA256.

    LiveKit sends signature in X-LiveKit-Signature header:
    - Format: "sha256=<hex_digest>"
    - Key: API secret from LIVEKIT_API_SECRET environment variable
    """

    # 1. Extract expected signature from header
    if not signature or not signature.startswith('sha256='):
        return False

    expected_signature = signature.replace('sha256=', '')

    # 2. Calculate actual signature
    secret = os.getenv('LIVEKIT_API_SECRET').encode('utf-8')
    actual_signature = hmac.new(
        secret,
        payload,
        hashlib.sha256
    ).hexdigest()

    # 3. Constant-time comparison (prevents timing attacks)
    return hmac.compare_digest(expected_signature, actual_signature)
```

**Security Properties**:
- **Authentication**: Verifies webhook originated from LiveKit
- **Integrity**: Ensures payload not tampered with in transit
- **Replay protection**: Combined with idempotency (eventId uniqueness)

### 6.3 API Rate Limiting

**Recommended Configuration**:

```python
from flask_limiter import Limiter

limiter = Limiter(
    app,
    key_func=lambda: get_jwt_identity(),  # Rate limit per user
    default_limits=["100 per hour"]
)

# Apply stricter limits to outcome queries
@app.route('/api/user/calls/outcomes', methods=['GET'])
@limiter.limit("60 per hour")
@jwt_required
def get_call_outcomes():
    # ...
```

---

## 7. Performance Optimization

### 7.1 Database Indexes

**Required Indexes** (already exist in schema):

```sql
-- call_logs indexes
CREATE INDEX idx_call_logs_userId ON call_logs(userId);
CREATE INDEX idx_call_logs_userId_status ON call_logs(userId, status);
CREATE INDEX idx_call_logs_livekitRoomSid ON call_logs(livekitRoomSid);
CREATE INDEX idx_call_logs_outcome ON call_logs(outcome);
CREATE INDEX idx_call_logs_startedAt ON call_logs(startedAt);

-- livekit_call_events indexes
CREATE UNIQUE INDEX idx_livekit_call_events_eventId ON livekit_call_events(eventId);
CREATE INDEX idx_livekit_call_events_callLogId ON livekit_call_events(callLogId);
CREATE INDEX idx_livekit_call_events_roomSid ON livekit_call_events(roomSid);

-- campaign_calls indexes
CREATE INDEX idx_campaign_calls_campaignId ON campaign_calls(campaignId);
CREATE INDEX idx_campaign_calls_leadId ON campaign_calls(leadId);
CREATE INDEX idx_campaign_calls_callLogId ON campaign_calls(callLogId);
```

### 7.2 Query Optimization

**Avoid N+1 Queries**:

```python
# ❌ BAD: N+1 query problem
calls = db.session.query(CallLog).filter_by(userId=user_id).all()
for call in calls:
    agent_config = db.session.query(AgentConfig).filter_by(
        id=call.agentConfigId
    ).first()  # ◄─── Separate query for each call!

# ✅ GOOD: Use eager loading
from sqlalchemy.orm import joinedload

calls = db.session.query(CallLog).filter_by(userId=user_id).options(
    joinedload(CallLog.agent_config),
    joinedload(CallLog.campaign_calls).joinedload(CampaignCall.campaign),
    joinedload(CallLog.campaign_calls).joinedload(CampaignCall.lead)
).all()
```

### 7.3 Caching Strategy

**Redis Cache for Statistics**:

```python
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

@app.route('/api/user/calls/outcomes/stats', methods=['GET'])
@jwt_required
def get_call_outcome_stats():
    user_id = get_jwt_identity()

    # Cache key includes filters for proper invalidation
    cache_key = f"stats:{user_id}:{request.query_string.decode()}"

    # Check cache first
    cached_result = redis_client.get(cache_key)
    if cached_result:
        return jsonify(json.loads(cached_result)), 200

    # Calculate statistics (expensive operation)
    result = calculate_statistics(user_id, request.args)

    # Cache for 5 minutes
    redis_client.setex(cache_key, 300, json.dumps(result))

    return jsonify(result), 200
```

**Cache Invalidation**:
- **TTL-based**: Statistics cached for 5 minutes (balance freshness vs load)
- **Event-based**: Invalidate `stats:*` keys on new call outcome processed
- **User-scoped**: Separate cache keys per user (multi-tenant isolation)

---

## 8. Testing Strategy

### 8.1 Unit Tests

```python
# tests/test_call_outcomes.py

def test_webhook_idempotency(db_session):
    """Test that duplicate webhooks are handled idempotently"""

    # Create test call_log
    call_log = CallLog(
        id=str(uuid.uuid4()),
        userId='user_123',
        livekitRoomSid='RM_test',
        status='active'
    )
    db_session.add(call_log)
    db_session.commit()

    # First webhook delivery
    payload = {
        'id': 'event_unique_123',
        'event': 'participant_left',
        'room': {'sid': 'RM_test'}
    }

    response1 = client.post('/api/livekit/webhook', json=payload)
    assert response1.status_code == 200

    # Verify event recorded
    event = db_session.query(LiveKitCallEvent).filter_by(
        eventId='event_unique_123'
    ).first()
    assert event is not None

    # Second webhook delivery (duplicate)
    response2 = client.post('/api/livekit/webhook', json=payload)
    assert response2.status_code == 200
    assert response2.json['status'] == 'duplicate'

    # Verify only one event recorded
    event_count = db_session.query(LiveKitCallEvent).filter_by(
        eventId='event_unique_123'
    ).count()
    assert event_count == 1


def test_multi_tenant_isolation(db_session):
    """Test that users cannot access other users' call outcomes"""

    # Create calls for two different users
    call_user1 = CallLog(id='call_1', userId='user_1', status='ended')
    call_user2 = CallLog(id='call_2', userId='user_2', status='ended')
    db_session.add_all([call_user1, call_user2])
    db_session.commit()

    # User 1 queries outcomes
    with client.session_transaction() as sess:
        sess['user_id'] = 'user_1'

    response = client.get('/api/user/calls/outcomes')
    assert response.status_code == 200

    call_ids = [call['id'] for call in response.json['data']]
    assert 'call_1' in call_ids
    assert 'call_2' not in call_ids  # ◄─── Cannot see other user's calls
```

### 8.2 Integration Tests

```python
# tests/integration/test_call_flow.py

@pytest.mark.asyncio
async def test_complete_inbound_call_flow(livekit_client, db_session):
    """Test complete inbound call flow from SIP to outcome recording"""

    # 1. Simulate inbound SIP call via LiveKit API
    room = await livekit_client.create_sip_inbound(
        trunk_id='TR_test',
        from_number='+15551234567',
        to_number='+17678189426'
    )

    # 2. Wait for agent to join
    await asyncio.sleep(2)

    # 3. Simulate voice interaction
    await room.send_participant_speech("Hello, I need help")
    await asyncio.sleep(1)

    # 4. End call
    await room.disconnect()

    # 5. Wait for webhook processing
    await asyncio.sleep(1)

    # 6. Verify call_logs record created
    call_log = db_session.query(CallLog).filter_by(
        livekitRoomSid=room.sid
    ).first()

    assert call_log is not None
    assert call_log.direction == 'inbound'
    assert call_log.phoneNumber == '+15551234567'
    assert call_log.status == 'ended'
    assert call_log.outcome == 'completed'
    assert call_log.duration > 0

    # 7. Verify event recorded
    events = db_session.query(LiveKitCallEvent).filter_by(
        callLogId=call_log.id
    ).all()

    assert len(events) > 0
    assert any(e.event == 'participant_left' for e in events)
```

---

## 9. Deployment Checklist

### Phase 1: Database Migration (✅ Complete)
- [x] Create `call_logs` table with indexes
- [x] Create `livekit_call_events` table with eventId UNIQUE constraint
- [x] Create `campaign_calls` table linking campaigns to outcomes
- [x] Add foreign keys with proper CASCADE/SET NULL behavior
- [x] Test migration rollback

### Phase 2: Core Processing Logic (✅ Complete)
- [x] Implement webhook handler with HMAC validation
- [x] Implement idempotency check using eventId
- [x] Implement outcome classification logic
- [x] Implement transactional updates (call_logs, campaign_calls, leads, campaigns)
- [x] Add error handling and logging
- [x] Test duplicate webhook handling

### Phase 3: Retrieval API (⏳ In Progress - 90%)
- [x] Implement GET /api/user/calls/outcomes with filters
- [x] Implement GET /api/user/calls/outcomes/stats
- [x] Implement GET /api/user/calls/outcomes/:id
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Add rate limiting
- [ ] Performance testing with 10K+ calls

### Phase 4: Monitoring & Observability (Planned - Q1 2026)
- [ ] Add Prometheus metrics (outcome_total, processing_duration)
- [ ] Add Grafana dashboards for outcome trends
- [ ] Add alerting for failed webhook processing
- [ ] Add Sentry error tracking integration

---

## 10. Future Enhancements

### Enhanced Outcome Classification (Q1 2026)
- Integrate with LLM to analyze conversation transcripts
- Detect sentiment (positive, neutral, negative)
- Extract conversation intent (question, complaint, booking, etc.)
- Classify voicemail detection using silence analysis

### Real-Time Analytics (Q1 2026)
- WebSocket API for live outcome updates
- Real-time dashboard showing active calls and outcomes
- Live campaign progress tracking

### Webhook Retry Logic (Q2 2026)
- Store failed webhook deliveries in dead letter queue
- Implement exponential backoff retry mechanism
- Admin interface to manually replay failed webhooks

### Advanced Reporting (Q2 2026)
- Export call outcomes to CSV/Excel
- Custom report builder with drag-drop filters
- Scheduled email reports for campaign outcomes

---

## 11. References

### Related Documentation
- `docs/SUPERCLAUDE/ARCHITECTURE.md` - System architecture overview
- `docs/SUPERCLAUDE/CONVENTIONS.md` - Database and API conventions
- `CALL_OUTCOME_PHASE1_COMPLETE.md` - Phase 1 migration details
- `CALL_OUTCOME_PHASE2_COMPLETE.md` - Phase 2 webhook processing
- `CALL_OUTCOME_PHASE3_PROGRESS.md` - Phase 3 API implementation status

### External Resources
- [LiveKit Webhooks Documentation](https://docs.livekit.io/realtime/server/webhooks/)
- [LiveKit SIP Documentation](https://docs.livekit.io/sip/)
- [SQLAlchemy ORM Documentation](https://docs.sqlalchemy.org/en/20/)
- [Flask-JWT-Extended Documentation](https://flask-jwt-extended.readthedocs.io/)

---

**Document Status**: Phase 1-3 complete (90%), Phase 4-5 planned for Q1-Q2 2026
**Last Review**: 2025-10-29
**Next Review**: Q1 2026 (before Phase 4 implementation)
