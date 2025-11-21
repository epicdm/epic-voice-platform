#!/usr/bin/env python3
"""
Test Script for Call Outcome Recording System
Tests webhook listener, outcome processor, and classification logic
"""

import json
import hmac
import hashlib
from datetime import datetime, timezone, timedelta
from call_outcome_processor import CallOutcomeProcessor
from livekit_webhook_listener import LiveKitWebhookListener

def test_outcome_classification():
    """Test call outcome classification logic"""
    print("\n" + "="*60)
    print("TEST 1: Call Outcome Classification")
    print("="*60)

    processor = CallOutcomeProcessor()

    test_cases = [
        {
            'name': 'Very short call (2s) - Failed',
            'event': {
                'event_id': 'evt_001',
                'event_type': 'participant_left',
                'room_name': 'test-room-1',
                'disconnect_reason': 'connection_lost',
                'raw_payload': {}
            },
            'duration': 2,
            'expected': 'failed'
        },
        {
            'name': 'Short call (8s) - No Answer',
            'event': {
                'event_id': 'evt_002',
                'event_type': 'participant_left',
                'room_name': 'test-room-2',
                'disconnect_reason': 'no_answer',
                'raw_payload': {}
            },
            'duration': 8,
            'expected': 'no_answer'
        },
        {
            'name': 'Busy signal',
            'event': {
                'event_id': 'evt_003',
                'event_type': 'participant_left',
                'room_name': 'test-room-3',
                'disconnect_reason': 'busy',
                'raw_payload': {}
            },
            'duration': 3,
            'expected': 'busy'
        },
        {
            'name': 'Normal conversation (45s) - Completed',
            'event': {
                'event_id': 'evt_004',
                'event_type': 'participant_left',
                'room_name': 'test-room-4',
                'disconnect_reason': 'user_left',
                'raw_payload': {}
            },
            'duration': 45,
            'expected': 'completed'
        },
        {
            'name': 'Long call (5min) - Completed',
            'event': {
                'event_id': 'evt_005',
                'event_type': 'participant_left',
                'room_name': 'test-room-5',
                'disconnect_reason': 'user_left',
                'raw_payload': {}
            },
            'duration': 300,
            'expected': 'completed'
        },
    ]

    passed = 0
    failed = 0

    for test_case in test_cases:
        outcome = processor._classify_outcome(
            test_case['event'],
            test_case['duration']
        )

        if outcome == test_case['expected']:
            print(f"✅ PASS: {test_case['name']}")
            print(f"   Duration: {test_case['duration']}s → Outcome: {outcome}")
            passed += 1
        else:
            print(f"❌ FAIL: {test_case['name']}")
            print(f"   Expected: {test_case['expected']}, Got: {outcome}")
            failed += 1

    print(f"\nResults: {passed} passed, {failed} failed")
    return failed == 0


def test_duration_calculation():
    """Test duration calculation from ISO 8601 timestamps"""
    print("\n" + "="*60)
    print("TEST 2: Duration Calculation")
    print("="*60)

    processor = CallOutcomeProcessor()

    now = datetime.now(timezone.utc)
    start_time = (now - timedelta(seconds=45)).isoformat()
    end_time = now.isoformat()

    duration = processor._calculate_duration(start_time, end_time)

    print(f"Start: {start_time}")
    print(f"End:   {end_time}")
    print(f"Duration: {duration}s")

    if 44 <= duration <= 46:  # Allow 1s tolerance
        print("✅ PASS: Duration calculation accurate")
        return True
    else:
        print(f"❌ FAIL: Expected ~45s, got {duration}s")
        return False


def test_webhook_signature_validation():
    """Test HMAC signature validation"""
    print("\n" + "="*60)
    print("TEST 3: Webhook Signature Validation")
    print("="*60)

    secret = "test-webhook-secret-key-12345"
    listener = LiveKitWebhookListener(secret)

    # Create test payload
    payload = json.dumps({
        'id': 'evt_test_123',
        'event': 'participant_left',
        'room': {'name': 'test-room'},
        'participant': {'sid': 'PA_123'}
    }).encode()

    # Generate valid signature
    valid_signature = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    # Test valid signature
    is_valid = listener.validate_signature(payload, valid_signature)
    if is_valid:
        print("✅ PASS: Valid signature accepted")
    else:
        print("❌ FAIL: Valid signature rejected")
        return False

    # Test invalid signature
    invalid_signature = "invalid_signature_123"
    is_invalid = listener.validate_signature(payload, invalid_signature)
    if not is_invalid:
        print("✅ PASS: Invalid signature rejected")
    else:
        print("❌ FAIL: Invalid signature accepted")
        return False

    # Test empty signature
    is_empty = listener.validate_signature(payload, "")
    if not is_empty:
        print("✅ PASS: Empty signature rejected")
    else:
        print("❌ FAIL: Empty signature accepted")
        return False

    return True


