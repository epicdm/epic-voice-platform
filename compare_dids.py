#!/usr/bin/env python3
"""
Compare Magnus Billing DID configurations for troubleshooting outbound calls
"""
import os
from magnus_billing_client_new import MagnusBillingClientNew

# Initialize Magnus Billing client
MAGNUS_API_KEY = os.getenv('MAGNUS_API_KEY')
MAGNUS_SECRET = os.getenv('MAGNUS_SECRET_KEY')
MAGNUS_URL = os.getenv('MAGNUS_URL', 'https://billing.epic.dm')

client = MagnusBillingClientNew(MAGNUS_API_KEY, MAGNUS_SECRET, MAGNUS_URL)

# DIDs to compare
# +17678189267 = Magnus ID 2412 (WORKING)
# +17678189426 = Magnus ID 2411 (NOT WORKING)

print("=" * 80)
print("Comparing Magnus Billing DID Configurations")
print("=" * 80)
print()

# Get DID 2412 (working)
print("📞 DID 2412 (+17678189267) - WORKING:")
print("-" * 80)
response_2412 = client._make_request('GET', 'did/read', {'filter': '[{"type":"numeric","field":"id","value":"2412","comparison":"eq"}]'})
if response_2412.get('rows'):
    did_2412 = response_2412['rows'][0]
    print(f"   ID: {did_2412.get('id')}")
    print(f"   DID: {did_2412.get('did')}")
    print(f"   Activated: {did_2412.get('activated')}")
    print(f"   Reserved: {did_2412.get('reserved')}")
    print(f"   Connection Charge: {did_2412.get('connection_charge')}")
    print(f"   Selling Rate: {did_2412.get('selling_rate')}")
    print(f"   ID User: {did_2412.get('id_user')}")
    print(f"   Voip Call: {did_2412.get('voip_call')}")
    print(f"   DID Type: {did_2412.get('did_type')}")
    print()
else:
    print("   ❌ Failed to fetch DID 2412")
    print(f"   Response: {response_2412}")
    print()

# Get DID 2411 (not working)
print("📞 DID 2411 (+17678189426) - NOT WORKING:")
print("-" * 80)
response_2411 = client._make_request('GET', 'did/read', {'filter': '[{"type":"numeric","field":"id","value":"2411","comparison":"eq"}]'})
if response_2411.get('rows'):
    did_2411 = response_2411['rows'][0]
    print(f"   ID: {did_2411.get('id')}")
    print(f"   DID: {did_2411.get('did')}")
    print(f"   Activated: {did_2411.get('activated')}")
    print(f"   Reserved: {did_2411.get('reserved')}")
    print(f"   Connection Charge: {did_2411.get('connection_charge')}")
    print(f"   Selling Rate: {did_2411.get('selling_rate')}")
    print(f"   ID User: {did_2411.get('id_user')}")
    print(f"   Voip Call: {did_2411.get('voip_call')}")
    print(f"   DID Type: {did_2411.get('did_type')}")
    print()
else:
    print("   ❌ Failed to fetch DID 2411")
    print(f"   Response: {response_2411}")
    print()

# Compare differences
print("=" * 80)
print("DIFFERENCES:")
print("=" * 80)
if response_2412.get('rows') and response_2411.get('rows'):
    did_2412 = response_2412['rows'][0]
    did_2411 = response_2411['rows'][0]

    differences = []
    for key in did_2412.keys():
        val_2412 = did_2412.get(key)
        val_2411 = did_2411.get(key)
        if val_2412 != val_2411:
            differences.append((key, val_2412, val_2411))

    if differences:
        print(f"Found {len(differences)} differences:")
        print()
        for key, val_2412, val_2411 in differences:
            print(f"   {key}:")
            print(f"      2412 (working): {val_2412}")
            print(f"      2411 (broken):  {val_2411}")
            print()
    else:
        print("   No differences found! (Configuration should be identical)")
        print()
else:
    print("   ❌ Cannot compare - failed to fetch one or both DIDs")
    print()

print("=" * 80)
