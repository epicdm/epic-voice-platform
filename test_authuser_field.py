#!/usr/bin/env python3
"""
Test to find the correct field name for authuser in Magnus SIP
"""
import os
import sys
from dotenv import load_dotenv
import json

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from magnus_billing_client_new import MagnusBillingClientNew

def main():
    magnus = MagnusBillingClientNew(
        api_key=os.getenv('MAGNUS_API_KEY'),
        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
        base_url=os.getenv('MAGNUS_BASE_URL')
    )

    sip_id = "1674"
    phone_number = "+17678189866"

    print("=" * 60)
    print("Testing different field names for authuser")
    print("=" * 60)

    # Test 1: Try 'authuser'
    print("\nTest 1: Using 'authuser' field")
    test_data = {
        'module': 'sip',
        'action': 'save',
        'id': sip_id,
        'authuser': phone_number
    }
    result = magnus._make_request('POST', 'sip/save', test_data)
    print(f"Result success: {result.get('success')}")
    if result.get('rows'):
        print(f"Auth field value: {result['rows'][0].get('auth')}")

    # Test 2: Try 'auth'
    print("\nTest 2: Using 'auth' field")
    test_data = {
        'module': 'sip',
        'action': 'save',
        'id': sip_id,
        'auth': phone_number
    }
    result = magnus._make_request('POST', 'sip/save', test_data)
    print(f"Result success: {result.get('success')}")
    if result.get('rows'):
        print(f"Auth field value: {result['rows'][0].get('auth')}")

    # Read back to verify
    print("\n" + "=" * 60)
    print("Reading SIP account to verify")
    print("=" * 60)
    filter_obj = [{'type': 'numeric', 'field': 'id', 'value': sip_id, 'comparison': 'eq'}]
    read_data = {'module': 'sip', 'action': 'read', 'filter': json.dumps(filter_obj)}
    result = magnus._make_request('POST', 'sip/read', read_data)

    if result.get('rows'):
        sip = result['rows'][0]
        print(f"\nSIP Account {sip_id}:")
        print(f"  auth: {sip.get('auth')}")
        print(f"  defaultuser: {sip.get('defaultuser')}")
        print(f"  fromuser: {sip.get('fromuser')}")

if __name__ == "__main__":
    main()
