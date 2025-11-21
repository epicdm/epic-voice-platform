# Call Outcome Recording System - Technical Design

**Feature**: Call Outcome Recording
**Status**: Design Phase
**Priority**: Critical (P0)
**Estimated Effort**: 1-2 weeks
**Author**: System Architect
**Date**: October 29, 2025

---

## 📋 Executive Summary

Record call completion outcomes for all inbound and outbound calls by implementing a LiveKit webhook listener that captures call lifecycle events, normalizes the data, and persists outcomes to the database for analytics, reporting, and CRM synchronization.

**Current State**: Campaign engine initiates calls but doesn't track completion
**Target State**: Full call lifecycle tracking with outcomes, durations, and metadata
**Business Impact**: Enables ROI measurement, success rate reporting, and CRM sync

---

## 🎯 Requirements

### Functional Requirements
1. ✅ Detect call end events from LiveKit
2. ✅ Persist call outcome + timestamps + metadata
3. ✅ Map campaign → lead → call → outcome
4. ✅ Classify outcomes (success, voicemail, busy, failed, no_answer)
5. ✅ Support both inbound and outbound calls
6. ✅ Multi-tenant data isolation (org_id/user_id scope)
7. ✅ Idempotent event processing
8. ✅ Emit internal events for analytics/CRM

### Non-Functional Requirements
1. ✅ Retry-safe persistence
2. ✅ Minimal schema migration (extend existing tables)
3. ✅ Distributed tracing with trace IDs
4. ✅ Structured logging
5. ✅ <100ms event processing latency (P95)
6. ✅ 99.9% data integrity guarantee

---

## 📊 Entity Relationship Diagram (ERD)

```
┌─────────────────────┐
│      campaigns      │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │
│ name                │
│ status              │
│ ...                 │
└──────────┬──────────┘
           │ 1
           │
           │ N
┌──────────▼──────────┐       ┌─────────────────────┐
│  campaign_calls     │   N   │     call_logs       │
│─────────────────────│◄──────┤─────────────────────│
│ id (PK)             │   1   │ id (PK)             │
│ campaign_id (FK)    │       │ userId (FK)         │
│ lead_id (FK)        │       │ agentConfigId (FK)  │
│ call_log_id (FK) ───┼───────┤ phoneNumber         │
│ agent_id (FK) NEW   │       │ roomName            │
│ status              │       │ durationSeconds     │
│ scheduled_for       │       │ startedAt           │
│ attempted_at        │       │ endedAt             │
│ completed_at        │       │ cost                │
│ call_duration_sec   │       │ direction NEW       │
│ call_outcome        │       │ outcome NEW         │
│ retry_count         │       │ recording_url NEW   │
│ livekit_room_name   │       │ transcript_id NEW   │
│ livekit_part_sid    │       │ metadata NEW (JSONB)│
│ ...                 │       └─────────────────────┘
└──────────┬──────────┘
           │ N
           │
           │ 1
┌──────────▼──────────┐
│       leads         │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)        │
│ campaign_id (FK)    │
│ phone_number        │
│ last_called_at      │
│ last_call_status    │
│ last_call_duration  │
│ times_called        │
│ ...                 │
└─────────────────────┘

┌─────────────────────────────────────┐
│   livekit_call_events (NEW TABLE)   │
│─────────────────────────────────────│
│ id (PK)                              │
│ event_id (UNIQUE) - idempotency key │
│ room_name                            │
│ participant_sid                      │
│ event_type (call.ended, room.ended) │
│ event_payload (JSONB)                │
│ processed (BOOLEAN)                  │
│ processed_at (TIMESTAMP)             │
│ call_log_id (FK) - after processing │
│ created_at                           │
└─────────────────────────────────────┘
```

### Key Relationships
- **campaigns** 1:N **campaign_calls** (one campaign, many calls)
- **leads** 1:N **campaign_calls** (one lead, multiple retry attempts)
- **campaign_calls** N:1 **call_logs** (campaign call links to actual call record)
- **call_logs** 1:1 **livekit_call_events** (one call, one completion event)

---

## 🔄 System Architecture

### High-Level Flow

