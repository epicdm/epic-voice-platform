#!/usr/bin/env python3
"""
Update all existing SIP users to match the working configuration (17678183366)
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

# Get all phone numbers from our pool that have Magnus SIP IDs
phone_numbers = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.magnus_did_id.isnot(None)
).all()

print(f"=== Found {len(phone_numbers)} phone numbers with Magnus SIP users ===\n")

fixed_count = 0
errors = 0

for pool_number in phone_numbers:
    phone_number = pool_number.phone_number
    did_id = pool_number.magnus_did_id

    print(f"Processing {phone_number} (DID ID: {did_id})...")

    try:
        # Get the SIP ID from diddestination
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
            print(f"  ⚠️  No diddestination found\n")
            continue

        dest_info = response['rows'][0]
        sip_id = dest_info.get('id_sip')

        if not sip_id:
            print(f"  ⚠️  No SIP ID found in diddestination\n")
            continue

        # Remove + from phone number
        clean_number = phone_number.replace('+', '')

        # Update SIP user to match working format
        sip_data = {
            'module': 'sip',
            'action': 'save',
            'id': sip_id,
            # Match working example exactly
            'fromuser': '',  # Empty
            'callerid': clean_number,  # No angle brackets, no +
            'fromdomain': '',  # Empty
            'insecure': 'no',  # Not 'port,invite'
            'permit': '',  # Empty
            'addparameter': '',  # Empty (remove authuser/transport/port)
        }

        result = client._make_request('POST', 'sip/save', sip_data)

        if result.get('success'):
            print(f"  ✅ Updated SIP user {sip_id} for {phone_number}")
            print(f"     fromuser: '' (empty)")
            print(f"     callerid: {clean_number}")
            print(f"     fromdomain: '' (empty)")
            print(f"     insecure: no")
            print(f"     permit: '' (empty)")
            print(f"     addparameter: '' (empty)\n")
            fixed_count += 1
        else:
            print(f"  ❌ Update failed: {result}\n")
            errors += 1

    except Exception as e:
        print(f"  ❌ Error: {e}\n")
        import traceback
        traceback.print_exc()
        errors += 1

print(f"=== Summary ===")
print(f"Fixed: {fixed_count}")
print(f"Errors: {errors}")
print(f"Total: {len(phone_numbers)}")
