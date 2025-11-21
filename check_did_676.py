#!/usr/bin/env python3
"""
Check DID destination for 17678189676
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client

# Get DID ID for 17678189676
print("=== Checking DID 17678189676 ===")
did_id = client.get_id('did', 'did', '17678189676')
if not did_id:
    print("❌ DID not found")
    sys.exit(1)

print(f"✅ Found DID ID: {did_id}")

# Get diddestination
print("\n=== Getting DID Destination ===")
filter_obj = [{
    'type': 'string',
    'field': 'id_did',
    'value': did_id,
    'comparison': 'eq'
}]
read_data = {
    'module': 'diddestination',
    'action': 'read',
    'page': 1,
    'start': 0,
    'limit': 1,
    'filter': json.dumps(filter_obj)
}
response = client._make_request('POST', 'diddestination/read', read_data)

if response.get('rows'):
    dest_info = response['rows'][0]
    print(f"✅ DID Destination found:")
    print(f"   destination: {dest_info.get('destination')}")
    print(f"   id_sip: {dest_info.get('id_sip')}")
    print(f"   id_did: {dest_info.get('id_did')}")
    print(f"   voip_call: {dest_info.get('voip_call')}")

    # Compare to working format
    working_format = "SIP/17678183366@3m4yki5jezn.sip.livekit.cloud"
    expected_format = "SIP/17678189676@3m4yki5jezn.sip.livekit.cloud"
    actual = dest_info.get('destination')

    print(f"\n=== Comparison ===")
    print(f"Working example: {working_format}")
    print(f"Expected format: {expected_format}")
    print(f"Actual format:   {actual}")

    if actual == expected_format:
        print("✅ DID destination is CORRECT")
    else:
        print("❌ DID destination is WRONG")
        print(f"\nDifference:")
        print(f"  - Has + sign: {'+' in actual}")
        print(f"  - Has LiveKit domain: {'@3m4yki5jezn.sip.livekit.cloud' in actual}")
else:
    print("❌ No diddestination found")
    print(f"Response: {response}")
