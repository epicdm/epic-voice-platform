#!/usr/bin/env python3
"""
Test webhook endpoint locally by simulating LiveKit Cloud webhook
"""

import os
import json
import requests
from livekit import api

# Load credentials from environment
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')

# Create a test webhook payload
payload = {
    "event": "room_finished",
    "id": "test-webhook-123",
    "createdAt": 1698765432,
    "room": {
        "sid": "RM_test123",
        "name": "sip-17678189426__17678183742",
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

payload_json = json.dumps(payload)

# Create JWT token signed with API secret
import hashlib
payload_hash = hashlib.sha256(payload_json.encode()).hexdigest()

token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
token.with_grants(api.VideoGrants())
token.sha256 = payload_hash  # Add payload hash for webhook validation

token_string = token.to_jwt()

print(f"🔑 Generated JWT token: {token_string[:50]}...")
print(f"📦 Payload: {payload_json}")
print(f"🔗 Sending to: http://localhost:5001/api/webhooks/livekit")

# Send webhook to local endpoint
response = requests.post(
    "http://localhost:5001/api/webhooks/livekit",
    data=payload_json,
    headers={
        'Authorization': f'Bearer {token_string}',
        'Content-Type': 'application/webhook+json'
    },
    timeout=10
)

print(f"\n📊 Response Status: {response.status_code}")
print(f"📄 Response Body: {response.text}")

if response.status_code == 200:
    print("\n✅ Webhook processed successfully!")
else:
    print(f"\n❌ Webhook failed: {response.status_code}")