```
┌──────────────────┐
│ Campaign Engine  │
│  (scheduler)     │
└────────┬─────────┘
         │
         │ 1. Trigger outbound call
         ▼
┌──────────────────┐      2. SIP Call      ┌──────────────────┐
│  LiveKit Cloud   │◄────────────────────►│  PSTN Gateway    │
│  (voice infra)   │                       │ (Magnus Billing) │
└────────┬─────────┘                       └──────────────────┘
         │
         │ 3. Call ends, emit webhook
         ▼
┌──────────────────────────────────────────────────────┐
│          LiveKit Webhook Listener (NEW)              │
│  /api/webhooks/livekit (POST endpoint)               │
│  - Validate HMAC signature                           │
│  - Parse event payload                               │
│  - Normalize event data                              │
│  - Route to processor                                │
└────────┬─────────────────────────────────────────────┘
         │
         │ 4. Process event
         ▼
┌──────────────────────────────────────────────────────┐
│       Call Outcome Processor (NEW)                   │
│  - Idempotency check (event_id)                      │
│  - Extract metadata (duration, outcome, timestamps)  │
│  - Determine call outcome classification             │
│  - Map room_name → campaign_call / call_log          │
└────────┬─────────────────────────────────────────────┘
         │
         │ 5. Persist outcomes
         ▼
┌──────────────────────────────────────────────────────┐
│           Database Updates (Transactional)           │
│  1. Insert livekit_call_events (idempotency)         │
│  2. Update call_logs (endedAt, duration, outcome)    │
│  3. Update campaign_calls (completed_at, outcome)    │
│  4. Update leads (last_called_at, times_called)      │
└────────┬─────────────────────────────────────────────┘
         │
         │ 6. Emit internal events
         ▼
┌──────────────────────────────────────────────────────┐
│       Webhook Event System (existing)                │
│  - Trigger call.completed event                      │
│  - Queue for delivery to user webhooks               │
│  - Publish to analytics pipeline                     │
│  - Trigger CRM sync (future)                         │
└──────────────────────────────────────────────────────┘
```

---

## 📝 Sequence Diagram

### Outbound Call Outcome Recording

```
Campaign      LiveKit      Webhook         Outcome       Database      Event
Engine        Cloud        Listener        Processor                   System
   │             │             │               │             │            │
   │─────────────┤             │               │             │            │
   │ 1. Create   │             │               │             │            │
   │    Call     │             │               │             │            │
   │◄────────────┤             │               │             │            │
   │  room_name  │             │               │             │            │
   │             │             │               │             │            │
   │             │─────────────┤               │             │            │
   │             │ 2. SIP Call │               │             │            │
   │             │   Active    │               │             │            │
   │             │             │               │             │            │
   │             │─ - - - - - -│- - - - - - - -│- - - - - - -│- - - - - -│
   │             │ [Call in progress...]       │             │            │
   │             │             │               │             │            │
   │             │─────────────┤               │             │            │
   │             │ 3. Call End │               │             │            │
   │             │   Webhook   │               │             │            │
   │             │             │───────────────┤             │            │
   │             │             │ 4. Validate   │             │            │
   │             │             │    HMAC       │             │            │
   │             │             │◄──────────────┤             │            │
   │             │             │               │─────────────┤            │
   │             │             │               │ 5. Check    │            │
   │             │             │               │ idempotency │            │
   │             │             │               │◄────────────┤            │
   │             │             │               │             │            │
   │             │             │               │─────────────┤            │
   │             │             │               │ 6. Parse &  │            │
   │             │             │               │  Normalize  │            │
   │             │             │               │◄────────────┤            │
   │             │             │               │             │            │
   │             │             │               │─────────────┤            │
   │             │             │               │ 7. BEGIN TX │            │
   │             │             │               │  - Insert   │            │
   │             │             │               │    event    │            │
   │             │             │               │  - Update   │            │
   │             │             │               │    logs     │            │
   │             │             │               │  - Update   │            │
   │             │             │               │    calls    │            │
   │             │             │               │  - Update   │            │
   │             │             │               │    leads    │            │
   │             │             │               │ COMMIT      │            │
   │             │             │               │◄────────────┤            │
   │             │             │               │             │            │
   │             │             │               │─────────────┬────────────┤
   │             │             │               │ 8. Emit     │ Queue for  │
   │             │             │               │   Events    │ delivery   │
   │             │             │               │◄────────────┴────────────┤
   │             │             │◄──────────────┤             │            │
   │             │             │ 9. 200 OK     │             │            │
   │             │◄────────────┤               │             │            │
   │             │ Ack         │               │             │            │
```

---

## 🗄️ Database Schema Updates

### Migration 008: Call Outcome Recording

