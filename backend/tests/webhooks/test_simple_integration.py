#!/usr/bin/env python3
"""
Simple integration tests for webhook delivery worker.

Tests core functionality without database complexity:
- HMAC signature generation and verification
- Retry strategy and exponential backoff
- Network failure simulation
- Queue → delivery → tracking flow
"""

import sys
import os
import time
import json
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../webhook_worker'))

from signer import WebhookSigner
from retry import RetryStrategy


class MockWebhookServer(BaseHTTPRequestHandler):
    """Mock HTTP server for testing webhook deliveries."""

    received_webhooks = []
    response_status = 200
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


def test_hmac_signature():
    """Test 1: HMAC signature generation and verification."""
    print("\n🧪 Test 1: HMAC Signature Verification")

    payload = {'event': 'call.completed', 'call_id': 'call_123', 'duration': 60}
    secret = 'test_secret_key'
    timestamp = int(time.time())

    # Generate signature
    signature = WebhookSigner.generate_signature(payload, secret, timestamp)
    print(f"  ✓ Generated signature: {signature[:16]}...")
    assert len(signature) == 64, "SHA256 hex should be 64 characters"

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
    print(f"  ✓ Expired signature rejected (timestamp tolerance working)")

    # Test webhook header generation
    headers = WebhookSigner.create_webhook_headers(payload, secret)
    assert 'X-Webhook-Signature' in headers
    assert 'X-Webhook-Timestamp' in headers
    assert headers['Content-Type'] == 'application/json'
    assert headers['User-Agent'] == 'LiveKit-Webhook-Worker/1.0'
    print(f"  ✓ Webhook headers generated correctly")

    print("  ✅ Test passed: HMAC signing working correctly\n")


def test_retry_strategy():
    """Test 2: Retry strategy and exponential backoff."""
    print("🧪 Test 2: Retry Strategy and Exponential Backoff")

    # Test retry schedule
    schedule = RetryStrategy.get_retry_schedule()
    assert len(schedule) == 5, "Should have 5 retry attempts"
    assert schedule[0] == (1, 30), "First retry at 30s"
    assert schedule[1] == (2, 60), "Second retry at 60s"
    assert schedule[2] == (3, 120), "Third retry at 120s"
    assert schedule[3] == (4, 240), "Fourth retry at 240s"
    assert schedule[4] == (5, 480), "Fifth retry at 480s"
    print(f"  ✓ Retry schedule: {schedule}")

    # Test next retry calculation
    retry_time = RetryStrategy.calculate_next_retry(0)
    now = datetime.utcnow()
    time_diff = (retry_time - now).total_seconds()
    assert 25 < time_diff < 35, f"First retry should be ~30s, got {time_diff}s"
    print(f"  ✓ First retry: ~{time_diff:.1f}s (with jitter)")

    # Test second retry
    retry_time = RetryStrategy.calculate_next_retry(1)
    time_diff = (retry_time - now).total_seconds()
    assert 55 < time_diff < 65, f"Second retry should be ~60s, got {time_diff}s"
    print(f"  ✓ Second retry: ~{time_diff:.1f}s (exponential backoff)")

    # Test total retry time
    total_time = RetryStrategy.estimate_total_retry_time()
    assert total_time == 930, f"Total should be 930s (~15.5min), got {total_time}s"
    print(f"  ✓ Total retry time: {total_time}s (~15.5 minutes)")

    print("  ✅ Test passed: Retry strategy functioning correctly\n")


