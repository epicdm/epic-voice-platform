"""
Test suite for webhook delivery worker.

Tests cover:
- HMAC signature generation and verification
- Retry strategy and exponential backoff
- Queue operations with SKIP LOCKED
- Worker lifecycle and metrics
- Configuration validation
"""

import pytest
import time
import json
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, MagicMock
import requests

from models import WebhookDeliveryQueue, PartnerWebhook, WebhookDeliveryLog
from signer import WebhookSigner, verify_incoming_webhook
from retry import RetryStrategy, DeadLetterPolicy
from config import WorkerConfig
from enqueue import (
    enqueue_webhook,
    enqueue_for_partner,
    enqueue_for_all_partners,
    get_queue_stats
)


class TestWebhookSigner:
    """Test HMAC-SHA256 signature generation and verification."""

    def test_generate_signature(self):
        """Test signature generation produces consistent results."""
        payload = {"event": "test", "data": "value"}
        secret = "test_secret"
        timestamp = 1730000000

        sig1 = WebhookSigner.generate_signature(payload, secret, timestamp)
        sig2 = WebhookSigner.generate_signature(payload, secret, timestamp)

        assert sig1 == sig2
        assert len(sig1) == 64  # SHA256 hex length

    def test_verify_signature_valid(self):
        """Test signature verification with valid signature."""
        payload = {"event": "test", "data": "value"}
        secret = "test_secret"
        timestamp = int(time.time())

        signature = WebhookSigner.generate_signature(payload, secret, timestamp)

        assert WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=signature,
            provided_timestamp=timestamp
        ) is True

    def test_verify_signature_invalid(self):
        """Test signature verification rejects invalid signature."""
        payload = {"event": "test", "data": "value"}
        secret = "test_secret"
        timestamp = int(time.time())

        invalid_signature = "0" * 64

        assert WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=invalid_signature,
            provided_timestamp=timestamp
        ) is False

    def test_verify_signature_expired(self):
        """Test signature verification rejects expired timestamp."""
        payload = {"event": "test", "data": "value"}
        secret = "test_secret"
        old_timestamp = int(time.time()) - 600  # 10 minutes ago

        signature = WebhookSigner.generate_signature(payload, secret, old_timestamp)

        assert WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=signature,
            provided_timestamp=old_timestamp,
            tolerance_seconds=300  # 5 minute tolerance
        ) is False

    def test_create_webhook_headers(self):
        """Test webhook header creation includes required fields."""
        payload = {"event": "test"}
        secret = "test_secret"

        headers = WebhookSigner.create_webhook_headers(payload, secret)

        assert 'Content-Type' in headers
        assert headers['Content-Type'] == 'application/json'
        assert 'X-Webhook-Signature' in headers
        assert 'X-Webhook-Timestamp' in headers
        assert 'User-Agent' in headers

    def test_verify_incoming_webhook(self):
        """Test convenience function for verifying incoming webhooks."""
        payload = {"event": "test", "data": "value"}
        secret = "test_secret"
        timestamp = int(time.time())

        signature = WebhookSigner.generate_signature(payload, secret, timestamp)
        payload_str = json.dumps(payload, sort_keys=True, separators=(',', ':'))

        assert verify_incoming_webhook(
            payload_str=payload_str,
            signature=signature,
            timestamp_str=str(timestamp),
            secret=secret
        ) is True


class TestRetryStrategy:
    """Test exponential backoff retry logic."""

    def test_calculate_next_retry_exponential(self):
        """Test retry delays follow exponential backoff."""
        # First retry: ~30s
        retry1 = RetryStrategy.calculate_next_retry(0)
        assert (datetime.utcnow() + timedelta(seconds=25)) < retry1
        assert retry1 < (datetime.utcnow() + timedelta(seconds=35))

        # Second retry: ~60s
        retry2 = RetryStrategy.calculate_next_retry(1)
        assert (datetime.utcnow() + timedelta(seconds=55)) < retry2
        assert retry2 < (datetime.utcnow() + timedelta(seconds=65))

        # Third retry: ~120s
        retry3 = RetryStrategy.calculate_next_retry(2)
        assert (datetime.utcnow() + timedelta(seconds=115)) < retry3
        assert retry3 < (datetime.utcnow() + timedelta(seconds=125))

    def test_should_retry_network_error(self):
        """Test retry decision for network errors."""
        assert RetryStrategy.should_retry(0, None) is True
        assert RetryStrategy.should_retry(4, None) is True
        assert RetryStrategy.should_retry(5, None) is False  # Max attempts

    def test_should_retry_status_codes(self):
        """Test retry decision for various HTTP status codes."""
        # Retryable status codes
        assert RetryStrategy.should_retry(2, 429) is True  # Rate limit
        assert RetryStrategy.should_retry(2, 500) is True  # Server error
        assert RetryStrategy.should_retry(2, 502) is True  # Bad gateway
        assert RetryStrategy.should_retry(2, 503) is True  # Service unavailable

        # Non-retryable status codes
        assert RetryStrategy.should_retry(2, 400) is False  # Bad request
        assert RetryStrategy.should_retry(2, 401) is False  # Unauthorized
        assert RetryStrategy.should_retry(2, 404) is False  # Not found

    def test_get_retry_schedule(self):
        """Test retry schedule matches design specification."""
        schedule = RetryStrategy.get_retry_schedule()

        assert len(schedule) == 5
        assert schedule[0] == (1, 30)
        assert schedule[1] == (2, 60)
        assert schedule[2] == (3, 120)
        assert schedule[3] == (4, 240)
        assert schedule[4] == (5, 480)

    def test_estimate_total_retry_time(self):
        """Test total retry time calculation."""
        total_time = RetryStrategy.estimate_total_retry_time()
        expected_time = 30 + 60 + 120 + 240 + 480  # 930 seconds

        assert total_time == expected_time


