#!/usr/bin/env python3
"""
Compare working DID vs new DID configuration
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client

def get_full_config(did_number):
    """Get complete config for a DID"""
    config = {}

    # Get DID
    did_id = client.get_id('did', 'did', did_number)
    config['did_id'] = did_id

    # Get DID destination
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
    dest_response = client._make_request('POST', 'diddestination/read', read_data)

    if dest_response.get('rows'):
        dest_info = dest_response['rows'][0]
        config['destination'] = dest_info.get('destination')
        config['voip_call'] = dest_info.get('voip_call')
        config['sip_id'] = dest_info.get('id_sip')

        # Get SIP user
        sip_id = dest_info.get('id_sip')
        if sip_id:
            filter_obj = [{
                'type': 'string',
                'field': 'id',
                'value': str(sip_id),
                'comparison': 'eq'
            }]
            read_data = {
                'module': 'sip',
                'action': 'read',
                'page': 1,
                'start': 0,
                'limit': 1,
                'filter': json.dumps(filter_obj)
            }
            sip_response = client._make_request('POST', 'sip/read', read_data)

            if sip_response.get('rows'):
                sip_info = sip_response['rows'][0]
                config['sip'] = sip_info

    return config

# Compare configs
working = get_full_config('17678183366')
new = get_full_config('17678189676')

print("=" * 100)
print("COMPARISON: Working (17678183366) vs New (17678189676)")
print("=" * 100)

print("\n### DID DESTINATION ###")
print(f"Working: {working.get('destination')}")
print(f"New:     {new.get('destination')}")
print(f"Match:   {working.get('destination') == new.get('destination').replace('676', '366')}")

print("\n### SIP HOST ###")
print(f"Working: {working.get('sip', {}).get('host')}")
print(f"New:     {new.get('sip', {}).get('host')}")
print(f"Match:   {working.get('sip', {}).get('host') == new.get('sip', {}).get('host')}")

print("\n### SIP FIELDS COMPARISON ###")
fields = ['name', 'defaultuser', 'authuser', 'fromuser', 'callerid', 'fromdomain',
          'insecure', 'type', 'transport', 'port', 'permit', 'allow', 'addparameter']

for field in fields:
    working_val = working.get('sip', {}).get(field)
    new_val = new.get('sip', {}).get(field)
    match = "✅" if str(working_val) == str(new_val) or (not working_val and not new_val) else "❌"
    print(f"{match} {field:15} | Working: {working_val!r:30} | New: {new_val!r:30}")

print("\n" + "=" * 100)
