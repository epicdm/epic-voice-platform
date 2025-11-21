#!/usr/bin/env python3
"""
Find the Asterisk extra config field in Magnus SIP
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

    # Read SIP account to find extra config field
    filter_obj = [{'type': 'numeric', 'field': 'id', 'value': sip_id, 'comparison': 'eq'}]
    read_data = {'module': 'sip', 'action': 'read', 'filter': json.dumps(filter_obj)}
    result = magnus._make_request('POST', 'sip/read', read_data)

    if result.get('rows'):
        sip = result['rows'][0]
        print("Looking for Asterisk extra config field:")
        print(f"\n  addparameter: {sip.get('addparameter')}")
        print(f"  sip_config: {sip.get('sip_config')}")

        # Try setting addparameter
        print("\n" + "=" * 60)
        print("Testing addparameter field with missing settings")
        print("=" * 60)

        extra_config = """authuser=+17678189866
transport=tcp
port=5060"""

        update_data = {
            'module': 'sip',
            'action': 'save',
            'id': sip_id,
            'addparameter': extra_config
        }

        result = magnus._make_request('POST', 'sip/save', update_data)
        print(f"\nUpdate result: {result.get('success')}")

        # Read back
        result = magnus._make_request('POST', 'sip/read', read_data)
        if result.get('rows'):
            sip = result['rows'][0]
            print(f"\naddparameter after update:")
            print(f"  {sip.get('addparameter')}")

if __name__ == "__main__":
    main()
