#!/usr/bin/env python3
"""
Final test of SIP update with all required LiveKit fields
"""
import os
import sys
from dotenv import load_dotenv

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
    livekit_domain = "3m4yki5jezn.sip.livekit.cloud"
    password = "TestPass123"

    print("=" * 70)
    print("TESTING COMPLETE SIP UPDATE FOR LIVEKIT INTEGRATION")
    print("=" * 70)

    print(f"\n📋 SIP Account: {sip_id}")
    print(f"📋 Phone Number: {phone_number}")
    print(f"📋 LiveKit Domain: {livekit_domain}")

    # Use the update_sip_for_livekit method (which now uses POST)
    print("\n🔧 Calling update_sip_for_livekit()...")
    result = magnus.update_sip_for_livekit(
        sip_id=sip_id,
        phone_number=phone_number,
        password=password,
        livekit_sip_domain=livekit_domain
    )

    if result.get('success'):
        print("\n✅ SIP UPDATE SUCCESSFUL!")
        print("\nFields that should be set:")
        print(f"  ✓ host: {livekit_domain}")
        print(f"  ✓ fromdomain: {livekit_domain}")
        print(f"  ✓ defaultuser: {phone_number}")
        print(f"  ✓ authuser: {phone_number}")
        print(f"  ✓ fromuser: {phone_number}")
        print(f"  ✓ callerid: <{phone_number.replace('+', '')}>")
        print(f"  ✓ insecure: port,invite")
        print(f"  ✓ transport: tcp")
        print(f"  ✓ port: 5060")
        print(f"  ✓ permit: 0.0.0.0/0.0.0.0")
        print(f"  ✓ context: billing")
        print(f"  ✓ secret: {password}")
    else:
        print(f"\n❌ SIP UPDATE FAILED: {result.get('error')}")

    # Verify by reading back
    print("\n" + "=" * 70)
    print("VERIFICATION: Reading SIP account from Magnus")
    print("=" * 70)

    import json
    filter_obj = [{'type': 'numeric', 'field': 'id', 'value': sip_id, 'comparison': 'eq'}]
    read_data = {'module': 'sip', 'action': 'read', 'filter': json.dumps(filter_obj)}
    read_result = magnus._make_request('POST', 'sip/read', read_data)

    if read_result.get('rows'):
        sip = read_result['rows'][0]
        print(f"\n📋 Actual values in Magnus:")
        print(f"  host: {sip.get('host')}")
        print(f"  fromdomain: {sip.get('fromdomain')}")
        print(f"  defaultuser: {sip.get('defaultuser')}")
        print(f"  authuser/auth: {sip.get('auth')}")
        print(f"  fromuser: {sip.get('fromuser')}")
        print(f"  callerid: {sip.get('callerid')}")
        print(f"  insecure: {sip.get('insecure')}")
        print(f"  transport: {sip.get('transport')}")
        print(f"  port: {sip.get('port')}")
        print(f"  permit: {sip.get('permit')}")
        print(f"  context: {sip.get('context')}")
        print(f"  secret: {sip.get('secret')}")

        # Check what matches
        print("\n" + "=" * 70)
        print("FIELD VERIFICATION")
        print("=" * 70)
        checks = [
            ('host', livekit_domain, sip.get('host')),
            ('fromdomain', livekit_domain, sip.get('fromdomain')),
            ('defaultuser', phone_number, sip.get('defaultuser')),
            ('fromuser', phone_number, sip.get('fromuser')),
            ('callerid', f'<{phone_number.replace("+", "")}>', sip.get('callerid')),
            ('insecure', 'port,invite', sip.get('insecure')),
            ('transport', 'tcp', sip.get('transport')),
            ('context', 'billing', sip.get('context')),
            ('secret', password, sip.get('secret')),
        ]

        all_good = True
        for field, expected, actual in checks:
            match = "✅" if expected == actual else "❌"
            print(f"{match} {field}: {actual} (expected: {expected})")
            if expected != actual:
                all_good = False

        if all_good:
            print("\n🎉 ALL FIELDS VERIFIED SUCCESSFULLY!")
        else:
            print("\n⚠️  Some fields don't match expected values")

if __name__ == "__main__":
    main()
