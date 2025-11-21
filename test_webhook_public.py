#!/usr/bin/env python3
import os
import json
import requests
from livekit import api
from dotenv import load_dotenv

load_dotenv()

LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')
BACKEND_URL = "https://ai.epic.dm"  # Public URL

# Create test webhook payload
test_event = {
    "id": "test-event-456",
    "event": "room_finished",
    "createdAt": 1698765432,
    "room": {
        "sid": "RM_test456",
        "name": "sip-17678189426__17678183742_test_public",
        "emptyTimeout": 300,
        "maxParticipants": 0,
        "creationTime": 1698765132,
        "numParticipants": 0,
        "activeRecording": False
    }
}

payload_json = json.dumps(test_event)

# Create JWT token signed with API secret
token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
token.with_grants(api.VideoGrants())
token_string = token.to_jwt()

headers = {
    'Authorization': f'Bearer {token_string}',
    'Content-Type': 'application/json'
}

print(f"📤 Testing PUBLIC webhook endpoint: {BACKEND_URL}/api/webhooks/livekit")

response = requests.post(
    f"{BACKEND_URL}/api/webhooks/livekit",
    data=payload_json,
    headers=headers,
    timeout=10
)

print(f"✅ Response Status: {response.status_code}")
print(f"Response Body: {response.text}")

if response.status_code == 200:
    print("\n🎉 Public webhook endpoint is working!")
else:
    print("\n❌ Webhook endpoint returned error")
