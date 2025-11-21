#!/usr/bin/env python3
"""
Verify the last provisioned DID (17678189486)
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager
from database import SessionLocal
from phone_number_manager import PhoneNumberPool

# Initialize
phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client
db = SessionLocal()

print("=" * 80)
print("VERIFYING DID: 17678189486")
print("=" * 80)

# Check in local database
pool_record = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.phone_number == '+17678189486'
).first()

print("\n### LOCAL DATABASE ###")
if pool_record:
    print(f"✅ Found in database")
    print(f"   Phone: {pool_record.phone_number}")
    print(f"   Status: {pool_record.status}")
    print(f"   Magnus DID ID: {pool_record.magnus_did_id}")
    print(f"   Inbound Trunk: {pool_record.livekit_inbound_trunk_id}")
    print(f"   Outbound Trunk: {pool_record.livekit_outbound_trunk_id}")
else:
    print("❌ NOT found in local database")

# Check in Magnus
did_id = client.get_id('did', 'did', '17678189486')

print("\n### MAGNUS BILLING ###")
if did_id:
    print(f"✅ DID exists in Magnus (ID: {did_id})")

    # Get diddestination
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
        print(f"\n### DID DESTINATION ###")
        print(f"   destination: {dest_info.get('destination')}")
        print(f"   context: {dest_info.get('context')!r}")
        print(f"   voip_call: {dest_info.get('voip_call')}")
        print(f"   priority: {dest_info.get('priority')}")

        # Compare to working example
        if dest_info.get('destination') == 'SIP/17678189486@3m4yki5jezn.sip.livekit.cloud':
            print(f"\n✅ Destination format is CORRECT (no + sign, has LiveKit domain)")
        else:
            print(f"\n❌ Destination format is WRONG")
            print(f"   Expected: SIP/17678189486@3m4yki5jezn.sip.livekit.cloud")
            print(f"   Got:      {dest_info.get('destination')}")

        if dest_info.get('voip_call') == '9':
            print(f"✅ voip_call is CORRECT (9)")
        else:
            print(f"❌ voip_call is WRONG (expected 9, got {dest_info.get('voip_call')})")

        if dest_info.get('context') == '':
            print(f"✅ context is CORRECT (empty string)")
        else:
            print(f"❌ context is WRONG (expected '', got {dest_info.get('context')!r})")
else:
    print("❌ DID NOT found in Magnus")

print("\n" + "=" * 80)
