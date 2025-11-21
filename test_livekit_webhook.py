#!/usr/bin/env python3
"""
Test Script for LiveKit Webhook Endpoint
Simulates LiveKit webhook POST requests with HMAC signature
"""

import requests
import json
import hmac
import hashlib
import os
from datetime import datetime, timezone, timedelta

# Configuration
WEBHOOK_URL = "http://localhost:5000/api/webhooks/livekit"
WEBHOOK_SECRET = os.getenv('LIVEKIT_WEBHOOK_SECRET', 'your-webhook-secret-here')

def generate_signature(payload_bytes: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for payload"""
    return hmac.new(
        secret.encode(),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

def create_test_event(event_type: str = "participant_left") -> dict:
    """Create a test LiveKit webhook event"""
    now = datetime.now(timezone.utc)
    room_created = now - timedelta(seconds=45)

    event = {
        'id': f'evt_test_{int(now.timestamp())}',
        'event': event_type,
        'createdAt': now.isoformat(),
        'room': {
            'sid': 'RM_test123',
            'name': 'test-room-12345',
            'creationTime': room_created.isoformat(),
            'emptyTimeout': 300,
            'maxParticipants': 10,
            'metadata': '',
            'numParticipants': 1,
            'numPublishers': 1,
            'activeRecording': False
        },
        'participant': {
            'sid': 'PA_test456',
            'identity': 'test-user',
            'state': 'DISCONNECTED',
            'name': '',
            'metadata': '',
            'joinedAt': room_created.isoformat(),
            'disconnectReason': 'user_left',
            'permission': {
                'canPublish': True,
                'canSubscribe': True,
                'canPublishData': True,
                'hidden': False,
                'recorder': False
            },
            'region': 'us-west-2',
            'isPublisher': True,
            'kind': 'STANDARD'
        }
    }

    return event

def test_webhook_endpoint(event: dict):
    """Send test webhook event to endpoint"""
    print(f"\n{'='*60}")
    print(f"Testing LiveKit Webhook Endpoint")
    print(f"{'='*60}\n")

    # Convert event to JSON bytes
    payload = json.dumps(event).encode('utf-8')

    # Generate signature
    signature = generate_signature(payload, WEBHOOK_SECRET)

    print(f"📤 Sending {event['event']} event to {WEBHOOK_URL}")
    print(f"🔑 Event ID: {event['id']}")
    print(f"🏠 Room: {event['room']['name']}")
    print(f"👤 Participant: {event['participant']['sid']}")
    print(f"🔐 Signature: {signature[:20]}...")

    # Send POST request
    headers = {
        'Content-Type': 'application/json',
        'X-LiveKit-Signature': signature
    }

    try:
        response = requests.post(
            WEBHOOK_URL,
            data=payload,
            headers=headers,
            timeout=10
        )

        print(f"\n📥 Response Status: {response.status_code}")

        if response.status_code == 200:
            print("✅ SUCCESS: Webhook processed successfully")
            try:
                response_data = response.json()
                print(f"Response: {json.dumps(response_data, indent=2)}")
            except:
                print(f"Response: {response.text}")
        else:
            print(f"❌ FAILED: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Could not connect to webhook endpoint")
        print("Is the Flask application running?")
    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_invalid_signature():
    """Test with invalid signature (should be rejected)"""
    print(f"\n{'='*60}")
    print(f"Testing Invalid Signature (Should be Rejected)")
    print(f"{'='*60}\n")

    event = create_test_event()
    payload = json.dumps(event).encode('utf-8')

    # Use wrong signature
    invalid_signature = "invalid_signature_12345"

    headers = {
        'Content-Type': 'application/json',
        'X-LiveKit-Signature': invalid_signature
    }

    try:
        response = requests.post(
            WEBHOOK_URL,
            data=payload,
            headers=headers,
            timeout=10
        )

        print(f"📥 Response Status: {response.status_code}")

        if response.status_code == 403:
            print("✅ SUCCESS: Invalid signature correctly rejected")
        else:
            print(f"⚠️  UNEXPECTED: Expected 403, got {response.status_code}")

    except Exception as e:
        print(f"❌ ERROR: {e}")

def test_multiple_outcomes():
    """Test different call outcome scenarios"""
    print(f"\n{'='*60}")
    print(f"Testing Multiple Call Outcome Scenarios")
    print(f"{'='*60}\n")

    scenarios = [
        {
            'name': 'Completed Call (45s)',
            'duration': 45,
            'disconnect_reason': 'user_left',
            'expected': 'completed'
        },
        {
            'name': 'No Answer (5s)',
            'duration': 5,
            'disconnect_reason': 'no_answer',
            'expected': 'no_answer'
        },
        {
            'name': 'Busy Signal',
            'duration': 3,
            'disconnect_reason': 'busy',
            'expected': 'busy'
        },
        {
            'name': 'Failed Call (2s)',
            'duration': 2,
            'disconnect_reason': 'connection_lost',
            'expected': 'failed'
        }
    ]

    for scenario in scenarios:
        print(f"\n🧪 Scenario: {scenario['name']}")

        # Create event with specific timing
        now = datetime.now(timezone.utc)
        room_created = now - timedelta(seconds=scenario['duration'])

        event = create_test_event()
        event['room']['creationTime'] = room_created.isoformat()
        event['participant']['disconnectReason'] = scenario['disconnect_reason']
        event['id'] = f"evt_test_{scenario['name'].replace(' ', '_')}_{int(now.timestamp())}"

        payload = json.dumps(event).encode('utf-8')
        signature = generate_signature(payload, WEBHOOK_SECRET)

        headers = {
            'Content-Type': 'application/json',
            'X-LiveKit-Signature': signature
        }

        try:
            response = requests.post(
                WEBHOOK_URL,
                data=payload,
                headers=headers,
                timeout=10
            )

            if response.status_code == 200:
                print(f"   ✅ Processed (expected outcome: {scenario['expected']})")
            else:
                print(f"   ❌ Failed: {response.status_code}")

        except Exception as e:
            print(f"   ❌ ERROR: {e}")

if __name__ == '__main__':
    import sys

    print("""
╔══════════════════════════════════════════════════════════════╗
║     LiveKit Webhook Endpoint Testing Tool                   ║
╚══════════════════════════════════════════════════════════════╝
    """)

    # Check if secret is configured
    if WEBHOOK_SECRET == 'your-webhook-secret-here':
        print("⚠️  WARNING: LIVEKIT_WEBHOOK_SECRET not configured")
        print("Set environment variable or update .env file")
        print("\nContinuing with test secret for demonstration...\n")

    # Run tests
    if len(sys.argv) > 1 and sys.argv[1] == '--all':
        # Run all test scenarios
        test_webhook_endpoint(create_test_event())
        test_invalid_signature()
        test_multiple_outcomes()
    elif len(sys.argv) > 1 and sys.argv[1] == '--scenarios':
        # Test multiple outcome scenarios
        test_multiple_outcomes()
    else:
        # Single basic test
        test_webhook_endpoint(create_test_event())
        print("\n💡 Tip: Run with --all to test all scenarios")
        print("       Run with --scenarios to test outcome classification\n")
