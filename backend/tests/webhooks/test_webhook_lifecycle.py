"""
Integration tests for webhook delivery lifecycle.

Tests cover:
- Event enqueueing → delivery → tracking
- Network failures → retry with exponential backoff
- HMAC signature verification
- Dead letter queue transitions
"""

import sys
import os
import time
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import Mock, patch, MagicMock
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
import requests

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../webhook_worker'))

from models import WebhookDeliveryQueue, PartnerWebhook, WebhookDeliveryLog, Base
from signer import WebhookSigner
from retry import RetryStrategy
from enqueue import enqueue_webhook, enqueue_for_partner
from worker import WebhookWorker
from config import WorkerConfig

from sqlalchemy import create_engine, text, Column, String
from sqlalchemy.orm import sessionmaker

# Create minimal User model in webhook Base for testing
class User(Base):
    """Minimal User model for testing foreign key constraints."""
    __tablename__ = 'users'
    id = Column(String(36), primary_key=True)
    email = Column(String(255))


class MockWebhookServer(BaseHTTPRequestHandler):
    """Mock HTTP server for testing webhook deliveries."""

    # Class variables to track requests
    received_webhooks = []
    response_status = 200
    response_delay = 0
    should_fail = False

    def do_POST(self):
        """Handle POST requests (webhook deliveries)."""
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8')

        # Parse payload
        payload = json.loads(body) if body else {}

        # Get headers
        headers = {
            'signature': self.headers.get('X-Webhook-Signature'),
            'timestamp': self.headers.get('X-Webhook-Timestamp'),
            'user_agent': self.headers.get('User-Agent')
        }

        # Store received webhook
        MockWebhookServer.received_webhooks.append({
            'path': self.path,
            'payload': payload,
            'headers': headers,
            'timestamp': datetime.utcnow()
        })

        # Simulate delay if configured
        if MockWebhookServer.response_delay > 0:
            time.sleep(MockWebhookServer.response_delay)

        # Send response
        if MockWebhookServer.should_fail:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error": "Internal Server Error"}')
        else:
            self.send_response(MockWebhookServer.response_status)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "received"}')

    def log_message(self, format, *args):
        """Suppress server log messages."""
        pass


