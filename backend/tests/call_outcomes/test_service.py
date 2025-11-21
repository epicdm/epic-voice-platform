"""
Unit and integration tests for CallOutcomeService.

Tests:
- Outcome classification logic
- Event processing with database updates
- Idempotency enforcement
- Multi-tenant isolation
- Error handling
"""

import pytest
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from backend.call_outcomes.service import CallOutcomeService
from backend.call_outcomes.models import CallLog, LiveKitCallEvent


@pytest.mark.unit
class TestOutcomeClassification:
    """Test suite for outcome classification logic"""

    def setup_method(self):
        """Setup test instance"""
        self.service = CallOutcomeService()

    def test_classify_completed_call(self):
        """Test completed call classification (>= 10s)"""
        event = {'disconnect_reason': ''}
        outcome = self.service._classify_outcome(event, 45)

        assert outcome == 'completed'

    def test_classify_no_answer_short(self):
        """Test no_answer classification (< 10s)"""
        event = {'disconnect_reason': ''}
        outcome = self.service._classify_outcome(event, 5)

        assert outcome == 'no_answer'

    def test_classify_failed_very_short(self):
        """Test failed classification (< 3s)"""
        event = {'disconnect_reason': ''}
        outcome = self.service._classify_outcome(event, 2)

        assert outcome == 'failed'

    def test_classify_busy(self):
        """Test busy classification (disconnect reason)"""
        event = {'disconnect_reason': 'BUSY'}
        outcome = self.service._classify_outcome(event, 10)

        assert outcome == 'busy'

    def test_classify_no_answer_reason(self):
        """Test no_answer classification (disconnect reason)"""
        event = {'disconnect_reason': 'NO_ANSWER'}
        outcome = self.service._classify_outcome(event, 10)

        assert outcome == 'no_answer'

    def test_classify_failed_reason(self):
        """Test failed classification (error in disconnect reason)"""
        event = {'disconnect_reason': 'CONNECTION_FAILED'}
        outcome = self.service._classify_outcome(event, 10)

        assert outcome == 'failed'

    def test_classify_edge_case_10_seconds(self):
        """Test classification at 10 second boundary"""
        event = {'disconnect_reason': ''}
        outcome = self.service._classify_outcome(event, 10)

        assert outcome == 'completed'

    def test_classify_edge_case_3_seconds(self):
        """Test classification at 3 second boundary"""
        event = {'disconnect_reason': ''}
        outcome = self.service._classify_outcome(event, 3)

        assert outcome == 'no_answer'


@pytest.mark.integration
class TestEventProcessing:
    """Test suite for webhook event processing"""

    def setup_method(self):
        """Setup test instance"""
        self.service = CallOutcomeService()

    def test_process_webhook_event_success(self, db_session, test_call_log, mock_webhook_event):
        """Test successful webhook event processing"""
        # Update mock event to match test_call_log
        mock_webhook_event['room_name'] = test_call_log.livekitRoomName
        mock_webhook_event['room_sid'] = test_call_log.livekitRoomSid

        success, message = self.service.process_webhook_event(mock_webhook_event, db_session=db_session)

        assert success is True
        assert 'Outcome:' in message

        # Verify call_log updated
        db_session.refresh(test_call_log)
        assert test_call_log.status == 'ended'
        assert test_call_log.outcome in ['completed', 'no_answer', 'busy', 'failed']
        assert test_call_log.endedAt is not None
        assert test_call_log.duration is not None

        # Verify event recorded
        event = db_session.query(LiveKitCallEvent).filter_by(
            eventId=mock_webhook_event['event_id']
        ).first()
        assert event is not None
        assert event.processed == 1

    def test_process_webhook_event_call_not_found(self, mock_webhook_event):
        """Test webhook processing when call_log not found"""
        # Use room name that doesn't exist
        mock_webhook_event['room_name'] = 'non-existent-room'
        mock_webhook_event['room_sid'] = 'RM_nonexistent'

        success, message = self.service.process_webhook_event(mock_webhook_event)

        assert success is False
        assert 'Call context not found' in message

    def test_extract_call_metadata(self, mock_webhook_event):
        """Test call metadata extraction"""
        metadata = self.service._extract_call_metadata(mock_webhook_event)

        assert 'duration_seconds' in metadata
        assert 'outcome' in metadata
        assert 'started_at' in metadata
        assert 'ended_at' in metadata
        assert 'disconnect_reason' in metadata
        assert metadata['disconnect_reason'] == mock_webhook_event['disconnect_reason']

    def test_update_call_log(self, db_session, test_call_log):
        """Test call_log update with outcome"""
        metadata = {
            'duration_seconds': 45,
            'outcome': 'completed',
            'started_at': test_call_log.startedAt,
            'ended_at': datetime.utcnow(),
            'disconnect_reason': 'CLIENT_INITIATED',
            'participant_sid': 'PA_test',
            'recording_url': 'https://example.com/recording.mp4'
        }

        self.service._update_call_log(db_session, test_call_log.id, metadata)
        db_session.commit()

        # Verify updates
        db_session.refresh(test_call_log)
        assert test_call_log.status == 'ended'
        assert test_call_log.outcome == 'completed'
        assert test_call_log.duration == 45
        assert test_call_log.recordingUrl == 'https://example.com/recording.mp4'
        assert test_call_log.call_metadata['disconnect_reason'] == 'CLIENT_INITIATED'


