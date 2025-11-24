#!/usr/bin/env python3
"""
Call Outcome Processor
Processes call completion events and updates database with outcomes
"""

import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy import text
from database import SessionLocal

logger = logging.getLogger(__name__)

class CallOutcomeProcessor:
    """
    Processes call outcome events with idempotency and transactional updates

    Features:
    - Idempotency checking via event_id
    - Outcome classification logic
    - Transactional database updates
    - Event emission for downstream systems
    """

    def __init__(self):
        """Initialize call outcome processor"""
        logger.info("Call outcome processor initialized")

    def process_call_outcome(self, event: Dict[str, Any]) -> bool:
        """
        Main entry point for processing call outcomes

        Args:
            event: Normalized event dict from webhook listener

        Returns:
            bool: True if processed successfully, False otherwise
        """
        event_id = event.get('event_id')
        room_name = event.get('room_name')

        logger.info(f"📞 Processing call outcome for room: {room_name}, event: {event_id}")

        db = SessionLocal()

        try:
            # 1. Idempotency check - have we seen this event before?
            if self._is_event_processed(db, event_id):
                logger.info(f"⏭️  Event {event_id} already processed, skipping")
                return True

            # 2. Extract and classify call metadata
            call_metadata = self._extract_call_metadata(event)

            # 3. Find associated call_log by room name
            call_log_id = self._find_call_log_by_room(db, room_name)

            if not call_log_id:
                logger.warning(f"⚠️  No call_log found for room: {room_name}")
                # Still record the event as orphaned for debugging
                self._store_orphan_event(db, event)
                return False

            # 4. Find associated campaign_call (if this was a campaign call)
            campaign_call_id = self._find_campaign_call_by_room(db, room_name)

            # 5. Persist call outcome with transaction
            self._persist_call_outcome(
                db=db,
                event_id=event_id,
                event=event,
                call_log_id=call_log_id,
                campaign_call_id=campaign_call_id,
                metadata=call_metadata
            )

            # 6. Emit internal events for analytics/CRM
            user_id = self._get_user_id_for_call(db, call_log_id)
            if user_id:
                self._emit_completion_events(
                    call_log_id=call_log_id,
                    campaign_call_id=campaign_call_id,
                    outcome=call_metadata['outcome'],
                    user_id=user_id
                )

            logger.info(f"✅ Successfully processed call outcome for {room_name}")
            return True

        except Exception as e:
            logger.error(f"❌ Error processing call outcome: {e}", exc_info=True)
            db.rollback()
            return False

        finally:
            db.close()

    def _is_event_processed(self, db, event_id: str) -> bool:
        """
        Check if event was already processed (idempotency)

        Args:
            db: Database session
            event_id: LiveKit event ID

        Returns:
            True if event already processed
        """
        result = db.execute(
            text("SELECT 1 FROM livekit_call_events WHERE event_id = :event_id LIMIT 1"),
            {'event_id': event_id}
        )
        return result.fetchone() is not None

    def _extract_call_metadata(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract and normalize call metadata from event

        Args:
            event: Normalized event dict

        Returns:
            Dict with duration, outcome, timestamps, etc.
        """
        # Calculate duration from room creation to event
        raw_payload = event.get('raw_payload', {})
        room = raw_payload.get('room', {})

        room_created = room.get('creationTime')
        event_created = event.get('created_at')

        duration_seconds = self._calculate_duration(room_created, event_created)

        # Classify call outcome
        outcome = self._classify_outcome(event, duration_seconds)

        # Extract timestamps
        started_at = self._parse_timestamp(room_created)
        ended_at = self._parse_timestamp(event_created)

        return {
            'duration_seconds': duration_seconds,
            'outcome': outcome,
            'started_at': started_at,
            'ended_at': ended_at,
            'participant_sid': event.get('participant_sid'),
            'disconnect_reason': event.get('disconnect_reason'),
            'recording_url': event.get('recording_url')
        }

    def _classify_outcome(self, event: Dict[str, Any], duration: int) -> str:
        """
        Classify call outcome based on event data and duration

        Outcome categories:
        - 'completed': Call answered and conversation occurred (>10s)
        - 'no_answer': Call went unanswered (<5s or no_answer reason)
        - 'busy': Called party was busy
        - 'failed': Call failed to connect or system error
        - 'error': Unexpected error occurred

        Args:
            event: Normalized event dict
            duration: Call duration in seconds

        Returns:
            Outcome classification string
        """
        disconnect_reason = event.get('disconnect_reason', '').lower()
        event_type = event.get('event_type', '')

        # Check disconnect reason first
        if 'busy' in disconnect_reason:
            return 'busy'

        if 'no_answer' in disconnect_reason or 'no answer' in disconnect_reason:
            return 'no_answer'

        if 'failed' in disconnect_reason or 'error' in disconnect_reason:
            return 'failed'

        # Duration-based classification
        if duration < 3:
            # Very short call - likely didn't connect
            return 'failed'

        if duration < 10:
            # Short call - likely no answer or quick hangup
            return 'no_answer'

        if duration >= 10:
            # Reasonable conversation duration - mark as completed
            return 'completed'

        # Default to no_answer if we can't determine
        return 'no_answer'

    def _calculate_duration(self, started_at, ended_at) -> int:
        """
        Calculate call duration in seconds

        Args:
            started_at: ISO 8601 timestamp string OR Unix timestamp integer
            ended_at: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            Duration in seconds (0 if calculation fails)
        """
        if not started_at or not ended_at:
            return 0

        try:
            # Handle Unix timestamp integers
            if isinstance(started_at, int):
                start = datetime.fromtimestamp(started_at, tz=timezone.utc)
            elif isinstance(started_at, str) and started_at.isdigit():
                start = datetime.fromtimestamp(int(started_at), tz=timezone.utc)
            else:
                start = datetime.fromisoformat(started_at.replace('Z', '+00:00'))

            if isinstance(ended_at, int):
                end = datetime.fromtimestamp(ended_at, tz=timezone.utc)
            elif isinstance(ended_at, str) and ended_at.isdigit():
                end = datetime.fromtimestamp(int(ended_at), tz=timezone.utc)
            else:
                end = datetime.fromisoformat(ended_at.replace('Z', '+00:00'))

            duration = int((end - start).total_seconds())
            return max(0, duration)  # Ensure non-negative

        except Exception as e:
            logger.error(f"Error calculating duration: {e}")
            return 0

    def _parse_timestamp(self, timestamp_str) -> Optional[datetime]:
        """
        Parse timestamp to datetime object

        Args:
            timestamp_str: ISO 8601 timestamp string OR Unix timestamp integer

        Returns:
            datetime object or None
        """
        if not timestamp_str:
            return None

        try:
            # Handle Unix timestamp integers
            if isinstance(timestamp_str, int):
                return datetime.fromtimestamp(timestamp_str, tz=timezone.utc)

            # Handle numeric strings
            if isinstance(timestamp_str, str) and timestamp_str.isdigit():
                return datetime.fromtimestamp(int(timestamp_str), tz=timezone.utc)

            # Handle ISO 8601 strings
            return datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except Exception as e:
            logger.error(f"Error parsing timestamp {timestamp_str}: {e}")
            return None

    def _find_call_log_by_room(self, db, room_name: str) -> Optional[str]:
        """
        Find call_log by LiveKit room name

        Args:
            db: Database session
            room_name: LiveKit room name

        Returns:
            call_log ID or None
        """
        result = db.execute(
            text('SELECT id FROM call_logs WHERE "livekitRoomName" = :room_name LIMIT 1'),
            {'room_name': room_name}
        )
        row = result.fetchone()
        return row[0] if row else None

    def _find_campaign_call_by_room(self, db, room_name: str) -> Optional[str]:
        """
        Find campaign_call by LiveKit room name

        Args:
            db: Database session
            room_name: LiveKit room name

        Returns:
            campaign_call ID or None
        """
        result = db.execute(
            text("""
                SELECT id FROM campaign_calls
                WHERE livekit_room_name = :room_name
                LIMIT 1
            """),
            {'room_name': room_name}
        )
        row = result.fetchone()
        return row[0] if row else None

    def _get_user_id_for_call(self, db, call_log_id: str) -> Optional[str]:
        """
        Get user_id for a call_log

        Args:
            db: Database session
            call_log_id: call_log ID

        Returns:
            user_id or None
        """
        result = db.execute(
            text('SELECT "userId" FROM call_logs WHERE id = :id LIMIT 1'),
            {'id': call_log_id}
        )
        row = result.fetchone()
        return row[0] if row else None

    def _persist_call_outcome(
        self,
        db,
        event_id: str,
        event: Dict[str, Any],
        call_log_id: str,
        campaign_call_id: Optional[str],
        metadata: Dict[str, Any]
    ):
        """
        Persist call outcome to database (transactional)

        Updates:
        1. livekit_call_events - Record event (idempotency)
        2. call_logs - Update outcome and timestamps
        3. campaign_calls - Update outcome and status (if campaign call)
        4. leads - Update call history (if campaign call)

        Args:
            db: Database session
            event_id: LiveKit event ID
            event: Full event dict
            call_log_id: call_log ID to update
            campaign_call_id: campaign_call ID (optional)
            metadata: Extracted call metadata
        """
        try:
            # SQLAlchemy sessions already have implicit transactions
            # No need to call db.begin() explicitly

            # 1. Insert livekit_call_events (idempotency record)
            db.execute(text("""
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
                'event_payload': json.dumps(event, default=str),
                'call_log_id': call_log_id
            })

            # 2. Update call_logs
            db.execute(text("""
                UPDATE call_logs SET
                    "endedAt" = :ended_at,
                    "durationSeconds" = :duration,
                    outcome = :outcome,
                    recording_url = :recording_url,
                    call_metadata = CAST(:metadata AS jsonb)
                WHERE id = :call_log_id
            """), {
                'ended_at': metadata['ended_at'],
                'duration': metadata['duration_seconds'],
                'outcome': metadata['outcome'],
                'recording_url': metadata.get('recording_url'),
                'metadata': json.dumps({
                    'disconnect_reason': metadata.get('disconnect_reason'),
                    'participant_sid': metadata.get('participant_sid')
                }),
                'call_log_id': call_log_id
            })

            # 3. Update campaign_calls (if this was a campaign call)
            if campaign_call_id:
                db.execute(text("""
                    UPDATE campaign_calls SET
                        completed_at = :completed_at,
                        call_duration_seconds = :duration,
                        call_outcome = :outcome,
                        status = 'completed',
                        attempted_at = COALESCE(attempted_at, :completed_at)
                    WHERE id = :campaign_call_id
                """), {
                    'completed_at': metadata['ended_at'],
                    'duration': metadata['duration_seconds'],
                    'outcome': metadata['outcome'],
                    'campaign_call_id': campaign_call_id
                })

                # 4. Update lead (aggregate call history)
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

            db.commit()
            logger.info(f"✅ Persisted call outcome: {metadata['outcome']} ({metadata['duration_seconds']}s)")

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error persisting call outcome: {e}", exc_info=True)
            raise

    def _store_orphan_event(self, db, event: Dict[str, Any]):
        """
        Store event that couldn't be matched to a call_log

        Useful for debugging missing room names or timing issues

        Args:
            db: Database session
            event: Event dict
        """
        try:
            db.execute(text("""
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
                'event_payload': json.dumps(event, default=str)
            })
            db.commit()
            logger.warning(f"Stored orphan event {event.get('event_id')} for debugging")

        except Exception as e:
            db.rollback()
            logger.error(f"Error storing orphan event: {e}", exc_info=True)

    def _emit_completion_events(
        self,
        call_log_id: str,
        campaign_call_id: Optional[str],
        outcome: str,
        user_id: str
    ):
        """
        Emit internal webhook events for analytics and CRM sync

        Args:
            call_log_id: call_log ID
            campaign_call_id: campaign_call ID (optional)
            outcome: Call outcome classification
            user_id: User ID for webhook routing
        """
        try:
            # Import here to avoid circular dependency
            from webhook_events import trigger_webhook_event

            # Emit outcome-specific event
            event_type = f'call.{outcome}'  # e.g., call.completed, call.no_answer

            event_data = {
                'call_log_id': call_log_id,
                'outcome': outcome,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            if campaign_call_id:
                event_data['campaign_call_id'] = campaign_call_id

            # Trigger webhook (async queued)
            trigger_webhook_event(event_type, event_data, user_id)

            logger.debug(f"Emitted {event_type} event for call {call_log_id}")

        except Exception as e:
            # Don't fail the whole operation if event emission fails
            logger.error(f"Error emitting completion events: {e}", exc_info=True)


# Example usage for testing
if __name__ == '__main__':
    # Test processor
    processor = CallOutcomeProcessor()

    # Mock event
    test_event = {
        'event_id': 'evt_test_123',
        'event_type': 'participant_left',
        'room_name': 'test-room-12345',
        'participant_sid': 'PA_test123',
        'disconnect_reason': 'user_left',
        'created_at': datetime.now(timezone.utc).isoformat(),
        'raw_payload': {
            'room': {
                'name': 'test-room-12345',
                'creationTime': (datetime.now(timezone.utc).replace(
                    second=datetime.now(timezone.utc).second - 45
                )).isoformat()
            }
        }
    }

    # Test metadata extraction
    metadata = processor._extract_call_metadata(test_event)
    print(f"Extracted metadata: {json.dumps(metadata, indent=2, default=str)}")
    print(f"Duration: {metadata['duration_seconds']}s")
    print(f"Outcome: {metadata['outcome']}")

    # Test outcome classification
    outcomes = {
        'Short call (2s)': processor._classify_outcome(test_event, 2),
        'Quick hangup (8s)': processor._classify_outcome(test_event, 8),
        'Normal call (45s)': processor._classify_outcome(test_event, 45),
        'Long call (300s)': processor._classify_outcome(test_event, 300),
    }

    print("\nOutcome classification tests:")
    for desc, outcome in outcomes.items():
        print(f"  {desc} → {outcome}")
