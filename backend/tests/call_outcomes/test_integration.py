"""
Integration tests for complete webhook→DB flow.

Tests:
- End-to-end webhook processing
- Database state verification
- Transactional consistency
- Real LiveKit payload handling
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime, timedelta

from backend.call_outcomes.transformer import LiveKitWebhookTransformer
from backend.call_outcomes.service import CallOutcomeService
from backend.call_outcomes.models import CallLog, LiveKitCallEvent


@pytest.mark.integration
class TestWebhookToDatabase:
    """Test suite for complete webhook→DB integration"""

    def setup_method(self):
        """Setup test instances"""
        self.transformer = LiveKitWebhookTransformer()
        self.service = CallOutcomeService()

    def test_complete_webhook_flow_inbound_completed(self, db_session, test_user, test_agent_config):
        """Test complete flow: webhook → transformation → DB update (inbound, completed)"""
        # 1. Create initial call_log (active state)
        call_log = CallLog(
            id='integration_call_1',
            userId=test_user.id,
            agentConfigId=test_agent_config.id,
            livekitRoomName='sip-7678189426__1730000000__abc123',
            livekitRoomSid='RM_integration_1',
            direction='inbound',
            phoneNumber='+17678189426',
            sipCallId='sip-integration-1',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=45),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db_session.add(call_log)
        db_session.commit()

        # 2. Create mock LiveKit webhook payload
        webhook_payload = {
            'id': 'evt_integration_1',
            'event': 'participant_left',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'room': {
                'name': 'sip-7678189426__1730000000__abc123',
                'sid': 'RM_integration_1',
                'creationTime': (datetime.utcnow() - timedelta(seconds=45)).isoformat() + 'Z'
            },
            'participant': {
                'sid': 'PA_integration_1',
                'identity': 'agent',
                'disconnectReason': 'CLIENT_INITIATED'
            }
        }

        # 3. Transform webhook
        normalized_event = self.transformer.transform(webhook_payload)
        assert normalized_event is not None

        # 4. Process event via service
        success, message = self.service.process_webhook_event(normalized_event, db_session=db_session)
        assert success is True
        assert 'Outcome:' in message

        # 5. Verify database state
        db_session.refresh(call_log)

        # Call should be marked as ended
        assert call_log.status == 'ended'
        assert call_log.endedAt is not None

        # Duration should be calculated (~45 seconds)
        assert call_log.duration > 0
        assert call_log.duration >= 40  # Allow some timing variance

        # Outcome should be 'completed' (>10s call)
        assert call_log.outcome == 'completed'

        # Metadata should be populated
        assert call_log.call_metadata is not None
        assert 'disconnect_reason' in call_log.call_metadata

        # Updated timestamp should be set
        assert call_log.updatedAt > call_log.createdAt

        # 6. Verify event recorded
        event = db_session.query(LiveKitCallEvent).filter_by(
            eventId='evt_integration_1'
        ).first()

        assert event is not None
        assert event.userId == test_user.id
        assert event.callLogId == call_log.id
        assert event.event == 'participant_left'
        assert event.processed == 1

    def test_complete_webhook_flow_no_answer(self, db_session, test_user):
        """Test complete flow: webhook → DB update (no_answer outcome)"""
        # 1. Create call_log for short call
        call_log = CallLog(
            id='integration_call_2',
            userId=test_user.id,
            livekitRoomName='sip-5551234567__1730000000__xyz789',
            livekitRoomSid='RM_integration_2',
            direction='outbound',
            phoneNumber='+15551234567',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=5),  # Short call
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db_session.add(call_log)
        db_session.commit()

        # 2. Create webhook for short call
        webhook_payload = {
            'id': 'evt_integration_2',
            'event': 'participant_left',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'room': {
                'name': 'sip-5551234567__1730000000__xyz789',
                'sid': 'RM_integration_2',
                'creationTime': (datetime.utcnow() - timedelta(seconds=5)).isoformat() + 'Z'
            },
            'participant': {
                'sid': 'PA_integration_2',
                'identity': 'agent',
                'disconnectReason': ''
            }
        }

        # 3. Process webhook
        normalized_event = self.transformer.transform(webhook_payload)
        success, _ = self.service.process_webhook_event(normalized_event, db_session=db_session)
        assert success is True

        # 4. Verify outcome is 'no_answer'
        db_session.refresh(call_log)
        assert call_log.outcome == 'no_answer'
        assert call_log.duration < 10

    def test_signature_validation_integration(self, livekit_webhook_secret):
        """Test HMAC signature validation in integration context"""
        # Create realistic webhook payload
        payload = {
            'id': 'evt_sig_test',
            'event': 'participant_left',
            'room': {'name': 'test-room', 'sid': 'RM_test'},
            'createdAt': datetime.utcnow().isoformat() + 'Z'
        }

        payload_bytes = json.dumps(payload).encode('utf-8')

        # Generate valid signature
        valid_signature = hmac.new(
            livekit_webhook_secret.encode('utf-8'),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()

        # Test valid signature
        is_valid = self.transformer.validate_signature(
            payload_bytes, valid_signature, livekit_webhook_secret
        )
        assert is_valid is True

        # Test invalid signature
        invalid_signature = 'invalid_signature_abc123'
        is_invalid = self.transformer.validate_signature(
            payload_bytes, invalid_signature, livekit_webhook_secret
        )
        assert is_invalid is False

    def test_transactional_consistency(self, db_session, test_user):
        """Test that webhook processing is transactional"""
        # Create call_log
        call_log = CallLog(
            id='integration_call_3',
            userId=test_user.id,
            livekitRoomName='transactional-test-room',
            livekitRoomSid='RM_transaction',
            direction='inbound',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=30),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db_session.add(call_log)
        db_session.commit()

        # Create webhook event
        webhook_payload = {
            'id': 'evt_transaction_test',
            'event': 'participant_left',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'room': {
                'name': 'transactional-test-room',
                'sid': 'RM_transaction',
                'creationTime': (datetime.utcnow() - timedelta(seconds=30)).isoformat() + 'Z'
            },
            'participant': {
                'sid': 'PA_transaction',
                'identity': 'agent',
                'disconnectReason': ''
            }
        }

        # Process event
        normalized_event = self.transformer.transform(webhook_payload)
        success, _ = self.service.process_webhook_event(normalized_event, db_session=db_session)
        assert success is True

        # Verify both event and call_log updates are committed
        event = db_session.query(LiveKitCallEvent).filter_by(
            eventId='evt_transaction_test'
        ).first()
        assert event is not None

        db_session.refresh(call_log)
        assert call_log.status == 'ended'

        # Both updates should exist (transactional consistency)
        assert event.callLogId == call_log.id


@pytest.mark.integration
@pytest.mark.idempotency
class TestIdempotencyIntegration:
    """Integration tests for idempotency across full stack"""

    def setup_method(self):
        """Setup test instances"""
        self.transformer = LiveKitWebhookTransformer()
        self.service = CallOutcomeService()

    def test_duplicate_webhook_delivery(self, db_session, test_user):
        """Test handling of duplicate webhook deliveries (LiveKit retry)"""
        # 1. Create call_log
        call_log = CallLog(
            id='idempotency_call_1',
            userId=test_user.id,
            livekitRoomName='idempotency-test-room',
            livekitRoomSid='RM_idempotency',
            direction='inbound',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=30),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )
        db_session.add(call_log)
        db_session.commit()

        # 2. Create webhook payload
        webhook_payload = {
            'id': 'evt_idempotency_duplicate',  # Same event_id for both deliveries
            'event': 'participant_left',
            'createdAt': datetime.utcnow().isoformat() + 'Z',
            'room': {
                'name': 'idempotency-test-room',
                'sid': 'RM_idempotency',
                'creationTime': (datetime.utcnow() - timedelta(seconds=30)).isoformat() + 'Z'
            },
            'participant': {
                'sid': 'PA_idempotency',
                'identity': 'agent',
                'disconnectReason': ''
            }
        }

        # 3. First delivery
        normalized_event = self.transformer.transform(webhook_payload)
        success1, message1 = self.service.process_webhook_event(normalized_event, db_session=db_session)

        assert success1 is True
        assert 'Outcome:' in message1

        # Get state after first processing
        db_session.refresh(call_log)
        first_outcome = call_log.outcome
        first_updated_at = call_log.updatedAt

        # 4. Second delivery (duplicate)
        normalized_event_2 = self.transformer.transform(webhook_payload)
        success2, message2 = self.service.process_webhook_event(normalized_event_2, db_session=db_session)

        # Should succeed but skip processing
        assert success2 is True
        assert 'already processed' in message2

        # 5. Verify state unchanged
        db_session.refresh(call_log)
        assert call_log.outcome == first_outcome
        assert call_log.updatedAt == first_updated_at

        # 6. Verify only one event record
        event_count = db_session.query(LiveKitCallEvent).filter_by(
            eventId='evt_idempotency_duplicate'
        ).count()
        assert event_count == 1


@pytest.mark.integration
@pytest.mark.multitenant
class TestMultiTenantIntegration:
    """Integration tests for multi-tenant isolation"""

    def setup_method(self):
        """Setup test instances"""
        self.service = CallOutcomeService()

    def test_multi_tenant_webhook_isolation(self, db_session, test_user, test_user_2):
        """Test that webhook processing respects tenant boundaries"""
        # Create call_log for user_1
        call_log_1 = CallLog(
            id='mt_call_1',
            userId=test_user.id,
            livekitRoomName='mt-user1-room',
            livekitRoomSid='RM_user1',
            direction='inbound',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=30),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        # Create call_log for user_2
        call_log_2 = CallLog(
            id='mt_call_2',
            userId=test_user_2.id,
            livekitRoomName='mt-user2-room',
            livekitRoomSid='RM_user2',
            direction='inbound',
            status='active',
            startedAt=datetime.utcnow() - timedelta(seconds=30),
            createdAt=datetime.utcnow(),
            updatedAt=datetime.utcnow()
        )

        db_session.add_all([call_log_1, call_log_2])
        db_session.commit()

        # User 1 can retrieve their call
        result_1 = self.service.get_call_outcome('mt_call_1', test_user.id, db_session=db_session)
        assert result_1 is not None
        assert result_1['userId'] == test_user.id

        # User 1 cannot retrieve User 2's call
        result_cross = self.service.get_call_outcome('mt_call_2', test_user.id, db_session=db_session)
        assert result_cross is None

        # User 2 can retrieve their call
        result_2 = self.service.get_call_outcome('mt_call_2', test_user_2.id, db_session=db_session)
        assert result_2 is not None
        assert result_2['userId'] == test_user_2.id
