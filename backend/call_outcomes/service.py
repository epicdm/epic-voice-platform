"""
Call Outcome Service Layer

Business logic for call outcome recording with idempotency protection.

Responsibilities:
- Process normalized webhook events
- Idempotency checking via eventId UNIQUE constraint
- Outcome classification logic
- Transactional database updates across multiple tables
- Multi-tenant data isolation enforcement

Multi-Tenant: All operations scoped to userId for tenant security
"""

import logging
import uuid
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from sqlalchemy import text

from database import SessionLocal
from .models import CallLog, LiveKitCallEvent
from .transformer import LiveKitWebhookTransformer

logger = logging.getLogger(__name__)


class CallOutcomeService:
    """
    Service layer for call outcome processing.

    Features:
    - Idempotency via eventId UNIQUE constraint
    - Automatic outcome classification
    - Transactional updates (call_logs, livekit_call_events, campaign_calls, leads)
    - Multi-tenant isolation
    """

    def __init__(self):
        """Initialize call outcome service"""
        self.transformer = LiveKitWebhookTransformer()
        logger.info("Call outcome service initialized")

    def process_webhook_event(self, event: Dict[str, Any], db_session=None) -> Tuple[bool, str]:
        """
        Main entry point for processing LiveKit webhook events.

        Args:
            event: Normalized event dict from transformer
            db_session: Optional database session (for testing)

        Returns:
            Tuple[success: bool, message: str]

        Process Flow:
        1. Idempotency check (eventId UNIQUE constraint)
        2. Lookup userId via room name
        3. Find associated call_log
        4. Extract call metadata and classify outcome
        5. Transactional database updates
        """
        event_id = event.get('event_id')
        room_name = event.get('room_name')

        logger.info(f"📞 Processing webhook event {event_id} for room {room_name}")

        db = db_session if db_session else SessionLocal()
        should_close_db = db_session is None  # Only close if we created it

        try:
            # 1. Idempotency check - attempt to insert event record
            # Use savepoint to prevent IntegrityError from poisoning main transaction
            user_id, call_log_id = self._resolve_call_context(db, event)

            if not user_id or not call_log_id:
                logger.warning(f"⚠️  Could not resolve call context for room {room_name}")
                return False, "Call context not found"

            # Create savepoint for idempotency check
            savepoint = db.begin_nested()
            try:
                # Create event record (idempotency via UNIQUE constraint)
                event_record = LiveKitCallEvent(
                    id=str(uuid.uuid4()),
                    userId=user_id,
                    callLogId=call_log_id,
                    eventId=event_id,
                    event=event.get('event_type'),
                    roomName=room_name,
                    roomSid=event.get('room_sid'),
                    participantIdentity=event.get('participant_identity'),
                    participantSid=event.get('participant_sid'),
                    timestamp=self._parse_timestamp(event.get('created_at')),
                    rawPayload=event.get('raw_payload', {}),
                    processed=1,
                    processedAt=datetime.utcnow()
                )

                db.add(event_record)
                db.flush()  # Trigger UNIQUE constraint check
                savepoint.commit()  # Commit savepoint if no constraint violation

            except IntegrityError as e:
                # UNIQUE constraint violation on eventId - event already processed
                # Rollback just the savepoint, not the main transaction
                savepoint.rollback()
                logger.info(f"⏭️  Event {event_id} already processed (idempotency), skipping")
                return True, "Event already processed"

            # 2. Extract call metadata and classify outcome
            metadata = self._extract_call_metadata(event)

            # 3. Update call_log with outcome
            self._update_call_log(db, call_log_id, metadata)

            # 4. Update campaign_calls and leads (if campaign call)
            campaign_call_id = self._find_campaign_call(db, call_log_id)
            if campaign_call_id:
                self._update_campaign_call(db, campaign_call_id, metadata)
                self._update_lead(db, campaign_call_id, metadata)

            # 5. Commit transaction (only if we own the session)
            if should_close_db:
                db.commit()
            else:
                # Test mode: flush changes but don't commit (let test fixture handle transaction)
                db.flush()

            logger.info(f"✅ Successfully processed event {event_id} - Outcome: {metadata['outcome']}")
            return True, f"Outcome: {metadata['outcome']}"

        except Exception as e:
            if should_close_db:
                db.rollback()
            # Don't rollback if test provided the session - let test fixture handle it
            logger.error(f"❌ Error processing event {event_id}: {e}", exc_info=True)
            return False, str(e)

        finally:
            if should_close_db:
                db.close()

    def _resolve_call_context(self, db, event: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
        """
        Resolve userId and call_log_id from event.

        Lookup Strategy:
        1. Query call_logs by livekitRoomSid (fastest)
        2. Query call_logs by roomName (fallback)

        Args:
            db: Database session
            event: Normalized event dict

        Returns:
            Tuple[userId, call_log_id] or (None, None)
        """
        room_sid = event.get('room_sid')
        room_name = event.get('room_name')

        try:
            # Try lookup by room SID first (indexed, fastest)
            if room_sid:
                call_log = db.query(CallLog).filter(
                    CallLog.livekitRoomSid == room_sid
                ).first()

                if call_log:
                    logger.info(f"✅ Found call_log by room SID: {room_sid}")
                    return call_log.userId, call_log.id

            # Fallback: lookup by room name
            if room_name:
                logger.info(f"🔍 Looking up call_log by room name: {room_name}")
                call_log = db.query(CallLog).filter(
                    CallLog.livekitRoomName == room_name
                ).first()

                if call_log:
                    logger.info(f"✅ Found call_log by room name: {room_name} -> {call_log.id}")
                    return call_log.userId, call_log.id
                else:
                    # Debug: show what room names exist in DB
                    recent_rooms = db.query(CallLog.livekitRoomName).order_by(CallLog.createdAt.desc()).limit(5).all()
                    logger.warning(f"❌ No match for '{room_name}'. Recent rooms: {[r[0] for r in recent_rooms]}")

            logger.warning(f"⚠️  No call_log found for room: {room_name}")
            return None, None

        except Exception as e:
            logger.error(f"Error resolving call context: {e}", exc_info=True)
            return None, None

    def _extract_call_metadata(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize call metadata from event.

        Args:
            event: Normalized event dict

        Returns:
            Dict with duration, outcome, timestamps, disconnect_reason
        """
        # Calculate duration
        room_creation_time = event.get('room_creation_time')
        event_created = event.get('created_at')

        duration_seconds = self.transformer.calculate_duration(
            room_creation_time, event_created
        )

        # Classify outcome
        outcome = self._classify_outcome(event, duration_seconds)

        # Parse timestamps
        started_at = self._parse_datetime(room_creation_time)
        ended_at = self._parse_datetime(event_created)

        return {
            'duration_seconds': duration_seconds,
            'outcome': outcome,
            'started_at': started_at,
            'ended_at': ended_at,
            'disconnect_reason': event.get('disconnect_reason'),
            'participant_sid': event.get('participant_sid'),
            'recording_url': event.get('recording_url')
        }

    def _classify_outcome(self, event: Dict[str, Any], duration: int) -> str:
        """
        Classify call outcome based on event data and duration.

        Outcome Categories:
        - 'completed': Call answered and conversation occurred (≥10s)
        - 'no_answer': Call went unanswered (<10s or no_answer reason)
        - 'busy': Called party was busy
        - 'failed': Call failed to connect or system error (<3s)
        - 'voicemail': Detected voicemail (future enhancement)

        Args:
            event: Normalized event dict
            duration: Call duration in seconds

        Returns:
            Outcome classification string
        """
        disconnect_reason = event.get('disconnect_reason', '').lower()

        # Check disconnect reason first (most reliable)
        if 'busy' in disconnect_reason:
            return 'busy'

        if 'no_answer' in disconnect_reason or 'no answer' in disconnect_reason:
            return 'no_answer'

        if 'failed' in disconnect_reason or 'error' in disconnect_reason:
            return 'failed'

        # Duration-based classification
        if duration < 3:
            # Very short call - likely failed to connect
            return 'failed'

        if duration < 10:
            # Short call - likely no answer or quick hangup
            return 'no_answer'

        if duration >= 10:
            # Reasonable conversation duration - mark as completed
            return 'completed'

        # Default fallback
        return 'no_answer'

    def _update_call_log(self, db, call_log_id: str, metadata: Dict[str, Any]):
        """
        Update call_log with outcome and timestamps.

        Args:
            db: Database session
            call_log_id: call_log ID
            metadata: Extracted call metadata
        """
        call_log = db.query(CallLog).filter(CallLog.id == call_log_id).first()

        if not call_log:
            raise ValueError(f"call_log {call_log_id} not found")

        # Update fields
        call_log.status = 'ended'
        call_log.endedAt = metadata['ended_at']
        call_log.duration = metadata['duration_seconds']
        call_log.outcome = metadata['outcome']
        call_log.recordingUrl = metadata.get('recording_url')
        call_log.call_metadata = {
            'disconnect_reason': metadata.get('disconnect_reason'),
            'participant_sid': metadata.get('participant_sid')
        }
        call_log.updatedAt = datetime.utcnow()

        logger.debug(f"Updated call_log {call_log_id}: {metadata['outcome']} ({metadata['duration_seconds']}s)")

    def _find_campaign_call(self, db, call_log_id: str) -> Optional[str]:
        """
        Find campaign_call associated with call_log.

        Uses a savepoint to isolate campaign table queries from main transaction.
        If campaign_calls table doesn't exist (test environment), gracefully returns None.

        Args:
            db: Database session
            call_log_id: call_log ID

        Returns:
            campaign_call ID or None
        """
        try:
            # Use nested transaction (savepoint) to isolate campaign operations
            # This prevents UndefinedTable errors from poisoning the main transaction
            savepoint = db.begin_nested()

            try:
                result = db.execute(text("""
                    SELECT id FROM campaign_calls
                    WHERE call_log_id = :call_log_id
                    LIMIT 1
                """), {'call_log_id': call_log_id})

                row = result.fetchone()
                savepoint.commit()
                return row[0] if row else None

            except Exception as e:
                # Rollback just the savepoint, not the main transaction
                savepoint.rollback()
                logger.warning(f"Error finding campaign_call: {e}")
                return None

        except Exception as e:
            logger.warning(f"Error creating savepoint for campaign_call lookup: {e}")
            return None

    def _update_campaign_call(self, db, campaign_call_id: str, metadata: Dict[str, Any]):
        """
        Update campaign_call with outcome.

        Args:
            db: Database session
            campaign_call_id: campaign_call ID
            metadata: Extracted call metadata
        """
        try:
            db.execute(text("""
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

            logger.debug(f"Updated campaign_call {campaign_call_id}")

        except Exception as e:
            logger.error(f"Error updating campaign_call: {e}", exc_info=True)
            raise

    def _update_lead(self, db, campaign_call_id: str, metadata: Dict[str, Any]):
        """
        Update lead with call history.

        Args:
            db: Database session
            campaign_call_id: campaign_call ID
            metadata: Extracted call metadata
        """
        try:
            db.execute(text("""
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

            logger.debug(f"Updated lead for campaign_call {campaign_call_id}")

        except Exception as e:
            logger.error(f"Error updating lead: {e}", exc_info=True)
            raise

    def _parse_timestamp(self, timestamp_str) -> int:
        """
        Parse timestamp to Unix timestamp.
        Handles both ISO 8601 strings and Unix timestamps (integers).

        Args:
            timestamp_str: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            Unix timestamp (seconds since epoch)
        """
        if not timestamp_str:
            return 0

        try:
            # If already an integer (Unix timestamp), return it
            if isinstance(timestamp_str, int):
                return timestamp_str

            # If string that looks like integer, convert it
            if isinstance(timestamp_str, str) and timestamp_str.isdigit():
                return int(timestamp_str)

            # Otherwise parse as ISO 8601
            dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            return int(dt.timestamp())
        except Exception as e:
            logger.error(f"Error parsing timestamp {timestamp_str}: {e}")
            return 0

    def _parse_datetime(self, timestamp_str) -> Optional[datetime]:
        """
        Parse timestamp to datetime object.
        Handles both ISO 8601 strings and Unix timestamps (integers).

        Args:
            timestamp_str: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            datetime object or None
        """
        if not timestamp_str:
            return None

        try:
            # If already an integer (Unix timestamp), convert to datetime
            if isinstance(timestamp_str, int):
                return datetime.fromtimestamp(timestamp_str, tz=timezone.utc)

            # If string that looks like integer, convert it
            if isinstance(timestamp_str, str) and timestamp_str.isdigit():
                return datetime.fromtimestamp(int(timestamp_str), tz=timezone.utc)

            # Otherwise parse as ISO 8601
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.error(f"Error parsing datetime {timestamp_str}: {e}")
            return None

    def get_call_outcome(self, call_id: str, user_id: str, db_session=None) -> Optional[Dict[str, Any]]:
        """
        Retrieve call outcome for a specific call (multi-tenant safe).

        Args:
            call_id: call_log ID
            user_id: User ID for multi-tenant isolation
            db_session: Optional database session (for testing)

        Returns:
            Call outcome dict or None
        """
        db = db_session if db_session else SessionLocal()
        should_close_db = db_session is None

        try:
            # Query with userId filter (multi-tenant isolation)
            call_log = db.query(CallLog).filter(
                CallLog.id == call_id,
                CallLog.userId == user_id  # ← Enforce tenant isolation
            ).first()

            if not call_log:
                return None

            return call_log.to_dict()

        except Exception as e:
            logger.error(f"Error retrieving call outcome: {e}", exc_info=True)
            return None

        finally:
            if should_close_db:
                db.close()


# Example usage for testing
if __name__ == '__main__':
    import json

    service = CallOutcomeService()

    # Test event
    test_event = {
        'event_id': f'evt_test_{uuid.uuid4().hex[:8]}',
        'event_type': 'participant_left',
        'room_name': 'test-room-12345',
        'room_sid': 'RM_test123',
        'room_creation_time': '2025-10-29T12:34:10Z',
        'participant_sid': 'PA_agent123',
        'participant_identity': 'agent',
        'disconnect_reason': 'CLIENT_INITIATED',
        'created_at': '2025-10-29T12:35:00Z',
        'raw_payload': {}
    }

    # Extract metadata
    metadata = service._extract_call_metadata(test_event)

    print("Extracted Call Metadata:")
    print(json.dumps(metadata, indent=2, default=str))
    print(f"\nDuration: {metadata['duration_seconds']} seconds")
    print(f"Outcome: {metadata['outcome']}")