```sql
-- ============================================
-- Migration 008: Call Outcome Recording
-- Purpose: Add fields for call outcome tracking
-- ============================================

-- 1. Enhance call_logs table
ALTER TABLE call_logs
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'outbound',
-- Values: 'inbound', 'outbound'

ADD COLUMN IF NOT EXISTS outcome VARCHAR(50),
-- Values: 'answered', 'no_answer', 'busy', 'failed', 'voicemail', 'completed', 'error'

ADD COLUMN IF NOT EXISTS recording_url TEXT,
-- URL to call recording (from LiveKit Egress)

ADD COLUMN IF NOT EXISTS transcript_id TEXT,
-- Reference to transcript storage (future)

ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
-- Flexible field for: agent_response, sentiment, tags, custom_data

-- Indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome ON call_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_call_logs_direction ON call_logs(direction);
CREATE INDEX IF NOT EXISTS idx_call_logs_ended_at ON call_logs("endedAt");

-- 2. Add agent_id to campaign_calls for proper tracking
ALTER TABLE campaign_calls
ADD COLUMN IF NOT EXISTS agent_id TEXT REFERENCES agent_configs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_calls_agent_id ON campaign_calls(agent_id);

-- 3. Create livekit_call_events table for idempotency
CREATE TABLE IF NOT EXISTS livekit_call_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Idempotency Key
    event_id TEXT NOT NULL UNIQUE,
    -- LiveKit provides unique event IDs

    -- Event Details
    room_name VARCHAR(255) NOT NULL,
    participant_sid VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    -- Values: 'participant.disconnected', 'room.finished', 'egress.ended'

    -- Event Payload
    event_payload JSONB NOT NULL,
    -- Store full webhook payload for debugging

    -- Processing Status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,

    -- Link to call_log after processing
    call_log_id TEXT REFERENCES call_logs(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for idempotency and processing
CREATE INDEX IF NOT EXISTS idx_livekit_events_event_id ON livekit_call_events(event_id);
CREATE INDEX IF NOT EXISTS idx_livekit_events_room_name ON livekit_call_events(room_name);
CREATE INDEX IF NOT EXISTS idx_livekit_events_processed ON livekit_call_events(processed);
CREATE INDEX IF NOT EXISTS idx_livekit_events_created_at ON livekit_call_events(created_at);

-- Auto-update timestamp trigger
CREATE TRIGGER update_livekit_call_events_updated_at
    BEFORE UPDATE ON livekit_call_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Add comment for documentation
COMMENT ON TABLE livekit_call_events IS 'Stores LiveKit webhook events for idempotent call outcome processing';
COMMENT ON COLUMN livekit_call_events.event_id IS 'Unique event ID from LiveKit for idempotency';
COMMENT ON COLUMN call_logs.outcome IS 'Call outcome classification: answered, no_answer, busy, failed, voicemail, completed, error';
COMMENT ON COLUMN call_logs.direction IS 'Call direction: inbound or outbound';
```

---

## 🏗️ Component Design

### 1. LiveKit Webhook Listener (`livekit_webhook_listener.py`)

**Purpose**: HTTP endpoint to receive LiveKit webhook events

```python
#!/usr/bin/env python3
"""
LiveKit Webhook Listener
Receives and validates webhook events from LiveKit Cloud
"""

import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional
from flask import Flask, request, jsonify
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class LiveKitWebhookListener:
    """
    Validates and routes LiveKit webhook events
    """

    def __init__(self, webhook_secret: str):
        self.webhook_secret = webhook_secret

    def validate_signature(self, payload: bytes, signature: str) -> bool:
        """
        Validate HMAC signature from LiveKit
        """
        expected = hmac.new(
            self.webhook_secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_event(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse and normalize LiveKit event payload
        """
        event_type = payload.get('event')

        if event_type not in ['participant_left', 'room_finished', 'egress_ended']:
            return None

        return {
            'event_id': payload.get('id'),
            'event_type': event_type,
            'room_name': payload.get('room', {}).get('name'),
            'participant_sid': payload.get('participant', {}).get('sid'),
            'created_at': payload.get('createdAt'),
            'metadata': payload
        }

def create_webhook_endpoint(app: Flask, processor):
    """
    Register LiveKit webhook endpoint with Flask app
    """

    @app.route('/api/webhooks/livekit', methods=['POST'])
    def handle_livekit_webhook():
        """
        POST /api/webhooks/livekit
        Receive LiveKit webhook events
        """
        try:
            # 1. Extract signature
            signature = request.headers.get('X-LiveKit-Signature', '')

            # 2. Validate signature
            listener = LiveKitWebhookListener(
                webhook_secret=app.config['LIVEKIT_WEBHOOK_SECRET']
            )

            if not listener.validate_signature(request.data, signature):
                logger.warning("Invalid webhook signature")
                return jsonify({'error': 'Invalid signature'}), 401

            # 3. Parse event
            payload = request.json
            event = listener.parse_event(payload)

            if not event:
                logger.info(f"Ignoring event type: {payload.get('event')}")
                return jsonify({'status': 'ignored'}), 200

            # 4. Process event (async via queue or direct)
            processor.process_call_outcome(event)

            return jsonify({'status': 'accepted'}), 200

        except Exception as e:
            logger.error(f"Error processing webhook: {e}", exc_info=True)
            return jsonify({'error': 'Internal error'}), 500

    return app
```

### 2. Call Outcome Processor (`call_outcome_processor.py`)

**Purpose**: Process LiveKit events and persist call outcomes

