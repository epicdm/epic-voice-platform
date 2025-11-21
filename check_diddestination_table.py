#!/usr/bin/env python3
"""
Check the diddestination table for working vs new DIDs
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client

def get_diddestination_info(did_number):
    """Get diddestination table info for a DID"""
    # Get DID ID
    did_id = client.get_id('did', 'did', did_number)

    if not did_id:
        return None

    # Get diddestination record
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
        return response['rows'][0]
    return None

print("=" * 100)
print("DIDDESTINATION TABLE COMPARISON")
print("=" * 100)

# Check working example
working = get_diddestination_info('17678183366')
print("\n### WORKING EXAMPLE: 17678183366 ###")
if working:
    print(f"id: {working.get('id')}")
    print(f"id_did: {working.get('id_did')}")
    print(f"id_sip: {working.get('id_sip')}")
    print(f"id_user: {working.get('id_user')}")
    print(f"destination: {working.get('destination')}")
    print(f"context: {working.get('context')}")
    print(f"priority: {working.get('priority')}")
    print(f"voip_call: {working.get('voip_call')}")
    print(f"activated: {working.get('activated')}")

# Check new example
new = get_diddestination_info('17678189676')
print("\n### NEW EXAMPLE: 17678189676 ###")
if new:
    print(f"id: {new.get('id')}")
    print(f"id_did: {new.get('id_did')}")
    print(f"id_sip: {new.get('id_sip')}")
    print(f"id_user: {new.get('id_user')}")
    print(f"destination: {new.get('destination')}")
    print(f"context: {new.get('context')}")
    print(f"priority: {new.get('priority')}")
    print(f"voip_call: {new.get('voip_call')}")
    print(f"activated: {new.get('activated')}")

print("\n" + "=" * 100)
print("KEY COMPARISON")
print("=" * 100)

if working and new:
    print(f"\nDestination:")
    print(f"  Working: {working.get('destination')}")
    print(f"  New:     {new.get('destination')}")
    print(f"  Match:   {'✅' if working.get('destination') == new.get('destination').replace('676', '366') else '❌'}")

    print(f"\nContext:")
    print(f"  Working: {working.get('context')!r}")
    print(f"  New:     {new.get('context')!r}")
    print(f"  Match:   {'✅' if working.get('context') == new.get('context') else '❌'}")

    print(f"\nVoip Call:")
    print(f"  Working: {working.get('voip_call')}")
    print(f"  New:     {new.get('voip_call')}")
    print(f"  Match:   {'✅' if working.get('voip_call') == new.get('voip_call') else '❌'}")

    print(f"\nPriority:")
    print(f"  Working: {working.get('priority')}")
    print(f"  New:     {new.get('priority')}")
    print(f"  Match:   {'✅' if working.get('priority') == new.get('priority') else '❌'}")

print("\n" + "=" * 100)
