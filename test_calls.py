#!/usr/bin/env python3
"""
Call Testing Script
Test both inbound and outbound calls
"""

import requests
import sys

BASE_URL = "http://localhost:5001"
USER_EMAIL = "giraud.eric@gmail.com"

def test_inbound_setup(phone_number, agent_id):
    """Test inbound call setup (dispatch rule creation)"""
    print(f"\n🔍 Testing Inbound Setup for {phone_number}")
    
    response = requests.post(
        f"{BASE_URL}/api/user/phone-numbers/{phone_number}/assign",
        headers={"X-User-Email": USER_EMAIL, "Content-Type": "application/json"},
        json={"agent_id": agent_id}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    return response.status_code == 200

def test_outbound(from_number, to_number, agent_id=None):
    """Test outbound call capability"""
    print(f"\n📞 Testing Outbound Call {from_number} → {to_number}")
    if agent_id:
        print(f"   Using Agent ID: {agent_id}")

    payload = {"from_number": from_number, "to_number": to_number}
    if agent_id:
        payload["agent_id"] = agent_id

    response = requests.post(
        f"{BASE_URL}/api/user/calls/test-outbound",
        headers={"X-User-Email": USER_EMAIL, "Content-Type": "application/json"},
        json=payload
    )

    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 test_calls.py [inbound|outbound]")
        sys.exit(1)
    
    mode = sys.argv[1]
    
    if mode == "inbound":
        # Test with your phone
        test_inbound_setup("+17678189267", "7b885e98-8cfe-4d8a-947c-9eb24ad678e0")
    elif mode == "outbound":
        # Test outbound with agent
        # IMPORTANT: Pass agent_id so the AI agent handles the call
        test_outbound(
            from_number="+17678189267",
            to_number="+17678183742",  # Your test number
            agent_id="7b885e98-8cfe-4d8a-947c-9eb24ad678e0"  # tst0002 deployed agent
        )
