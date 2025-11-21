#!/usr/bin/env python3
"""
Fix the voip_call field for DID 17678189486
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

# Initialize
phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client

print("=" * 80)
print("FIXING DID: 17678189486")
print("=" * 80)

# Get DID ID
did_id = client.get_id('did', 'did', '17678189486')

if not did_id:
    print("❌ DID not found in Magnus")
    sys.exit(1)

print(f"\n✅ Found DID in Magnus (ID: {did_id})")

# Get diddestination record
filter_obj = [{
    'type': 'string',
    'field': 'id_did',
    'value': str(did_id),
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

if not response.get('rows'):
    print("❌ No diddestination found")
    sys.exit(1)

dest_info = response['rows'][0]
dest_id = dest_info.get('id')

print(f"\n### CURRENT CONFIGURATION ###")
print(f"   diddestination ID: {dest_id}")
print(f"   destination: {dest_info.get('destination')}")
print(f"   voip_call: {dest_info.get('voip_call')} (should be 9)")
print(f"   context: {dest_info.get('context')!r} (should be '')")

# Update voip_call to 9
update_data = {
    'module': 'diddestination',
    'action': 'save',
    'id': dest_id,
    'voip_call': 9,
    'context': ''
}

result = client._make_request('POST', 'diddestination/save', update_data)

if result.get('success'):
    print(f"\n✅ Updated diddestination {dest_id}")
    print(f"   voip_call: 9 (was {dest_info.get('voip_call')})")
    print(f"   context: '' (was {dest_info.get('context')!r})")
else:
    print(f"\n❌ Update failed: {result}")

print("\n" + "=" * 80)