```python
#!/usr/bin/env python3
"""
Call Outcome Processor
Processes call completion events and updates database
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import text
from database import SessionLocal

logger = logging.getLogger(__name__)

class CallOutcomeProcessor:
    """
    Processes call outcome events with idempotency
    """

    def __init__(self):
        self.db = SessionLocal()

    def process_call_outcome(self, event: Dict[str, Any]) -> bool:
        """
        Main entry point for processing call outcomes

        Returns:
            bool: True if processed successfully, False otherwise
        """
        event_id = event.get('event_id')
        room_name = event.get('room_name')

        logger.info(f"Processing call outcome for room: {room_name}, event: {event_id}")

        try:
            # 1. Idempotency check
            if self._is_event_processed(event_id):
                logger.info(f"Event {event_id} already processed, skipping")
                return True

            # 2. Extract call metadata
            call_metadata = self._extract_call_metadata(event)

            # 3. Find associated call_log and campaign_call
            call_log_id = self._find_call_log_by_room(room_name)
            campaign_call_id = self._find_campaign_call_by_room(room_name)

            if not call_log_id:
                logger.warning(f"No call_log found for room: {room_name}")
                # Still record the event for debugging
                self._store_orphan_event(event)
                return False

            # 4. Begin transaction and update all tables
            self._persist_call_outcome(
                event_id=event_id,
                event=event,
                call_log_id=call_log_id,
                campaign_call_id=campaign_call_id,
                metadata=call_metadata
            )

            # 5. Emit internal events
            self._emit_completion_events(
                call_log_id=call_log_id,
                campaign_call_id=campaign_call_id,
                outcome=call_metadata['outcome']
            )

            logger.info(f"✅ Successfully processed call outcome for {room_name}")
            return True

        except Exception as e:
            logger.error(f"Error processing call outcome: {e}", exc_info=True)
            self.db.rollback()
            return False

    def _is_event_processed(self, event_id: str) -> bool:
        """Check if event was already processed"""
        result = self.db.execute(
            text("SELECT 1 FROM livekit_call_events WHERE event_id = :event_id"),
            {'event_id': event_id}
        )
        return result.fetchone() is not None

    def _extract_call_metadata(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize call metadata from event
        """
        metadata = event.get('metadata', {})
        participant = metadata.get('participant', {})
        room = metadata.get('room', {})

        # Calculate duration
        started_at = room.get('creationTime')
        ended_at = event.get('created_at')
        duration_seconds = self._calculate_duration(started_at, ended_at)

        # Determine outcome
        outcome = self._classify_outcome(event)

        return {
            'duration_seconds': duration_seconds,
            'outcome': outcome,
            'started_at': started_at,
            'ended_at': ended_at,
            'participant_sid': participant.get('sid'),
            'disconnect_reason': participant.get('disconnectReason')
        }

    def _classify_outcome(self, event: Dict[str, Any]) -> str:
        """
        Classify call outcome based on event data

        Outcomes:
        - 'completed': Call answered and completed successfully
        - 'no_answer': Call went unanswered
        - 'busy': Called party was busy
        - 'failed': Call failed to connect
        - 'error': System error occurred
        """
        metadata = event.get('metadata', {})
        participant = metadata.get('participant', {})
        disconnect_reason = participant.get('disconnectReason', '').lower()
        duration = self._calculate_duration(
            metadata.get('room', {}).get('creationTime'),
            event.get('created_at')
        )

        # Classification logic
        if 'busy' in disconnect_reason:
            return 'busy'
        elif 'no_answer' in disconnect_reason or duration < 5:
            return 'no_answer'
        elif 'failed' in disconnect_reason or 'error' in disconnect_reason:
            return 'failed'
        elif duration > 10:
            # If call lasted >10s, likely answered
            return 'completed'
        else:
            return 'no_answer'

    def _find_call_log_by_room(self, room_name: str) -> Optional[str]:
        """Find call_log by LiveKit room name"""
        result = self.db.execute(
            text("SELECT id FROM call_logs WHERE \"roomName\" = :room_name LIMIT 1"),
            {'room_name': room_name}
        )
        row = result.fetchone()
        return row[0] if row else None

    def _find_campaign_call_by_room(self, room_name: str) -> Optional[str]:
        """Find campaign_call by LiveKit room name"""
        result = self.db.execute(
            text("""
                SELECT id FROM campaign_calls
                WHERE livekit_room_name = :room_name
                LIMIT 1
            """),
            {'room_name': room_name}
        )
        row = result.fetchone()
        return row[0] if row else None

    def _persist_call_outcome(
        self,
        event_id: str,
        event: Dict[str, Any],
        call_log_id: str,
        campaign_call_id: Optional[str],
        metadata: Dict[str, Any]
    ):
        """
        Persist call outcome to database (transactional)
        """
        try:
            self.db.begin()

            # 1. Insert livekit_call_events (idempotency)
            self.db.execute(text("""
                INSERT INTO livekit_call_events (
                    event_id, room_name, participant_sid, event_type,
                    event_payload, processed, processed_at, call_log_id
                ) VALUES (
                    :event_id, :room_name, :participant_sid, :event_type,
                    :event_payload, true, NOW(), :call_log_id
                )
            """), {
                'event_id': event_id,
                'room_name': event.get('room_name'),
                'participant_sid': metadata.get('participant_sid'),
                'event_type': event.get('event_type'),
                'event_payload': json.dumps(event),
                'call_log_id': call_log_id
            })

            # 2. Update call_logs
            self.db.execute(text("""
                UPDATE call_logs SET
                    "endedAt" = :ended_at,
                    "durationSeconds" = :duration,
                    outcome = :outcome,
                    metadata = :metadata
                WHERE id = :call_log_id
            """), {
                'ended_at': metadata['ended_at'],
                'duration': metadata['duration_seconds'],
                'outcome': metadata['outcome'],
                'metadata': json.dumps(metadata),
                'call_log_id': call_log_id
            })

            # 3. Update campaign_calls (if exists)
            if campaign_call_id:
                self.db.execute(text("""
                    UPDATE campaign_calls SET
                        completed_at = :completed_at,
                        call_duration_seconds = :duration,
                        call_outcome = :outcome,
                        status = 'completed'
                    WHERE id = :campaign_call_id
                """), {
                    'completed_at': metadata['ended_at'],
                    'duration': metadata['duration_seconds'],
                    'outcome': metadata['outcome'],
                    'campaign_call_id': campaign_call_id
                })

                # 4. Update lead (if campaign call)
                self.db.execute(text("""
                    UPDATE leads SET
                        last_called_at = :called_at,
                        times_called = times_called + 1,
                        last_call_status = :outcome,
                        last_call_duration = :duration
                    WHERE id = (
                        SELECT lead_id FROM campaign_calls
                        WHERE id = :campaign_call_id
                    )
                """), {
                    'called_at': metadata['ended_at'],
                    'outcome': metadata['outcome'],
                    'duration': metadata['duration_seconds'],
                    'campaign_call_id': campaign_call_id
                })

            self.db.commit()

        except Exception as e:
            self.db.rollback()
            raise

    def _emit_completion_events(
        self,
        call_log_id: str,
        campaign_call_id: Optional[str],
        outcome: str
    ):
        """
        Emit internal webhook events for analytics and CRM sync
        """
        from webhook_events import trigger_webhook_event

        # Get user_id for webhook routing
        result = self.db.execute(
            text('SELECT "userId" FROM call_logs WHERE id = :id'),
            {'id': call_log_id}
        )
        user_id = result.fetchone()[0]

        # Emit call.completed event
        event_type = f'call.{outcome}'  # call.completed, call.no_answer, etc.

        trigger_webhook_event(event_type, {
            'call_log_id': call_log_id,
            'campaign_call_id': campaign_call_id,
            'outcome': outcome
        }, user_id)

    def _calculate_duration(self, started_at: str, ended_at: str) -> int:
        """Calculate call duration in seconds"""
        if not started_at or not ended_at:
            return 0

        try:
            start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))
            end = datetime.fromisoformat(ended_at.replace('Z', '+00:00'))
            return int((end - start).total_seconds())
        except:
            return 0

    def _store_orphan_event(self, event: Dict[str, Any]):
        """Store event that couldn't be matched to call_log"""
        self.db.execute(text("""
            INSERT INTO livekit_call_events (
                event_id, room_name, event_type, event_payload,
                processed, error_message
            ) VALUES (
                :event_id, :room_name, :event_type, :event_payload,
                false, 'No matching call_log found'
            )
        """), {
            'event_id': event.get('event_id'),
            'room_name': event.get('room_name'),
            'event_type': event.get('event_type'),
            'event_payload': json.dumps(event)
        })
        self.db.commit()
```