class TestWebhookLifecycle:
    """Test complete webhook delivery lifecycle."""

    @classmethod
    def setup_class(cls):
        """Setup test database and mock server."""
        # Use in-memory SQLite for testing
        cls.engine = create_engine('sqlite:///:memory:', echo=False)

        # Create all tables (users + webhook tables)
        Base.metadata.create_all(cls.engine)

        cls.Session = sessionmaker(bind=cls.engine)

        # Start mock webhook server
        cls.server = HTTPServer(('localhost', 8888), MockWebhookServer)
        cls.server_thread = Thread(target=cls.server.serve_forever, daemon=True)
        cls.server_thread.start()
        time.sleep(0.1)  # Wait for server to start

        print("✓ Test setup complete: Database and mock server ready")

    @classmethod
    def teardown_class(cls):
        """Cleanup test resources."""
        cls.server.shutdown()
        print("✓ Test teardown complete")

    def setup_method(self):
        """Reset state before each test."""
        # Clear received webhooks
        MockWebhookServer.received_webhooks = []
        MockWebhookServer.response_status = 200
        MockWebhookServer.response_delay = 0
        MockWebhookServer.should_fail = False

        # Create fresh database session
        self.db = self.Session()

    def teardown_method(self):
        """Cleanup after each test."""
        self.db.close()

    def test_simple_webhook_delivery(self):
        """Test basic webhook enqueue → delivery → success flow."""
        print("\n🧪 Test: Simple webhook delivery")

        # Enqueue webhook
        webhook_id = enqueue_webhook(
            db=self.db,
            user_id='test_user_1',
            partner_id=None,
            url='http://localhost:8888/webhook',
            secret='test_secret',
            event_type='call.completed',
            payload={'call_id': 'call_123', 'duration': 60}
        )

        print(f"  ✓ Webhook enqueued: {webhook_id}")

        # Verify webhook in database
        webhook = self.db.query(WebhookDeliveryQueue).filter_by(id=webhook_id).first()
        assert webhook is not None
        assert webhook.status == 'pending'
        assert webhook.attempt_count == 0
        print(f"  ✓ Webhook in queue: status={webhook.status}, attempts={webhook.attempt_count}")

        # Simulate worker delivery (manual)
        worker = WebhookWorker(worker_id='test')
        worker.Session = self.Session

        success = worker.deliver_webhook(webhook, self.db)

        print(f"  ✓ Delivery result: {'success' if success else 'failed'}")
        assert success, "Webhook delivery should succeed"

        # Verify webhook marked as delivered
        self.db.refresh(webhook)
        assert webhook.status == 'delivered'
        assert webhook.deliveredAt is not None
        assert webhook.last_response_status == 200
        print(f"  ✓ Webhook status updated: {webhook.status}")

        # Verify webhook received by mock server
        assert len(MockWebhookServer.received_webhooks) == 1
        received = MockWebhookServer.received_webhooks[0]
        assert received['payload']['call_id'] == 'call_123'
        assert received['headers']['signature'] is not None
        assert received['headers']['timestamp'] is not None
        print(f"  ✓ Webhook received by server with HMAC signature")

        print("  ✅ Test passed: Simple delivery successful")

    def test_hmac_signature_verification(self):
        """Test HMAC signature generation and verification."""
        print("\n🧪 Test: HMAC signature verification")

        payload = {'event': 'test', 'data': 'value'}
        secret = 'test_secret_key'

        # Generate signature
        timestamp = int(time.time())
        signature = WebhookSigner.generate_signature(payload, secret, timestamp)

        print(f"  ✓ Generated signature: {signature[:16]}...")
        assert len(signature) == 64  # SHA256 hex

        # Verify valid signature
        is_valid = WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=signature,
            provided_timestamp=timestamp,
            tolerance_seconds=300
        )
        assert is_valid, "Valid signature should verify"
        print(f"  ✓ Valid signature verified successfully")

        # Test invalid signature
        invalid_sig = '0' * 64
        is_valid = WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=invalid_sig,
            provided_timestamp=timestamp
        )
        assert not is_valid, "Invalid signature should fail"
        print(f"  ✓ Invalid signature rejected")

        # Test expired timestamp
        old_timestamp = timestamp - 600  # 10 minutes ago
        old_signature = WebhookSigner.generate_signature(payload, secret, old_timestamp)
        is_valid = WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=old_signature,
            provided_timestamp=old_timestamp,
            tolerance_seconds=300  # 5 minute tolerance
        )
        assert not is_valid, "Expired signature should fail"
        print(f"  ✓ Expired signature rejected")

        print("  ✅ Test passed: HMAC verification working correctly")

    def test_network_failure_retry(self):
        """Test network failure triggers retry with exponential backoff."""
        print("\n🧪 Test: Network failure → retry logic")

        # Configure mock server to fail
        MockWebhookServer.should_fail = True

        # Enqueue webhook
        webhook_id = enqueue_webhook(
            db=self.db,
            user_id='test_user_2',
            partner_id=None,
            url='http://localhost:8888/webhook',
            secret='test_secret',
            event_type='call.completed',
            payload={'call_id': 'call_456'}
        )

        webhook = self.db.query(WebhookDeliveryQueue).filter_by(id=webhook_id).first()
        print(f"  ✓ Webhook enqueued: {webhook_id}")

        # Attempt delivery (should fail)
        worker = WebhookWorker(worker_id='test')
        worker.Session = self.Session

        success = worker.deliver_webhook(webhook, self.db)

        assert not success, "Delivery should fail with 500 error"
        print(f"  ✓ Delivery failed as expected (HTTP 500)")

        # Verify retry scheduled
        self.db.refresh(webhook)
        assert webhook.status == 'failed'
        assert webhook.attempt_count == 1
        assert webhook.next_retry_at is not None
        assert webhook.last_response_status == 500

        # Verify exponential backoff timing
        retry_delay = (webhook.next_retry_at - datetime.utcnow()).total_seconds()
        assert 25 < retry_delay < 35, f"First retry should be ~30s, got {retry_delay}s"
        print(f"  ✓ Retry scheduled with exponential backoff: ~{retry_delay:.1f}s")

        # Simulate second attempt (still failing)
        webhook.status = 'pending'
        webhook.next_retry_at = datetime.utcnow()
        self.db.commit()

        success = worker.deliver_webhook(webhook, self.db)
        assert not success

        self.db.refresh(webhook)
        assert webhook.attempt_count == 2
        retry_delay = (webhook.next_retry_at - datetime.utcnow()).total_seconds()
        assert 55 < retry_delay < 65, f"Second retry should be ~60s, got {retry_delay}s"
        print(f"  ✓ Second retry scheduled: ~{retry_delay:.1f}s (exponential backoff working)")

        print("  ✅ Test passed: Retry logic functioning correctly")

    def test_dead_letter_queue_max_attempts(self):
        """Test webhook moves to dead letter after max attempts."""
        print("\n🧪 Test: Dead letter queue after max attempts")

        # Configure mock server to always fail
        MockWebhookServer.should_fail = True

        # Enqueue webhook with low max attempts for testing
        webhook = WebhookDeliveryQueue(
            id=str(uuid.uuid4()),
            userId='test_user_3',
            url='http://localhost:8888/webhook',
            secret='test_secret',
            event_type='call.completed',
            payload={'call_id': 'call_789'},
            status='pending',
            attempt_count=0,
            max_attempts=3,  # Lower for faster testing
            next_retry_at=datetime.utcnow()
        )
        self.db.add(webhook)
        self.db.commit()

        print(f"  ✓ Webhook created with max_attempts=3")

        worker = WebhookWorker(worker_id='test')
        worker.Session = self.Session

        # Attempt delivery 3 times
        for attempt in range(1, 4):
            webhook.status = 'pending'
            webhook.next_retry_at = datetime.utcnow()
            self.db.commit()

            success = worker.deliver_webhook(webhook, self.db)
            assert not success

            self.db.refresh(webhook)
            print(f"  ✓ Attempt {attempt}: status={webhook.status}, attempts={webhook.attempt_count}")

            if attempt < 3:
                assert webhook.status == 'failed'
                assert RetryStrategy.should_retry(webhook.attempt_count, 500)
            else:
                # After max attempts, should be dead letter
                assert webhook.status == 'dead_letter'
                assert not RetryStrategy.should_retry(webhook.attempt_count, 500)
                print(f"  ✓ Webhook moved to dead letter queue after {webhook.attempt_count} attempts")

        print("  ✅ Test passed: Dead letter queue transition working")

    def test_audit_log_tracking(self):
        """Test that all delivery attempts are logged to audit table."""
        print("\n🧪 Test: Audit log tracking")

        # Enable audit logging
        WorkerConfig.AUDIT_LOG_ENABLED = True

        # Enqueue webhook
        webhook_id = enqueue_webhook(
            db=self.db,
            user_id='test_user_4',
            partner_id=None,
            url='http://localhost:8888/webhook',
            secret='test_secret',
            event_type='call.completed',
            payload={'call_id': 'call_audit'}
        )

        webhook = self.db.query(WebhookDeliveryQueue).filter_by(id=webhook_id).first()

        worker = WebhookWorker(worker_id='test')
        worker.Session = self.Session

        # Deliver webhook
        success = worker.deliver_webhook(webhook, self.db)
        assert success
        print(f"  ✓ Webhook delivered successfully")

        # Check audit log
        log_entries = self.db.query(WebhookDeliveryLog).filter_by(
            webhookQueueId=webhook_id
        ).all()

        assert len(log_entries) == 1, "Should have 1 audit log entry"
        log = log_entries[0]

        assert log.userId == 'test_user_4'
        assert log.attempt_number == 1
        assert log.success is True
        assert log.response_status == 200
        assert log.response_time_ms is not None
        assert log.url == 'http://localhost:8888/webhook'

        print(f"  ✓ Audit log created:")
        print(f"    - Attempt: {log.attempt_number}")
        print(f"    - Success: {log.success}")
        print(f"    - Status: {log.response_status}")
        print(f"    - Response time: {log.response_time_ms}ms")

        print("  ✅ Test passed: Audit logging working correctly")

    def test_partner_webhook_integration(self):
        """Test enqueueing webhooks via partner configuration."""
        print("\n🧪 Test: Partner webhook integration")

        # Create partner configuration
        partner = PartnerWebhook(
            id=str(uuid.uuid4()),
            userId='test_user_5',
            partner_name='Test Partner Inc',
            partner_slug='test-partner',
            url='http://localhost:8888/webhook',
            secret='partner_secret',
            enabled_events=['call.completed', 'call.failed'],
            custom_payload_fields={'brand': 'TestBrand', 'environment': 'testing'},
            enabled=True
        )
        self.db.add(partner)
        self.db.commit()

        print(f"  ✓ Partner configuration created: {partner.partner_name}")

        # Enqueue webhook for partner
        webhook_id = enqueue_for_partner(
            db=self.db,
            user_id='test_user_5',
            partner_slug='test-partner',
            event_type='call.completed',
            payload={'call_id': 'call_partner', 'duration': 90}
        )

        assert webhook_id is not None, "Webhook should be enqueued"
        print(f"  ✓ Webhook enqueued for partner: {webhook_id}")

        # Verify webhook has custom fields
        webhook = self.db.query(WebhookDeliveryQueue).filter_by(id=webhook_id).first()
        assert webhook.partnerId == partner.id
        assert webhook.payload['brand'] == 'TestBrand'
        assert webhook.payload['environment'] == 'testing'
        print(f"  ✓ Custom payload fields applied:")
        print(f"    - brand: {webhook.payload['brand']}")
        print(f"    - environment: {webhook.payload['environment']}")

        # Test event filtering (non-subscribed event)
        webhook_id_2 = enqueue_for_partner(
            db=self.db,
            user_id='test_user_5',
            partner_slug='test-partner',
            event_type='recording.ready',  # Not in enabled_events
            payload={'recording_id': 'rec_123'}
        )

        assert webhook_id_2 is None, "Should not enqueue non-subscribed event"
        print(f"  ✓ Event filtering working: non-subscribed event not enqueued")

        print("  ✅ Test passed: Partner integration working correctly")

    def test_retry_strategy_decisions(self):
        """Test retry strategy decision logic for various HTTP status codes."""
        print("\n🧪 Test: Retry strategy decisions")

        # Test retryable status codes
        retryable_statuses = [408, 429, 500, 502, 503, 504]
        for status in retryable_statuses:
            should_retry = RetryStrategy.should_retry(2, status)
            assert should_retry, f"Status {status} should be retryable"
            print(f"  ✓ Status {status}: Retryable ✓")

        # Test non-retryable status codes
        non_retryable_statuses = [400, 401, 403, 404, 422]
        for status in non_retryable_statuses:
            should_retry = RetryStrategy.should_retry(2, status)
            assert not should_retry, f"Status {status} should not be retryable"
            print(f"  ✓ Status {status}: Not retryable ✗")

        # Test network errors (None status)
        should_retry = RetryStrategy.should_retry(2, None)
        assert should_retry, "Network errors should be retryable"
        print(f"  ✓ Network error (None): Retryable ✓")

        # Test max attempts limit
        should_retry = RetryStrategy.should_retry(5, 500)
        assert not should_retry, "Should not retry after max attempts"
        print(f"  ✓ Max attempts (5): Not retryable ✗")

        print("  ✅ Test passed: Retry strategy logic correct")


def run_tests():
    """Run all webhook lifecycle tests."""
    print("=" * 70)
    print("Webhook Delivery Lifecycle - Integration Tests")
    print("=" * 70)

    test_suite = TestWebhookLifecycle()
    test_suite.setup_class()

    tests = [
        ('Simple delivery', test_suite.test_simple_webhook_delivery),
        ('HMAC verification', test_suite.test_hmac_signature_verification),
        ('Network failure retry', test_suite.test_network_failure_retry),
        ('Dead letter queue', test_suite.test_dead_letter_queue_max_attempts),
        ('Audit logging', test_suite.test_audit_log_tracking),
        ('Partner integration', test_suite.test_partner_webhook_integration),
        ('Retry strategy', test_suite.test_retry_strategy_decisions),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_suite.setup_method()
            test_func()
            test_suite.teardown_method()
            passed += 1
        except AssertionError as e:
            print(f"  ❌ Test failed: {e}")
            failed += 1
        except Exception as e:
            print(f"  ❌ Test error: {e}")
            failed += 1
            import traceback
            traceback.print_exc()

    test_suite.teardown_class()

    print()
    print("=" * 70)
    print(f"Test Results: {passed} passed, {failed} failed out of {len(tests)} total")
    print("=" * 70)

    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
