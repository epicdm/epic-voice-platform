#!/usr/bin/env python3
"""
Test script to debug Magnus SIP account updates
"""
import os
import sys
from dotenv import load_dotenv
import json

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from magnus_billing_client_new import MagnusBillingClientNew

def main():
    # Initialize Magnus client
    magnus = MagnusBillingClientNew(
        api_key=os.getenv('MAGNUS_API_KEY'),
        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
        base_url=os.getenv('MAGNUS_BASE_URL')
    )

    # SIP account to test with
    sip_id = "1674"
    phone_number = "+17678189866"
    livekit_domain = "3m4yki5jezn.sip.livekit.cloud"

    print("=" * 60)
    print("TEST 1: Read existing SIP account to see current values")
    print("=" * 60)

    # First, let's READ the SIP account to see what's there
    filter_obj = [{
        'type': 'numeric',
        'field': 'id',
        'value': sip_id,
        'comparison': 'eq'
    }]

    read_data = {
        'module': 'sip',
        'action': 'read',
        'filter': json.dumps(filter_obj)
    }

    result = magnus._make_request('POST', 'sip/read', read_data)
    print(f"\n📋 Current SIP account {sip_id}:")
    if result.get('rows'):
        current = result['rows'][0]
        print(f"   Name: {current.get('name')}")
        print(f"   Host: {current.get('host')}")
        print(f"   Fromdomain: {current.get('fromdomain')}")
        print(f"   Defaultuser: {current.get('defaultuser')}")
        print(f"   Authuser: {current.get('auth')}")
        print(f"   Fromuser: {current.get('fromuser')}")
        print(f"   Callerid: {current.get('callerid')}")
        print(f"   Insecure: {current.get('insecure')}")
        print(f"   Transport: {current.get('transport')}")
        print(f"   Context: {current.get('context')}")

    print("\n" + "=" * 60)
    print("TEST 2: Try updating with POST to sip/save")
    print("=" * 60)

    clean_number = phone_number.replace('+', '')

    # Try method 1: POST with all data
    update_data = {
        'module': 'sip',
        'action': 'save',
        'id': sip_id,
        'host': livekit_domain,
        'fromdomain': livekit_domain,
        'defaultuser': phone_number,
        'fromuser': phone_number,
        'callerid': f'<{clean_number}>',
        'insecure': 'port,invite',
        'transport': 'tcp',
        'port': '5060',
        'context': 'billing',
        'permit': '0.0.0.0/0.0.0.0'
    }

    print(f"\n📤 Sending POST to sip/save with data:")
    print(json.dumps(update_data, indent=2))

    result = magnus._make_request('POST', 'sip/save', update_data)
    print(f"\n📥 Result: {json.dumps(result, indent=2)}")

    print("\n" + "=" * 60)
    print("TEST 3: Try updating with PUT to sip/save")
    print("=" * 60)

    result = magnus._make_request('PUT', 'sip/save', update_data)
    print(f"\n📥 Result: {json.dumps(result, indent=2)}")

    print("\n" + "=" * 60)
    print("TEST 4: Try minimal update - just host field")
    print("=" * 60)

    minimal_data = {
        'module': 'sip',
        'action': 'save',
        'id': sip_id,
        'host': livekit_domain
    }

    print(f"\n📤 Sending POST with minimal data:")
    print(json.dumps(minimal_data, indent=2))

    result = magnus._make_request('POST', 'sip/save', minimal_data)
    print(f"\n📥 Result: {json.dumps(result, indent=2)}")

    print("\n" + "=" * 60)
    print("TEST 5: Read SIP account again to see if anything changed")
    print("=" * 60)

    result = magnus._make_request('POST', 'sip/read', read_data)
    if result.get('rows'):
        updated = result['rows'][0]
        print(f"\n📋 SIP account {sip_id} after update attempts:")
        print(f"   Name: {updated.get('name')}")
        print(f"   Host: {updated.get('host')}")
        print(f"   Fromdomain: {updated.get('fromdomain')}")
        print(f"   Defaultuser: {updated.get('defaultuser')}")
        print(f"   Authuser: {updated.get('auth')}")
        print(f"   Fromuser: {updated.get('fromuser')}")
        print(f"   Callerid: {updated.get('callerid')}")
        print(f"   Insecure: {updated.get('insecure')}")
        print(f"   Transport: {updated.get('transport')}")
        print(f"   Context: {updated.get('context')}")

if __name__ == "__main__":
    main()