### 3. API Endpoint for Retrieving Call Outcomes (`call_outcomes_api.py`)

**Purpose**: REST API for querying call outcomes

```python
#!/usr/bin/env python3
"""
Call Outcomes API
Provides endpoints for querying call outcome data
"""

from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from sqlalchemy import text
from database import SessionLocal
from datetime import datetime, timedelta

call_outcomes_api = Blueprint('call_outcomes', __name__)

@call_outcomes_api.route('/api/user/calls/outcomes', methods=['GET'])
@login_required
def get_call_outcomes():
    """
    GET /api/user/calls/outcomes
    Query call outcomes with filtering

    Query Params:
    - campaign_id: Filter by campaign
    - lead_id: Filter by lead
    - agent_id: Filter by agent
    - outcome: Filter by outcome (completed, no_answer, etc.)
    - start_date: Filter by date range start
    - end_date: Filter by date range end
    - limit: Pagination limit (default 50)
    - offset: Pagination offset (default 0)
    """
    db = SessionLocal()

    try:
        # Extract filters
        campaign_id = request.args.get('campaign_id')
        lead_id = request.args.get('lead_id')
        agent_id = request.args.get('agent_id')
        outcome = request.args.get('outcome')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))

        # Build query
        query = """
            SELECT
                cl.id as call_log_id,
                cl."roomName" as room_name,
                cl."phoneNumber" as phone_number,
                cl."durationSeconds" as duration,
                cl."startedAt" as started_at,
                cl."endedAt" as ended_at,
                cl.outcome,
                cl.direction,
                cl.recording_url,
                cc.id as campaign_call_id,
                cc.campaign_id,
                cc.lead_id,
                cc.agent_id,
                l.name as lead_name,
                l.company as lead_company,
                c.name as campaign_name
            FROM call_logs cl
            LEFT JOIN campaign_calls cc ON cl.id = cc.call_log_id
            LEFT JOIN leads l ON cc.lead_id = l.id
            LEFT JOIN campaigns c ON cc.campaign_id = c.id
            WHERE cl."userId" = :user_id
        """

        params = {'user_id': current_user.id}

        # Apply filters
        if campaign_id:
            query += " AND cc.campaign_id = :campaign_id"
            params['campaign_id'] = campaign_id

        if lead_id:
            query += " AND cc.lead_id = :lead_id"
            params['lead_id'] = lead_id

        if agent_id:
            query += " AND cc.agent_id = :agent_id"
            params['agent_id'] = agent_id

        if outcome:
            query += " AND cl.outcome = :outcome"
            params['outcome'] = outcome

        if start_date:
            query += " AND cl.\"endedAt\" >= :start_date"
            params['start_date'] = start_date

        if end_date:
            query += " AND cl.\"endedAt\" <= :end_date"
            params['end_date'] = end_date

        # Order and paginate
        query += """
            ORDER BY cl."endedAt" DESC
            LIMIT :limit OFFSET :offset
        """
        params['limit'] = limit
        params['offset'] = offset

        # Execute query
        result = db.execute(text(query), params)
        rows = result.fetchall()

        # Format response
        calls = []
        for row in rows:
            calls.append({
                'call_log_id': row.call_log_id,
                'room_name': row.room_name,
                'phone_number': row.phone_number,
                'duration': row.duration,
                'started_at': row.started_at.isoformat() if row.started_at else None,
                'ended_at': row.ended_at.isoformat() if row.ended_at else None,
                'outcome': row.outcome,
                'direction': row.direction,
                'recording_url': row.recording_url,
                'campaign': {
                    'id': row.campaign_id,
                    'name': row.campaign_name
                } if row.campaign_id else None,
                'lead': {
                    'id': row.lead_id,
                    'name': row.lead_name,
                    'company': row.lead_company
                } if row.lead_id else None,
                'agent_id': row.agent_id
            })

        return jsonify({
            'calls': calls,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'total': len(calls)
            }
        }), 200

    except Exception as e:
        logger.error(f"Error fetching call outcomes: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

    finally:
        db.close()


@call_outcomes_api.route('/api/user/calls/outcomes/stats', methods=['GET'])
@login_required
def get_call_outcome_stats():
    """
    GET /api/user/calls/outcomes/stats
    Get aggregated call outcome statistics

    Query Params:
    - campaign_id: Filter by campaign
    - start_date: Date range start
    - end_date: Date range end
    """
    db = SessionLocal()

    try:
        campaign_id = request.args.get('campaign_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Build query
        query = """
            SELECT
                cl.outcome,
                COUNT(*) as count,
                AVG(cl."durationSeconds") as avg_duration,
                SUM(cl."durationSeconds") as total_duration
            FROM call_logs cl
            LEFT JOIN campaign_calls cc ON cl.id = cc.call_log_id
            WHERE cl."userId" = :user_id
            AND cl.outcome IS NOT NULL
        """

        params = {'user_id': current_user.id}

        if campaign_id:
            query += " AND cc.campaign_id = :campaign_id"
            params['campaign_id'] = campaign_id

        if start_date:
            query += " AND cl.\"endedAt\" >= :start_date"
            params['start_date'] = start_date

        if end_date:
            query += " AND cl.\"endedAt\" <= :end_date"
            params['end_date'] = end_date

        query += " GROUP BY cl.outcome"

        result = db.execute(text(query), params)
        rows = result.fetchall()

        # Format response
        stats = {
            'by_outcome': {},
            'totals': {
                'total_calls': 0,
                'total_duration': 0,
                'avg_duration': 0
            }
        }

        total_calls = 0
        total_duration = 0

        for row in rows:
            outcome = row.outcome
            count = row.count
            avg_duration = row.avg_duration or 0
            duration_sum = row.total_duration or 0

            stats['by_outcome'][outcome] = {
                'count': count,
                'avg_duration': round(avg_duration, 2),
                'total_duration': duration_sum
            }

            total_calls += count
            total_duration += duration_sum

        stats['totals']['total_calls'] = total_calls
        stats['totals']['total_duration'] = total_duration
        stats['totals']['avg_duration'] = round(
            total_duration / total_calls, 2
        ) if total_calls > 0 else 0

        return jsonify(stats), 200

    except Exception as e:
        logger.error(f"Error fetching stats: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500

    finally:
        db.close()
```

