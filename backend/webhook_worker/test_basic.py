#!/usr/bin/env python3
"""
Basic test runner for webhook worker (no pytest required).

Validates core functionality:
- HMAC signature generation
- Retry strategy calculations
- Configuration loading
"""

import sys
import time
from datetime import datetime

# Test imports
try:
    from signer import WebhookSigner, verify_incoming_webhook
    from retry import RetryStrategy, DeadLetterPolicy, RETRY_SCHEDULE
    from config import WorkerConfig
    print("✅ All modules imported successfully")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


def test_hmac_signing():
    """Test HMAC signature generation and verification."""
    print("\n🔐 Testing HMAC Signing...")

    payload = {"event": "test", "data": "value"}
    secret = "test_secret"
    timestamp = int(time.time())

    # Generate signature
    signature = WebhookSigner.generate_signature(payload, secret, timestamp)
    assert len(signature) == 64, "Signature should be 64 hex characters"
    print(f"  ✓ Generated signature: {signature[:16]}...")

    # Verify signature
    is_valid = WebhookSigner.verify_signature(
        payload=payload,
        secret=secret,
        provided_signature=signature,
        provided_timestamp=timestamp
    )
    assert is_valid, "Valid signature should verify"
    print("  ✓ Signature verification passed")

    # Test invalid signature
    invalid_sig = "0" * 64
    is_valid = WebhookSigner.verify_signature(
        payload=payload,
        secret=secret,
        provided_signature=invalid_sig,
        provided_timestamp=timestamp
    )
    assert not is_valid, "Invalid signature should fail"
    print("  ✓ Invalid signature rejected")

    # Test webhook headers
    headers = WebhookSigner.create_webhook_headers(payload, secret)
    assert 'X-Webhook-Signature' in headers
    assert 'X-Webhook-Timestamp' in headers
    assert headers['Content-Type'] == 'application/json'
    print("  ✓ Webhook headers created correctly")

    print("✅ HMAC signing tests passed")


def test_retry_strategy():
    """Test exponential backoff retry logic."""
    print("\n🔄 Testing Retry Strategy...")

    # Test retry schedule
    schedule = RETRY_SCHEDULE
    assert len(schedule) == 5, "Should have 5 retry attempts"
    assert schedule[0] == (1, 30), "First retry at 30s"
    assert schedule[1] == (2, 60), "Second retry at 60s"
    assert schedule[2] == (3, 120), "Third retry at 120s"
    print(f"  ✓ Retry schedule: {schedule}")

    # Test next retry calculation
    retry_time = RetryStrategy.calculate_next_retry(0)
    now = datetime.utcnow()
    time_diff = (retry_time - now).total_seconds()
    assert 25 < time_diff < 35, f"First retry should be ~30s, got {time_diff}s"
    print(f"  ✓ First retry calculated: ~{time_diff:.1f}s")

    # Test retry decision
    assert RetryStrategy.should_retry(2, 500), "Should retry on 500 error"
    assert RetryStrategy.should_retry(2, 503), "Should retry on 503 error"
    assert not RetryStrategy.should_retry(2, 400), "Should not retry on 400 error"
    assert not RetryStrategy.should_retry(5, 500), "Should not retry after max attempts"
    print("  ✓ Retry decision logic correct")

    # Test total retry time
    total_time = RetryStrategy.estimate_total_retry_time()
    assert total_time == 930, f"Total retry time should be 930s, got {total_time}s"
    print(f"  ✓ Total retry time: {total_time}s (~15.5 minutes)")

    print("✅ Retry strategy tests passed")


def test_dead_letter_policy():
    """Test dead letter queue policy."""
    print("\n💀 Testing Dead Letter Policy...")

    assert not DeadLetterPolicy.should_alert(5, threshold=10)
    assert DeadLetterPolicy.should_alert(10, threshold=10)
    assert DeadLetterPolicy.should_alert(15, threshold=10)
    print("  ✓ Alert threshold logic correct")

    message = DeadLetterPolicy.get_notification_message(15, "user_123")
    assert "15 webhooks" in message
    assert "user_123" in message
    print(f"  ✓ Alert message: {message[:60]}...")

    print("✅ Dead letter policy tests passed")


def test_configuration():
    """Test configuration loading."""
    print("\n⚙️  Testing Configuration...")

    # Test defaults
    assert WorkerConfig.WORKER_POLL_INTERVAL == 5
    assert WorkerConfig.WORKER_BATCH_SIZE == 10
    assert WorkerConfig.RETRY_MAX_ATTEMPTS == 5
    assert WorkerConfig.HTTP_TIMEOUT == 30
    print("  ✓ Default configuration values correct")

    # Test URL masking
    url = "postgresql://user:password@localhost:5432/db"
    masked = WorkerConfig._mask_database_url(url)
    assert "password" not in masked
    assert "***" in masked
    print(f"  ✓ Database URL masking: {masked}")

    # Test config dict
    config_dict = WorkerConfig.to_dict()
    assert 'worker_poll_interval' in config_dict
    assert 'retry_max_attempts' in config_dict
    print(f"  ✓ Configuration dictionary: {len(config_dict)} keys")

    print("✅ Configuration tests passed")


def main():
    """Run all basic tests."""
    print("=" * 60)
    print("Webhook Worker - Basic Test Suite")
    print("=" * 60)

    try:
        test_hmac_signing()
        test_retry_strategy()
        test_dead_letter_policy()
        test_configuration()

        print("\n" + "=" * 60)
        print("✅ All tests passed!")
        print("=" * 60)
        return 0

    except AssertionError as e:
        print(f"\n❌ Test failed: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
