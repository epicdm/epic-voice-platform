"""
Unit tests for LiveKitWebhookTransformer.

Tests:
- Webhook payload transformation
- Event filtering
- Field extraction
- Signature validation
- Phone number/campaign ID parsing
- Duration calculation
"""

import pytest
import hmac
import hashlib
import json
from datetime import datetime, timedelta

from backend.call_outcomes.transformer import LiveKitWebhookTransformer


@pytest.mark.unit
class TestLiveKitWebhookTransformer:
    """Test suite for LiveKitWebhookTransformer"""

    def setup_method(self):
        """Setup test instance"""
        self.transformer = LiveKitWebhookTransformer()

    def test_transform_participant_left(self, mock_webhook_payload):
        """Test successful transformation of participant_left event"""
        result = self.transformer.transform(mock_webhook_payload)

        assert result is not None
        assert result['event_id'] == mock_webhook_payload['id']
        assert result['event_type'] == 'participant_left'
        assert result['room_name'] == mock_webhook_payload['room']['name']
        assert result['room_sid'] == mock_webhook_payload['room']['sid']
        assert result['participant_sid'] == mock_webhook_payload['participant']['sid']
        assert result['disconnect_reason'] == mock_webhook_payload['participant']['disconnectReason']
        assert result['raw_payload'] == mock_webhook_payload

    def test_transform_room_finished(self):
        """Test transformation of room_finished event"""
        payload = {
            'id': 'evt_room_finished',
            'event': 'room_finished',
            'createdAt': '2025-10-29T12:34:56Z',
            'room': {
                'name': 'test-room',
                'sid': 'RM_123',
                'creationTime': '2025-10-29T12:34:10Z'
            }
        }

        result = self.transformer.transform(payload)

        assert result is not None
        assert result['event_type'] == 'room_finished'
        assert result['room_name'] == 'test-room'

    def test_transform_ignores_non_processable_events(self):
        """Test that non-processable events are ignored"""
        payload = {
            'id': 'evt_123',
            'event': 'track_published',  # Not in PROCESSABLE_EVENTS
            'room': {'name': 'test-room'}
        }

        result = self.transformer.transform(payload)

        assert result is None

    def test_transform_missing_event_id(self):
        """Test transformation fails gracefully with missing event ID"""
        payload = {
            'event': 'participant_left',
            'room': {'name': 'test-room'}
            # Missing 'id'
        }

        result = self.transformer.transform(payload)

        assert result is None

    def test_transform_missing_room_name(self):
        """Test transformation fails gracefully with missing room name"""
        payload = {
            'id': 'evt_123',
            'event': 'participant_left',
            'room': {}  # Missing 'name'
        }

        result = self.transformer.transform(payload)

        assert result is None

    def test_validate_signature_correct(self, livekit_webhook_secret):
        """Test signature validation with correct signature"""
        payload = json.dumps({'test': 'data'}).encode('utf-8')

        # Generate correct signature
        signature = hmac.new(
            livekit_webhook_secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        result = self.transformer.validate_signature(
            payload, signature, livekit_webhook_secret
        )

        assert result is True

    def test_validate_signature_incorrect(self, livekit_webhook_secret):
        """Test signature validation with incorrect signature"""
        payload = json.dumps({'test': 'data'}).encode('utf-8')
        incorrect_signature = 'abc123incorrect'

        result = self.transformer.validate_signature(
            payload, incorrect_signature, livekit_webhook_secret
        )

        assert result is False

    def test_validate_signature_missing_signature(self, livekit_webhook_secret):
        """Test signature validation with missing signature"""
        payload = json.dumps({'test': 'data'}).encode('utf-8')

        result = self.transformer.validate_signature(
            payload, '', livekit_webhook_secret
        )

        assert result is False

    def test_validate_signature_missing_secret(self):
        """Test signature validation with missing secret"""
        payload = json.dumps({'test': 'data'}).encode('utf-8')
        signature = 'abc123'

        result = self.transformer.validate_signature(
            payload, signature, ''
        )

        assert result is False

    def test_extract_phone_number_from_inbound_room(self):
        """Test phone number extraction from inbound room name"""
        room_name = 'sip-7678189426__1730000000__abc123'

        result = self.transformer.extract_phone_number_from_room_name(room_name)

        assert result == '+17678189426'

    def test_extract_phone_number_11_digit(self):
        """Test phone number extraction with 11-digit format"""
        room_name = 'sip-17678189426__1730000000__abc123'

        result = self.transformer.extract_phone_number_from_room_name(room_name)

        assert result == '+17678189426'

    def test_extract_phone_number_non_sip_room(self):
        """Test phone number extraction returns None for non-SIP rooms"""
        room_name = 'campaign-C123__lead-L456__1730000000'

        result = self.transformer.extract_phone_number_from_room_name(room_name)

        assert result is None

    def test_extract_campaign_id_from_outbound_room(self):
        """Test campaign ID extraction from outbound room name"""
        room_name = 'campaign-C123__lead-L456__1730000000'

        result = self.transformer.extract_campaign_id_from_room_name(room_name)

        assert result == 'C123'

    def test_extract_campaign_id_non_campaign_room(self):
        """Test campaign ID extraction returns None for non-campaign rooms"""
        room_name = 'sip-7678189426__1730000000__abc123'

        result = self.transformer.extract_campaign_id_from_room_name(room_name)

        assert result is None

    def test_calculate_duration_normal(self):
        """Test duration calculation for normal call"""
        started_at = '2025-10-29T12:34:10Z'
        ended_at = '2025-10-29T12:34:55Z'

        result = self.transformer.calculate_duration(started_at, ended_at)

        assert result == 45  # 45 seconds

    def test_calculate_duration_short(self):
        """Test duration calculation for short call"""
        started_at = '2025-10-29T12:34:10Z'
        ended_at = '2025-10-29T12:34:15Z'

        result = self.transformer.calculate_duration(started_at, ended_at)

        assert result == 5  # 5 seconds

    def test_calculate_duration_missing_timestamps(self):
        """Test duration calculation with missing timestamps"""
        result = self.transformer.calculate_duration('', '')

        assert result == 0

    def test_calculate_duration_invalid_format(self):
        """Test duration calculation with invalid timestamp format"""
        result = self.transformer.calculate_duration('invalid', 'invalid')

        assert result == 0

    def test_extract_recording_url_present(self):
        """Test recording URL extraction when present"""
        egress_info = {
            'fileResults': [
                {'download_url': 'https://example.com/recording.mp4'}
            ]
        }

        result = self.transformer._extract_recording_url(egress_info)

        assert result == 'https://example.com/recording.mp4'

    def test_extract_recording_url_downloadUrl_key(self):
        """Test recording URL extraction with downloadUrl key"""
        egress_info = {
            'fileResults': [
                {'downloadUrl': 'https://example.com/recording.mp4'}
            ]
        }

        result = self.transformer._extract_recording_url(egress_info)

        assert result == 'https://example.com/recording.mp4'

    def test_extract_recording_url_missing(self):
        """Test recording URL extraction when missing"""
        egress_info = {'fileResults': []}

        result = self.transformer._extract_recording_url(egress_info)

        assert result is None

    def test_extract_recording_url_no_file_results(self):
        """Test recording URL extraction with no fileResults"""
        egress_info = {}

        result = self.transformer._extract_recording_url(egress_info)

        assert result is None