def test_event_parsing():
    """Test LiveKit event parsing and normalization"""
    print("\n" + "="*60)
    print("TEST 4: Event Parsing and Normalization")
    print("="*60)

    listener = LiveKitWebhookListener("test-secret")

    # Test valid participant_left event
    test_payload = {
        'id': 'evt_abc123',
        'event': 'participant_left',
        'createdAt': datetime.now(timezone.utc).isoformat(),
        'room': {
            'name': 'campaign-12345-abcd',
            'creationTime': (datetime.now(timezone.utc) - timedelta(seconds=30)).isoformat()
        },
        'participant': {
            'sid': 'PA_xyz789',
            'identity': 'campaign-12345',
            'disconnectReason': 'user_left'
        }
    }

    parsed = listener.parse_event(test_payload)

    if not parsed:
        print("❌ FAIL: Failed to parse valid event")
        return False

    required_fields = ['event_id', 'event_type', 'room_name', 'participant_sid', 'created_at']
    missing_fields = [f for f in required_fields if f not in parsed]

    if missing_fields:
        print(f"❌ FAIL: Missing fields: {missing_fields}")
        return False

    print("✅ PASS: Event parsed successfully")
    print(f"   Event ID: {parsed['event_id']}")
    print(f"   Room: {parsed['room_name']}")
    print(f"   Participant: {parsed['participant_sid']}")

    # Test ignored event type
    ignored_payload = {
        'id': 'evt_ignore',
        'event': 'track_published',
        'room': {'name': 'test-room'}
    }

    parsed_ignored = listener.parse_event(ignored_payload)

    if parsed_ignored is None:
        print("✅ PASS: Ignored events filtered correctly")
    else:
        print("❌ FAIL: Non-processable event should return None")
        return False

    return True


def test_metadata_extraction():
    """Test call metadata extraction from events"""
    print("\n" + "="*60)
    print("TEST 5: Metadata Extraction")
    print("="*60)

    processor = CallOutcomeProcessor()

    now = datetime.now(timezone.utc)
    start_time = (now - timedelta(seconds=60)).isoformat()

    test_event = {
        'event_id': 'evt_metadata_test',
        'event_type': 'participant_left',
        'room_name': 'test-room-metadata',
        'participant_sid': 'PA_test123',
        'disconnect_reason': 'user_left',
        'recording_url': 'https://example.com/recording.mp4',
        'created_at': now.isoformat(),
        'raw_payload': {
            'room': {
                'name': 'test-room-metadata',
                'creationTime': start_time
            }
        }
    }

    metadata = processor._extract_call_metadata(test_event)

    required_keys = ['duration_seconds', 'outcome', 'started_at', 'ended_at']
    missing_keys = [k for k in required_keys if k not in metadata]

    if missing_keys:
        print(f"❌ FAIL: Missing metadata keys: {missing_keys}")
        return False

    print("✅ PASS: Metadata extracted successfully")
    print(f"   Duration: {metadata['duration_seconds']}s")
    print(f"   Outcome: {metadata['outcome']}")
    print(f"   Recording: {metadata.get('recording_url', 'None')}")

    if metadata['duration_seconds'] != 60:
        print(f"⚠️  WARNING: Expected 60s duration, got {metadata['duration_seconds']}s")

    return True


def run_all_tests():
    """Run all tests and report results"""
    print("\n" + "="*60)
    print("CALL OUTCOME RECORDING SYSTEM - TEST SUITE")
    print("="*60)

    tests = [
        ("Outcome Classification", test_outcome_classification),
        ("Duration Calculation", test_duration_calculation),
        ("Webhook Signature Validation", test_webhook_signature_validation),
        ("Event Parsing", test_event_parsing),
        ("Metadata Extraction", test_metadata_extraction),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ ERROR in {test_name}: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed_count = sum(1 for _, result in results if result)
    total_count = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")

    print(f"\nTotal: {passed_count}/{total_count} tests passed")

    if passed_count == total_count:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total_count - passed_count} test(s) failed")
        return 1


if __name__ == '__main__':
    import sys
    exit_code = run_all_tests()
    sys.exit(exit_code)