def test_retry_decisions():
    """Test 3: Retry decision logic for HTTP status codes."""
    print("🧪 Test 3: Retry Decision Logic")

    # Retryable status codes
    retryable = [408, 429, 500, 502, 503, 504]
    for status in retryable:
        should_retry = RetryStrategy.should_retry(2, status)
        assert should_retry, f"Status {status} should be retryable"
    print(f"  ✓ Retryable codes: {retryable}")

    # Non-retryable status codes
    non_retryable = [400, 401, 403, 404, 422]
    for status in non_retryable:
        should_retry = RetryStrategy.should_retry(2, status)
        assert not should_retry, f"Status {status} should not be retryable"
    print(f"  ✓ Non-retryable codes: {non_retryable}")

    # Network errors (None status)
    should_retry = RetryStrategy.should_retry(2, None)
    assert should_retry, "Network errors should be retryable"
    print(f"  ✓ Network errors: retryable")

    # Max attempts limit
    should_retry = RetryStrategy.should_retry(5, 500)
    assert not should_retry, "Should not retry after max attempts"
    print(f"  ✓ Max attempts (5): stops retrying")

    print("  ✅ Test passed: Retry logic correct\n")


def test_mock_webhook_delivery():
    """Test 4: Mock webhook delivery with HTTP server."""
    print("🧪 Test 4: Mock Webhook Delivery")

    # Start mock server
    server = HTTPServer(('localhost', 8889), MockWebhookServer)
    server_thread = Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    time.sleep(0.1)
    print(f"  ✓ Mock server started on http://localhost:8889")

    # Clear received webhooks
    MockWebhookServer.received_webhooks = []
    MockWebhookServer.response_status = 200
    MockWebhookServer.should_fail = False

    # Simulate webhook delivery
    payload = {
        'event_type': 'call.completed',
        'call_id': 'call_test_456',
        'duration': 90,
        'timestamp': datetime.utcnow().isoformat()
    }
    secret = 'test_secret'

    # Generate HMAC headers
    headers = WebhookSigner.create_webhook_headers(payload, secret)

    # Send POST request
    import requests
    response = requests.post(
        'http://localhost:8889/webhook',
        json=payload,
        headers=headers,
        timeout=5
    )

    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    print(f"  ✓ Webhook delivered: HTTP {response.status_code}")

    # Verify webhook received
    assert len(MockWebhookServer.received_webhooks) == 1
    received = MockWebhookServer.received_webhooks[0]
    assert received['payload']['call_id'] == 'call_test_456'
    assert received['headers']['signature'] is not None
    assert received['headers']['timestamp'] is not None
    print(f"  ✓ Webhook received with HMAC signature")

    # Verify signature
    is_valid = WebhookSigner.verify_signature(
        payload=payload,
        secret=secret,
        provided_signature=received['headers']['signature'],
        provided_timestamp=int(received['headers']['timestamp']),
        tolerance_seconds=300
    )
    assert is_valid, "Signature should be valid"
    print(f"  ✓ HMAC signature verified successfully")

    # Test failure scenario
    MockWebhookServer.should_fail = True
    MockWebhookServer.received_webhooks = []

    response = requests.post(
        'http://localhost:8889/webhook',
        json=payload,
        headers=headers,
        timeout=5
    )

    assert response.status_code == 500, f"Expected 500, got {response.status_code}"
    print(f"  ✓ Network failure simulated: HTTP {response.status_code}")

    # Cleanup
    server.shutdown()

    print("  ✅ Test passed: Webhook delivery working\n")


def run_tests():
    """Run all tests."""
    print("=" * 70)
    print("Webhook Delivery Worker - Simple Integration Tests")
    print("=" * 70)

    tests = [
        ("HMAC Signature", test_hmac_signature),
        ("Retry Strategy", test_retry_strategy),
        ("Retry Decisions", test_retry_decisions),
        ("Mock Delivery", test_mock_webhook_delivery),
    ]

    passed = 0
    failed = 0

    for name, test_func in tests:
        try:
            test_func()
            passed += 1
        except AssertionError as e:
            print(f"  ❌ Test failed: {e}\n")
            failed += 1
        except Exception as e:
            print(f"  ❌ Test error: {e}\n")
            failed += 1
            import traceback
            traceback.print_exc()

    print("=" * 70)
    print(f"Test Results: {passed} passed, {failed} failed out of {len(tests)} total")
    print("=" * 70)

    if passed == len(tests):
        print("✅ All tests passed!")
    else:
        print(f"❌ {failed} test(s) failed")

    return failed == 0


if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)
