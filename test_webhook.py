#!/usr/bin/env python3
"""
Test LiveKit Webhook Endpoint

Simulates a LiveKit webhook event to test the backend receiver
"""

import os
import json
import requests
from livekit import api
from dotenv import load_dotenv

load_dotenv()

# Load LiveKit credentials
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
BACKEND_URL = "http://localhost:5001"

# Create test webhook payload
test_event = {
    "id": "test-event-123",
    "event": "room_finished",
    "createdAt": 1698765432,
    "room": {
        "sid": "RM_test123",
        "name": "sip-17678189426__17678183742_test",
        "emptyTimeout": 300,
        "maxParticipants": 0,
        "creationTime": 1698765132,
        "turnPassword": "",
        "enabledCodecs": [],
        "metadata": "",
        "numParticipants": 0,
        "numPublishers": 0,
        "activeRecording": False
    }
}

# Convert to JSON string
payload_json = json.dumps(test_event)

# Create JWT token signed with API secret
token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
token.with_grants(api.VideoGrants())
token_string = token.to_jwt()

# Send webhook request
print(f"📤 Sending test webhook to {BACKEND_URL}/api/webhooks/livekit")
print(f"Event type: {test_event['event']}")
print(f"Room: {test_event['room']['name']}")

headers = {
    'Authorization': f'Bearer {token_string}',
    'Content-Type': 'application/json'
}

try:
    response = requests.post(
        f"{BACKEND_URL}/api/webhooks/livekit",
        data=payload_json,
        headers=headers,
        timeout=10
    )

    print(f"\n✅ Response Status: {response.status_code}")
    print(f"Response Body: {response.text}")

    if response.status_code == 200:
        print("\n🎉 Webhook endpoint is working!")
    else:
        print("\n❌ Webhook endpoint returned error")

except Exception as e:
    print(f"\n❌ Error sending webhook: {e}")