---

## 📂 Proposed File Structure

```
/opt/livekit1/
│
├── migrations/
│   └── 008_call_outcome_recording.sql        # Database schema updates
│
├── livekit_webhook_listener.py               # NEW: Webhook endpoint
├── call_outcome_processor.py                 # NEW: Event processor
├── call_outcomes_api.py                       # NEW: Query API
│
├── user_dashboard.py                          # UPDATE: Register new endpoints
├── webhook_events.py                          # UPDATE: Add new event types
├── campaign_engine.py                         # UPDATE: Record agent_id
│
└── tests/
    ├── test_call_outcome_processor.py         # NEW: Unit tests
    ├── test_livekit_webhook.py                # NEW: Integration tests
    └── test_call_outcomes_api.py              # NEW: API tests
```

---

## ✅ Implementation Tasks & Subtasks

### Phase 1: Database Schema (1 day)
- [ ] **Task 1.1**: Create migration 008
  - [ ] Subtask: Add direction, outcome, recording_url, transcript_id, metadata to call_logs
  - [ ] Subtask: Add agent_id to campaign_calls
  - [ ] Subtask: Create livekit_call_events table
  - [ ] Subtask: Add indexes for performance
  - [ ] Subtask: Test migration on staging database

### Phase 2: Core Processing Logic (3 days)
- [ ] **Task 2.1**: Implement LiveKit webhook listener
  - [ ] Subtask: Create livekit_webhook_listener.py
  - [ ] Subtask: Implement HMAC signature validation
  - [ ] Subtask: Parse and normalize event payloads
  - [ ] Subtask: Add error handling and logging
  - [ ] Subtask: Register endpoint in user_dashboard.py

