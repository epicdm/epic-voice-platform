#!/usr/bin/env python3
"""
Show complete configuration for working DID 17678183366
"""
import os
import sys
import json

sys.path.insert(0, '/opt/livekit1')

from phone_number_manager import PhoneNumberManager

phone_manager = PhoneNumberManager()
client = phone_manager.magnus_client

print("=" * 80)
print("WORKING CONFIGURATION: DID 17678183366")
print("=" * 80)

# Get DID
did_id = client.get_id('did', 'did', '17678183366')
print(f"\n1. DID ID: {did_id}")

# Get full DID record
filter_obj = [{
    'type': 'string',
    'field': 'did',
    'value': '17678183366',
    'comparison': 'eq'
}]
read_data = {
    'module': 'did',
    'action': 'read',
    'page': 1,
    'start': 0,
    'limit': 1,
    'filter': json.dumps(filter_obj)
}
did_response = client._make_request('POST', 'did/read', read_data)

if did_response.get('rows'):
    did_info = did_response['rows'][0]
    print(f"\n2. DID Record:")
    print(f"   did: {did_info.get('did')}")
    print(f"   workaudio: {did_info.get('workaudio')}")
    print(f"   activated: {did_info.get('activated')}")
    print(f"   reserved: {did_info.get('reserved')}")
    print(f"   id_user: {did_info.get('id_user')}")

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
    print(f"\n3. DID Destination Record:")
    print(f"   id: {dest_info.get('id')}")
    print(f"   destination: {dest_info.get('destination')}")
    print(f"   id_did: {dest_info.get('id_did')}")
    print(f"   id_sip: {dest_info.get('id_sip')}")
    print(f"   id_user: {dest_info.get('id_user')}")
    print(f"   voip_call: {dest_info.get('voip_call')}")
    print(f"   priority: {dest_info.get('priority')}")
    print(f"   context: {dest_info.get('context')}")
    print(f"   activated: {dest_info.get('activated')}")

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
            print(f"\n4. SIP User Record (ID: {sip_id}):")
            print(f"   name: {sip_info.get('name')}")
            print(f"   accountcode: {sip_info.get('accountcode')}")
            print(f"   defaultuser: {sip_info.get('defaultuser')}")
            print(f"   authuser: {sip_info.get('authuser')}")
            print(f"   fromuser: {sip_info.get('fromuser')}")
            print(f"   callerid: {sip_info.get('callerid')}")
            print(f"   host: {sip_info.get('host')}")
            print(f"   fromdomain: {sip_info.get('fromdomain')}")
            print(f"   insecure: {sip_info.get('insecure')}")
            print(f"   type: {sip_info.get('type')}")
            print(f"   transport: {sip_info.get('transport')}")
            print(f"   port: {sip_info.get('port')}")
            print(f"   permit: {sip_info.get('permit')}")
            print(f"   context: {sip_info.get('context')}")
            print(f"   allow: {sip_info.get('allow')}")
            print(f"   nat: {sip_info.get('nat')}")
            print(f"   qualify: {sip_info.get('qualify')}")
            print(f"   directmedia: {sip_info.get('directmedia')}")
            print(f"   addparameter: {sip_info.get('addparameter')}")
            print(f"   status: {sip_info.get('status')}")

print("\n" + "=" * 80)
print("KEY FIELDS FOR LIVEKIT INTEGRATION:")
print("=" * 80)
print(f"DID Destination: {dest_info.get('destination') if dest_response.get('rows') else 'N/A'}")
print(f"SIP Host: {sip_info.get('host') if sip_response.get('rows') else 'N/A'}")
print(f"SIP From Domain: {sip_info.get('fromdomain') if sip_response.get('rows') else 'N/A'}")
print("=" * 80)