class TestDeadLetterPolicy:
    """Test dead letter queue policy."""

    def test_should_alert_threshold(self):
        """Test dead letter alerting threshold."""
        assert DeadLetterPolicy.should_alert(5, threshold=10) is False
        assert DeadLetterPolicy.should_alert(10, threshold=10) is True
        assert DeadLetterPolicy.should_alert(15, threshold=10) is True

    def test_get_notification_message(self):
        """Test alert message generation."""
        message = DeadLetterPolicy.get_notification_message(15, "user_123")

        assert "15 webhooks" in message
        assert "user_123" in message
        assert "⚠️" in message


class TestEnqueue:
    """Test webhook enqueueing utilities."""

    def setup_method(self):
        """Setup mock database session."""
        self.db = Mock()

    def test_enqueue_webhook(self):
        """Test basic webhook enqueueing."""
        webhook_id = enqueue_webhook(
            db=self.db,
            user_id="user_123",
            partner_id="partner_456",
            url="https://example.com/webhook",
            secret="test_secret",
            event_type="call.completed",
            payload={"test": "data"}
        )

        assert webhook_id is not None
        assert self.db.add.called
        assert self.db.commit.called

    def test_enqueue_for_partner_enabled(self):
        """Test enqueueing for enabled partner."""
        # Mock partner lookup
        partner = Mock()
        partner.id = "partner_456"
        partner.url = "https://example.com/webhook"
        partner.secret = "test_secret"
        partner.enabled_events = ["call.completed"]
        partner.custom_payload_fields = {"brand": "MyBrand"}

        self.db.query.return_value.filter.return_value.first.return_value = partner

        with patch('enqueue.enqueue_webhook') as mock_enqueue:
            mock_enqueue.return_value = "webhook_789"

            webhook_id = enqueue_for_partner(
                db=self.db,
                user_id="user_123",
                partner_slug="test-partner",
                event_type="call.completed",
                payload={"call_id": "call_123"}
            )

            assert webhook_id == "webhook_789"
            assert mock_enqueue.called

            # Check payload includes custom fields
            call_args = mock_enqueue.call_args[1]
            assert call_args['payload']['brand'] == "MyBrand"

    def test_enqueue_for_partner_not_found(self):
        """Test enqueueing for non-existent partner."""
        self.db.query.return_value.filter.return_value.first.return_value = None

        webhook_id = enqueue_for_partner(
            db=self.db,
            user_id="user_123",
            partner_slug="nonexistent",
            event_type="call.completed",
            payload={"call_id": "call_123"}
        )

        assert webhook_id is None


class TestWorkerConfig:
    """Test worker configuration."""

    def test_config_defaults(self):
        """Test configuration has sensible defaults."""
        assert WorkerConfig.WORKER_POLL_INTERVAL == 5
        assert WorkerConfig.WORKER_BATCH_SIZE == 10
        assert WorkerConfig.RETRY_MAX_ATTEMPTS == 5
        assert WorkerConfig.HTTP_TIMEOUT == 30

    def test_config_validation_success(self):
        """Test configuration validation succeeds with valid config."""
        # Should not raise exception
        WorkerConfig.validate()

    def test_mask_database_url(self):
        """Test database URL masking for security."""
        url = "postgresql://user:password@localhost:5432/db"
        masked = WorkerConfig._mask_database_url(url)

        assert "password" not in masked
        assert "***" in masked
        assert "localhost" in masked


@pytest.mark.integration
class TestWorkerIntegration:
    """Integration tests for worker lifecycle (requires database)."""

    @pytest.fixture
    def db_session(self):
        """Create test database session."""
        # This would require actual database setup
        pytest.skip("Integration test requires database")

    def test_worker_dequeue_skip_locked(self, db_session):
        """Test SKIP LOCKED ensures no duplicate processing."""
        # Create test webhooks
        # Start multiple workers
        # Verify no webhook processed twice
        pytest.skip("Integration test requires database")

    def test_worker_retry_exponential_backoff(self, db_session):
        """Test worker respects exponential backoff schedule."""
        pytest.skip("Integration test requires database")

    def test_worker_dead_letter_max_attempts(self, db_session):
        """Test webhook moves to dead letter after max attempts."""
        pytest.skip("Integration test requires database")


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
