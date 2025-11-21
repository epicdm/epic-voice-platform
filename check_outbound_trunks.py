#!/usr/bin/env python3
"""
Check LiveKit outbound trunk configurations for debugging
"""
import asyncio
import os
from livekit import api

async def main():
    # Initialize LiveKit API client
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.epic.dm')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    lk_api = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

    trunk_ids = [
        ('ST_wtHm7jtDaJAs', '+17678189426', 'NOT WORKING'),
        ('ST_zjY8VpLRdM88', '+17678189267', 'WORKING')
    ]

    print("=" * 80)
    print("LiveKit Outbound SIP Trunk Comparison")
    print("=" * 80)
    print()

    trunks = {}
    for trunk_id, phone, status in trunk_ids:
        print(f"📞 Trunk {trunk_id} ({phone}) - {status}:")
        print("-" * 80)
        try:
            # List all trunks and find ours
            result = await lk_api.sip.list_sip_outbound_trunk(trunk_id)
            trunks[trunk_id] = result

            print(f"   Trunk ID: {trunk_id}")
            print(f"   Name: {result.name}")
            print(f"   Address: {result.address}")
            print(f"   Transport: {result.transport}")
            print(f"   Numbers: {result.numbers}")
            print(f"   Auth Username: {result.auth_username}")
            print(f"   Headers: {result.headers}")
            print()
        except Exception as e:
            print(f"   ❌ Error fetching trunk: {e}")
            print()

    # Compare trunks
    if len(trunks) == 2:
        print("=" * 80)
        print("DIFFERENCES:")
        print("=" * 80)

        trunk1_id = 'ST_wtHm7jtDaJAs'
        trunk2_id = 'ST_zjY8VpLRdM88'

        trunk1 = trunks.get(trunk1_id)
        trunk2 = trunks.get(trunk2_id)

        if trunk1 and trunk2:
            differences = []

            if trunk1.name != trunk2.name:
                differences.append(('name', trunk1.name, trunk2.name))
            if trunk1.address != trunk2.address:
                differences.append(('address', trunk1.address, trunk2.address))
            if trunk1.transport != trunk2.transport:
                differences.append(('transport', trunk1.transport, trunk2.transport))
            if trunk1.auth_username != trunk2.auth_username:
                differences.append(('auth_username', trunk1.auth_username, trunk2.auth_username))
            if trunk1.headers != trunk2.headers:
                differences.append(('headers', trunk1.headers, trunk2.headers))

            if differences:
                print(f"Found {len(differences)} differences:")
                print()
                for field, val1, val2 in differences:
                    print(f"   {field}:")
                    print(f"      {trunk1_id} (NOT WORKING): {val1}")
                    print(f"      {trunk2_id} (WORKING):     {val2}")
                    print()
            else:
                print("   No configuration differences found!")
                print()
        else:
            print("   ❌ Cannot compare - one or both trunks not fetched")
            print()

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