- [ ] **Task 2.2**: Implement call outcome processor
  - [ ] Subtask: Create call_outcome_processor.py
  - [ ] Subtask: Implement idempotency check
  - [ ] Subtask: Extract call metadata from events
  - [ ] Subtask: Implement outcome classification logic
  - [ ] Subtask: Implement transactional database updates
  - [ ] Subtask: Add trace IDs and structured logging

- [ ] **Task 2.3**: Update campaign engine
  - [ ] Subtask: Add agent_id parameter to create_call_log
  - [ ] Subtask: Store agent_id in campaign_calls on call creation
  - [ ] Subtask: Add logging for call tracking

### Phase 3: API & Integration (2 days)
- [ ] **Task 3.1**: Implement query API
  - [ ] Subtask: Create call_outcomes_api.py
  - [ ] Subtask: Implement GET /api/user/calls/outcomes
  - [ ] Subtask: Implement GET /api/user/calls/outcomes/stats
  - [ ] Subtask: Add pagination and filtering
  - [ ] Subtask: Register blueprint in user_dashboard.py

- [ ] **Task 3.2**: Integrate with webhook event system
  - [ ] Subtask: Update webhook_events.py with outcome-specific events
  - [ ] Subtask: Emit call.completed, call.no_answer, call.busy events
  - [ ] Subtask: Test webhook delivery to partner endpoints

### Phase 4: Testing (2 days)
- [ ] **Task 4.1**: Unit tests
  - [ ] Subtask: Test outcome classification logic
  - [ ] Subtask: Test idempotency checks
  - [ ] Subtask: Test database transactions
  - [ ] Subtask: Mock LiveKit webhook payloads

- [ ] **Task 4.2**: Integration tests
  - [ ] Subtask: Test end-to-end webhook → database flow
  - [ ] Subtask: Test campaign call outcome recording
  - [ ] Subtask: Test API query endpoints
  - [ ] Subtask: Load testing with 1000 concurrent events

### Phase 5: Deployment & Monitoring (1 day)
- [ ] **Task 5.1**: Configure LiveKit webhook
  - [ ] Subtask: Add webhook URL in LiveKit Cloud dashboard
  - [ ] Subtask: Generate and store LIVEKIT_WEBHOOK_SECRET
  - [ ] Subtask: Test webhook delivery from LiveKit

- [ ] **Task 5.2**: Monitoring & alerting
  - [ ] Subtask: Add Prometheus metrics (events processed, errors)
  - [ ] Subtask: Add dashboard for call outcome tracking
  - [ ] Subtask: Set up alerts for failed event processing
  - [ ] Subtask: Add logging aggregation for debugging

---

## 🧪 Testing Strategy

