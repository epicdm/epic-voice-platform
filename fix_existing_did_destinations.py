#!/usr/bin/env python3
"""
Fix all existing DID destinations that have + sign in them
"""
import os
import sys
import json
import re

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager
from database import SessionLocal
from phone_number_manager import PhoneNumberPool

# Initialize
phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client
db = SessionLocal()

# Get all phone numbers from our pool that have Magnus DIDs
phone_numbers = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.magnus_did_id.isnot(None)
).all()

print(f"=== Found {len(phone_numbers)} phone numbers with Magnus DIDs ===\n")

fixed_count = 0
already_correct = 0
errors = 0

for pool_number in phone_numbers:
    phone_number = pool_number.phone_number
    did_id = pool_number.magnus_did_id

    print(f"Checking {phone_number} (DID ID: {did_id})...")

    try:
        # Get current diddestination
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
        current_destination = dest_info.get('destination', '')
        did_dest_id = dest_info.get('id')

        print(f"  Current: {current_destination}")

        # Check if it has + sign and LiveKit domain
        if '+' in current_destination and '@3m4yki5jezn.sip.livekit.cloud' in current_destination:
            # Fix it - remove + sign
            fixed_destination = current_destination.replace('+', '')
            print(f"  Fixed:   {fixed_destination}")

            # Update in Magnus
            update_data = {
                'module': 'diddestination',
                'action': 'save',
                'id': did_dest_id,
                'destination': fixed_destination,
                'voip_call': dest_info.get('voip_call', 1)
            }
            result = client._make_request('POST', 'diddestination/save', update_data)

            if result.get('success'):
                print(f"  ✅ Updated successfully\n")
                fixed_count += 1
            else:
                print(f"  ❌ Update failed: {result}\n")
                errors += 1
        else:
            print(f"  ✅ Already correct\n")
            already_correct += 1

    except Exception as e:
        print(f"  ❌ Error: {e}\n")
        errors += 1

print(f"=== Summary ===")
print(f"Fixed: {fixed_count}")
print(f"Already correct: {already_correct}")
print(f"Errors: {errors}")
print(f"Total: {len(phone_numbers)}")
