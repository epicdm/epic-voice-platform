#!/usr/bin/env python3
"""
Update all existing diddestination records to match working configuration
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

# Get all phone numbers from our pool
phone_numbers = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.magnus_did_id.isnot(None)
).all()

print(f"=== Found {len(phone_numbers)} phone numbers with Magnus DIDs ===\n")

fixed_count = 0
errors = 0

for pool_number in phone_numbers:
    phone_number = pool_number.phone_number
    did_id = pool_number.magnus_did_id

    print(f"Processing {phone_number} (DID ID: {did_id})...")

    try:
        # Get the diddestination record
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
        dest_id = dest_info.get('id')

        # Update to match working example
        update_data = {
            'module': 'diddestination',
            'action': 'save',
            'id': dest_id,
            'voip_call': 9,  # Match working example (was 1)
            'context': '',  # Empty string (was None)
        }

        result = client._make_request('POST', 'diddestination/save', update_data)

        if result.get('success'):
            print(f"  ✅ Updated diddestination {dest_id}")
            print(f"     voip_call: 9 (was {dest_info.get('voip_call')})")
            print(f"     context: '' (was {dest_info.get('context')!r})\n")
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
