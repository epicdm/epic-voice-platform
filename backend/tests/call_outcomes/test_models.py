"""
Unit tests for SQLAlchemy models.

Tests:
- Model creation and field validation
- Relationships and foreign keys
- to_dict() serialization
- Multi-tenant isolation constraints
"""

import pytest
from datetime import datetime

from backend.call_outcomes.models import CallLog, LiveKitCallEvent


@pytest.mark.unit
@pytest.mark.integration
class TestCallLogModel:
    """Test suite for CallLog model"""

    def test_create_call_log(self, db_session, test_user, test_agent_config):
        """Test creating a basic call log"""
        call_log = CallLog(
            id='test_call_1',
            userId=test_user.id,
            agentConfigId=test_agent_config.id,
            livekitRoomName='test-room-abc',
            livekitRoomSid='RM_abc123',
            direction='inbound',
            phoneNumber='+15551234567',
            sipCallId='sip-call-123',
            status='active',
            startedAt=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        db_session.add(call_log)
        db_session.commit()

        # Verify saved
        saved = db_session.query(CallLog).filter_by(id='test_call_1').first()
        assert saved is not None
        assert saved.userId == test_user.id
        assert saved.agentConfigId == test_agent_config.id
        assert saved.direction == 'inbound'
        assert saved.status == 'active'

    def test_call_log_with_outcome(self, db_session, test_user):
        """Test call log with outcome data"""
        call_log = CallLog(
            id='test_call_2',
            userId=test_user.id,
            livekitRoomName='test-room-def',
            livekitRoomSid='RM_def456',
            direction='outbound',
            phoneNumber='+15559876543',
            status='ended',
            outcome='completed',
            duration=45,
            startedAt=datetime.utcnow(),
            endedAt=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        db_session.add(call_log)
        db_session.commit()

        saved = db_session.query(CallLog).filter_by(id='test_call_2').first()
        assert saved.outcome == 'completed'
        assert saved.duration == 45
        assert saved.endedAt is not None

    def test_call_log_to_dict(self, test_call_log):
        """Test call log serialization to dict"""
        result = test_call_log.to_dict()

        assert isinstance(result, dict)
        assert result['id'] == test_call_log.id
        assert result['userId'] == test_call_log.userId
        assert result['direction'] == test_call_log.direction
        assert result['phoneNumber'] == test_call_log.phoneNumber
        assert result['status'] == test_call_log.status
        assert 'createdAt' in result

    def test_call_log_relationships(self, db_session, test_user, test_agent_config):
        """Test call log relationships (user, agent_config)"""
        call_log = CallLog(
            id='test_call_3',
            userId=test_user.id,
            agentConfigId=test_agent_config.id,
            livekitRoomName='test-room-ghi',
            livekitRoomSid='RM_ghi789',
            direction='inbound',
            status='active',
            startedAt=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        db_session.add(call_log)
        db_session.commit()

        # Test user relationship
        assert call_log.user.id == test_user.id
        assert call_log.user.email == test_user.email

        # Test agent relationship (note: relationship is 'agent', not 'agent_config')
        assert call_log.agent.id == test_agent_config.id
        assert call_log.agent.name == test_agent_config.name

    def test_call_log_metadata_jsonb(self, db_session, test_user):
        """Test call log with JSONB metadata"""
        metadata = {
            'disconnect_reason': 'CLIENT_INITIATED',
            'participant_sid': 'PA_123',
            'custom_field': 'test_value'
        }

        call_log = CallLog(
            id='test_call_4',
            userId=test_user.id,
            livekitRoomName='test-room-jkl',
            livekitRoomSid='RM_jkl012',
            direction='inbound',
            status='ended',
            metadata=metadata,
            startedAt=datetime.utcnow(),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        db_session.add(call_log)
        db_session.commit()

        saved = db_session.query(CallLog).filter_by(id='test_call_4').first()
        assert saved.metadata == metadata
        assert saved.metadata['disconnect_reason'] == 'CLIENT_INITIATED'


@pytest.mark.unit
@pytest.mark.integration
class TestLiveKitCallEventModel:
    """Test suite for LiveKitCallEvent model"""

    def test_create_event(self, db_session, test_user, test_call_log):
        """Test creating a LiveKit call event"""
        event = LiveKitCallEvent(
            id='event_1',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_abc123',
            event='participant_left',
            roomName=test_call_log.livekitRoomName,
            roomSid=test_call_log.livekitRoomSid,
            participantIdentity='agent',
            participantSid='PA_test123',
            timestamp=1730000000,
            rawPayload={'test': 'data'},
            processed=1,
            processedAt=datetime.utcnow(),
            createdAt=datetime.utcnow()
        )

        db_session.add(event)
        db_session.commit()

        saved = db_session.query(LiveKitCallEvent).filter_by(id='event_1').first()
        assert saved is not None
        assert saved.eventId == 'evt_abc123'
        assert saved.event == 'participant_left'
        assert saved.processed == 1

    def test_event_unique_constraint(self, db_session, test_user, test_call_log):
        """Test that eventId UNIQUE constraint is enforced"""
        from sqlalchemy.exc import IntegrityError

        # Create first event
        event1 = LiveKitCallEvent(
            id='event_2',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_duplicate_test',
            event='participant_left',
            roomName='test-room',
            roomSid='RM_123',
            timestamp=1730000000,
            rawPayload={},
            createdAt=datetime.utcnow()
        )

        db_session.add(event1)
        db_session.commit()

        # Try to create second event with same eventId
        event2 = LiveKitCallEvent(
            id='event_3',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_duplicate_test',  # Same eventId!
            event='room_finished',
            roomName='test-room',
            roomSid='RM_123',
            timestamp=1730000001,
            rawPayload={},
            createdAt=datetime.utcnow()
        )

        db_session.add(event2)

        # Should raise IntegrityError due to UNIQUE constraint
        with pytest.raises(IntegrityError):
            db_session.commit()

    def test_event_to_dict(self, db_session, test_user, test_call_log):
        """Test event serialization to dict"""
        event = LiveKitCallEvent(
            id='event_4',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_to_dict_test',
            event='participant_left',
            roomName='test-room',
            roomSid='RM_456',
            timestamp=1730000000,
            rawPayload={'test': 'data'},
            processed=1,
            createdAt=datetime.utcnow()
        )

        db_session.add(event)
        db_session.commit()

        result = event.to_dict()

        assert isinstance(result, dict)
        assert result['id'] == event.id
        assert result['eventId'] == event.eventId
        assert result['event'] == event.event
        assert result['processed'] == 1
        assert 'createdAt' in result

    def test_event_relationships(self, db_session, test_user, test_call_log):
        """Test event relationships (user, call_log)"""
        event = LiveKitCallEvent(
            id='event_5',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_relationship_test',
            event='participant_left',
            roomName=test_call_log.livekitRoomName,
            roomSid=test_call_log.livekitRoomSid,
            timestamp=1730000000,
            rawPayload={},
            createdAt=datetime.utcnow()
        )

        db_session.add(event)
        db_session.commit()

        # Test user relationship
        assert event.user.id == test_user.id

        # Test call_log relationship
        assert event.call_log.id == test_call_log.id
        assert event.call_log.livekitRoomSid == test_call_log.livekitRoomSid

    def test_event_jsonb_payload(self, db_session, test_user, test_call_log):
        """Test event with complex JSONB payload"""
        complex_payload = {
            'id': 'evt_test',
            'event': 'participant_left',
            'room': {
                'name': 'test-room',
                'sid': 'RM_123',
                'participants': ['PA_1', 'PA_2']
            },
            'participant': {
                'sid': 'PA_1',
                'identity': 'agent',
                'metadata': {'key': 'value'}
            }
        }

        event = LiveKitCallEvent(
            id='event_6',
            userId=test_user.id,
            callLogId=test_call_log.id,
            eventId='evt_jsonb_test',
            event='participant_left',
            roomName='test-room',
            roomSid='RM_123',
            timestamp=1730000000,
            rawPayload=complex_payload,
            createdAt=datetime.utcnow()
        )

        db_session.add(event)
        db_session.commit()

        saved = db_session.query(LiveKitCallEvent).filter_by(id='event_6').first()
        assert saved.rawPayload == complex_payload
        assert saved.rawPayload['room']['name'] == 'test-room'
        assert len(saved.rawPayload['room']['participants']) == 2