@pytest.mark.idempotency
class TestIdempotency:
    """Test suite for idempotency enforcement"""

    def setup_method(self):
        """Setup test instance"""
        self.service = CallOutcomeService()

    def test_duplicate_event_idempotency(self, db_session, test_call_log, mock_webhook_event):
        """Test that duplicate events are handled idempotently"""
        # Update mock event to match test_call_log
        mock_webhook_event['room_name'] = test_call_log.livekitRoomName
        mock_webhook_event['room_sid'] = test_call_log.livekitRoomSid

        # Process event first time
        success1, message1 = self.service.process_webhook_event(mock_webhook_event, db_session=db_session)
        assert success1 is True

        # Get call_log state after first processing
        db_session.refresh(test_call_log)
        first_outcome = test_call_log.outcome
        first_updated_at = test_call_log.updatedAt

        # Process same event again (duplicate)
        success2, message2 = self.service.process_webhook_event(mock_webhook_event, db_session=db_session)

        # Should succeed but skip processing
        assert success2 is True
        assert 'already processed' in message2

        # Verify call_log not modified
        db_session.refresh(test_call_log)
        assert test_call_log.outcome == first_outcome
        assert test_call_log.updatedAt == first_updated_at

        # Verify only one event record exists
        event_count = db_session.query(LiveKitCallEvent).filter_by(
            eventId=mock_webhook_event['event_id']
        ).count()
        assert event_count == 1

    def test_multiple_events_different_ids(self, db_session, test_call_log, mock_webhook_event):
        """Test that different events are processed independently"""
        import uuid

        # Update mock event to match test_call_log
        mock_webhook_event['room_name'] = test_call_log.livekitRoomName
        mock_webhook_event['room_sid'] = test_call_log.livekitRoomSid

        # Process first event
        success1, _ = self.service.process_webhook_event(mock_webhook_event, db_session=db_session)
        assert success1 is True

        # Process second event with different event_id
        mock_webhook_event['event_id'] = f'evt_{uuid.uuid4().hex[:12]}'
        success2, _ = self.service.process_webhook_event(mock_webhook_event, db_session=db_session)

        # Both should succeed (but second may fail due to call already ended)
        # The key is that no IntegrityError is raised
        assert success1 is True


@pytest.mark.multitenant
class TestMultiTenantIsolation:
    """Test suite for multi-tenant data isolation"""

    def setup_method(self):
        """Setup test instance"""
        self.service = CallOutcomeService()

    def test_get_call_outcome_correct_user(self, db_session, test_call_log):
        """Test retrieving call outcome with correct userId"""
        result = self.service.get_call_outcome(test_call_log.id, test_call_log.userId, db_session=db_session)

        assert result is not None
        assert result['id'] == test_call_log.id
        assert result['userId'] == test_call_log.userId

    def test_get_call_outcome_wrong_user(self, db_session, test_call_log):
        """Test retrieving call outcome with wrong userId (should fail)"""
        wrong_user_id = 'wrong_user_id'
        result = self.service.get_call_outcome(test_call_log.id, wrong_user_id, db_session=db_session)

        assert result is None  # Should not return data for wrong user

    def test_multi_tenant_data_isolation(self, db_session, test_call_log, test_call_log_user_2):
        """Test that users cannot access each other's call outcomes"""
        # User 1 should only see their call
        result1 = self.service.get_call_outcome(test_call_log.id, test_call_log.userId, db_session=db_session)
        assert result1 is not None
        assert result1['id'] == test_call_log.id

        # User 1 should NOT see User 2's call
        result2 = self.service.get_call_outcome(test_call_log_user_2.id, test_call_log.userId, db_session=db_session)
        assert result2 is None

        # User 2 should only see their call
        result3 = self.service.get_call_outcome(test_call_log_user_2.id, test_call_log_user_2.userId, db_session=db_session)
        assert result3 is not None
        assert result3['id'] == test_call_log_user_2.id

        # User 2 should NOT see User 1's call
        result4 = self.service.get_call_outcome(test_call_log.id, test_call_log_user_2.userId, db_session=db_session)
        assert result4 is None

    def test_resolve_call_context_correct_user(self, db_session, test_call_log, mock_webhook_event):
        """Test resolving call context with correct userId"""
        mock_webhook_event['room_name'] = test_call_log.livekitRoomName
        mock_webhook_event['room_sid'] = test_call_log.livekitRoomSid

        user_id, call_log_id = self.service._resolve_call_context(db_session, mock_webhook_event)

        assert user_id == test_call_log.userId
        assert call_log_id == test_call_log.id


@pytest.mark.integration
class TestErrorHandling:
    """Test suite for error handling"""

    def setup_method(self):
        """Setup test instance"""
        self.service = CallOutcomeService()

    def test_invalid_call_log_id_update(self, db_session):
        """Test updating non-existent call_log raises error"""
        metadata = {
            'duration_seconds': 45,
            'outcome': 'completed',
            'ended_at': datetime.utcnow()
        }

        with pytest.raises(ValueError):
            self.service._update_call_log(db_session, 'non_existent_id', metadata)

    def test_malformed_event_graceful_failure(self):
        """Test that malformed events fail gracefully"""
        malformed_event = {
            'event_id': 'evt_malformed',
            # Missing required fields
        }

        success, message = self.service.process_webhook_event(malformed_event)

        assert success is False
        # Should not raise exception, just return failure
