#!/usr/bin/env python3
"""
Quick script to check the DID destination format for the working example
"""
import os
import sys

# Add the parent directory to the path
sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

# Initialize manager
phone_manager = PhoneNumberManager()

# Check if Magnus client exists
if not hasattr(phone_manager, 'magnus_client') or phone_manager.magnus_client is None:
    print("❌ Magnus client not initialized")
    sys.exit(1)

client = phone_manager.magnus_client

# Get DID ID for 17678183366
print("=== Checking DID 17678183366 ===")
did_id = client.get_id('did', 'did', '17678183366')
if not did_id:
    print("❌ DID not found")
    sys.exit(1)

print(f"✅ Found DID ID: {did_id}")

# Get diddestination
print("\n=== Getting DID Destination ===")
import json

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
else:
    print("❌ No diddestination found")
    print(f"Response: {response}")