### Unit Tests
```python
# test_call_outcome_processor.py

def test_classify_outcome_completed():
    event = {
        'metadata': {
            'room': {'creationTime': '2025-10-29T10:00:00Z'},
            'participant': {'disconnectReason': 'user_left'}
        },
        'created_at': '2025-10-29T10:05:30Z'
    }
    outcome = processor._classify_outcome(event)
    assert outcome == 'completed'

def test_classify_outcome_no_answer():
    event = {
        'metadata': {
            'room': {'creationTime': '2025-10-29T10:00:00Z'},
            'participant': {'disconnectReason': 'no_answer'}
        },
        'created_at': '2025-10-29T10:00:03Z'
    }
    outcome = processor._classify_outcome(event)
    assert outcome == 'no_answer'

def test_idempotency():
    # Process event twice, should only update DB once
    event = create_mock_event()
    processor.process_call_outcome(event)
    processor.process_call_outcome(event)  # Should be no-op

    count = db.execute(text(
        "SELECT COUNT(*) FROM livekit_call_events WHERE event_id = :id"
    ), {'id': event['event_id']}).fetchone()[0]

    assert count == 1
```

### Integration Tests
```python
# test_livekit_webhook.py

def test_webhook_endpoint_success():
    # Simulate LiveKit webhook POST
    payload = {
        'id': 'evt_123',
        'event': 'participant_left',
        'room': {'name': 'sip-7678189426__test'},
        'participant': {'sid': 'PA_123'}
    }

    signature = generate_hmac(payload, WEBHOOK_SECRET)

    response = client.post(
        '/api/webhooks/livekit',
        json=payload,
        headers={'X-LiveKit-Signature': signature}
    )

    assert response.status_code == 200

    # Verify DB was updated
    call_log = db.query(CallLog).filter_by(roomName='sip-7678189426__test').first()
    assert call_log.outcome is not None
```

---

## 📊 Success Metrics

### Technical Metrics
- **Event Processing Latency**: <100ms P95
- **Idempotency Success Rate**: 100% (no duplicate processing)
- **Data Integrity**: 99.9% (call outcomes match actual events)
- **Error Rate**: <0.1% of webhook events fail processing

### Business Metrics
- **Call Outcome Visibility**: 100% of calls have recorded outcomes
- **Campaign Success Rate**: Accurate reporting of answered vs missed calls
- **ROI Measurement**: Ability to calculate cost-per-contact and conversion rates
- **CRM Sync**: Automated lead status updates based on call outcomes

---

## 🚀 Deployment Plan

### Pre-Deployment
1. ✅ Apply migration 008 to staging database
2. ✅ Test with synthetic LiveKit webhook events
3. ✅ Verify campaign engine updates work
4. ✅ Run load tests (1000 events/min)

### Deployment
1. ✅ Apply migration to production database (low-risk, adds columns)
2. ✅ Deploy new Python modules to production server
3. ✅ Update user_dashboard.py with new endpoints
4. ✅ Restart Flask application
5. ✅ Configure LiveKit webhook URL in LiveKit Cloud dashboard
6. ✅ Monitor first 100 webhook events

### Post-Deployment
1. ✅ Verify call outcomes are being recorded
2. ✅ Check dashboard metrics for accuracy
3. ✅ Enable webhook delivery to partner endpoints
4. ✅ Monitor error logs for 48 hours

---

## 🔒 Security Considerations

1. **HMAC Signature Validation**: Always validate LiveKit webhook signatures
2. **Input Sanitization**: Validate and sanitize all event payloads
3. **SQL Injection Prevention**: Use parameterized queries (SQLAlchemy text)
4. **Multi-Tenant Isolation**: Always filter by user_id in queries
5. **Sensitive Data**: Don't log full call recordings or transcripts
6. **API Authentication**: Require login for outcome query endpoints
7. **Rate Limiting**: Prevent abuse of webhook endpoint (429 responses)

---

## 📈 Future Enhancements

### Phase 2 (Post-MVP)
1. **Call Recording Integration**: Store recording URLs from LiveKit Egress
2. **Transcript Storage**: Link to transcript_id for searchability
3. **Sentiment Analysis**: Process call transcripts for sentiment scores
4. **Lead Scoring**: Update lead scores based on call outcomes
5. **CRM Sync**: Automatically update HubSpot/Salesforce based on outcomes
6. **Advanced Analytics**: Conversion funnels, A/B testing, agent performance

### Phase 3 (Enterprise)
1. **Real-time Dashboards**: WebSocket streaming of call outcomes
2. **Predictive Dialing**: Optimize call timing based on historical outcomes
3. **Call Quality Scoring**: Analyze audio for quality issues
4. **Multi-Language Support**: Classify outcomes for non-English calls

---

## 📝 Summary

This design provides a complete, production-ready Call Outcome Recording system that:

✅ **Captures** all call lifecycle events from LiveKit
✅ **Normalizes** event data into structured outcomes
✅ **Persists** outcomes with full traceability
✅ **Integrates** with existing campaign and webhook systems
✅ **Exposes** query APIs for analytics and reporting
✅ **Ensures** idempotency and data integrity

**Estimated Timeline**: 1-2 weeks (9 implementation days)
**Risk Level**: Low (extends existing tables, non-breaking changes)
**Business Value**: High (enables ROI measurement and success tracking)

---

**Next Step**: Review design with team → Create implementation tickets → Begin Phase 1 (Database Schema)
