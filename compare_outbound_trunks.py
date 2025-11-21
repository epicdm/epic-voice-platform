#!/usr/bin/env python3
"""
Compare LiveKit outbound trunk configurations for troubleshooting
Based on official LiveKit documentation
"""
import asyncio
import os
from livekit import api
from livekit.protocol.sip import ListSIPOutboundTrunkRequest

async def main():
    # Initialize LiveKit API client
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.epic.dm')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    if not all([livekit_url, livekit_api_key, livekit_api_secret]):
        print("❌ LiveKit credentials not configured")
        return

    livekit_api = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

    trunk_mapping = {
        'ST_wtHm7jtDaJAs': ('+17678189426', 'NOT WORKING'),
        'ST_zjY8VpLRdM88': ('+17678189267', 'WORKING')
    }

    print("=" * 80)
    print("LiveKit Outbound SIP Trunk Comparison")
    print("=" * 80)
    print()

    try:
        # List all outbound trunks
        result = await livekit_api.sip.list_sip_outbound_trunk(
            ListSIPOutboundTrunkRequest()
        )

        trunks = {}
        for trunk in result.items:
            trunk_id = trunk.sip_trunk_id
            if trunk_id in trunk_mapping:
                phone, status = trunk_mapping[trunk_id]
                trunks[trunk_id] = trunk

                print(f"📞 Trunk {trunk_id} ({phone}) - {status}:")
                print("-" * 80)
                print(f"   Name: {trunk.name}")
                print(f"   Address: {trunk.address}")
                print(f"   Transport: {trunk.transport}")
                print(f"   Numbers: {trunk.numbers}")
                print(f"   Auth Username: {trunk.auth_username}")
                print(f"   Auth Password: {'*' * len(trunk.auth_password) if trunk.auth_password else 'NOT SET'}")
                print(f"   Headers: {trunk.headers if trunk.headers else 'None'}")
                print(f"   Metadata: {trunk.metadata if trunk.metadata else 'None'}")
                print()

        # Compare trunks
        if len(trunks) == 2:
            print("=" * 80)
            print("CONFIGURATION DIFFERENCES:")
            print("=" * 80)

            trunk1_id = 'ST_wtHm7jtDaJAs'
            trunk2_id = 'ST_zjY8VpLRdM88'

            trunk1 = trunks.get(trunk1_id)
            trunk2 = trunks.get(trunk2_id)

            if trunk1 and trunk2:
                differences = []

                # Compare critical fields
                if trunk1.name != trunk2.name:
                    differences.append(('name', trunk1.name, trunk2.name))

                if trunk1.address != trunk2.address:
                    differences.append(('address', trunk1.address, trunk2.address))
                    print("   ⚠️  ADDRESS MISMATCH - This is the most common cause of 503 errors!")
                    print()

                if trunk1.transport != trunk2.transport:
                    differences.append(('transport', trunk1.transport, trunk2.transport))
                    print("   ⚠️  TRANSPORT MISMATCH - UDP/TCP/TLS must match provider requirements!")
                    print()

                if trunk1.auth_username != trunk2.auth_username:
                    differences.append(('auth_username', trunk1.auth_username, trunk2.auth_username))
                    print("   ⚠️  AUTH USERNAME MISMATCH - This will cause 403 Forbidden errors!")
                    print()

                if trunk1.auth_password != trunk2.auth_password:
                    differences.append(('auth_password', '***', '***'))
                    print("   ⚠️  AUTH PASSWORD MISMATCH - This will cause 403 Forbidden errors!")
                    print()

                if trunk1.headers != trunk2.headers:
                    differences.append(('headers', trunk1.headers, trunk2.headers))

                if differences:
                    print(f"Found {len(differences)} configuration differences:")
                    print()
                    for field, val1, val2 in differences:
                        print(f"   {field}:")
                        print(f"      {trunk1_id} (NOT WORKING): {val1}")
                        print(f"      {trunk2_id} (WORKING):     {val2}")
                        print()

                    print("=" * 80)
                    print("RECOMMENDED ACTIONS:")
                    print("=" * 80)
                    print()
                    print("1. Update trunk ST_wtHm7jtDaJAs to match the working configuration")
                    print("2. Use LiveKit Cloud dashboard or CLI to update trunk:")
                    print()
                    print("   Via Dashboard:")
                    print("   - Go to Telephony → Configuration")
                    print("   - Find trunk ST_wtHm7jtDaJAs → Configure trunk")
                    print("   - Update fields to match ST_zjY8VpLRdM88")
                    print()
                    print("3. Test outbound call again after updating")
                    print()
                else:
                    print("   ✅ No configuration differences found!")
                    print()
                    print("   Both trunks have identical configuration. The issue may be:")
                    print("   - Provider-side configuration for this specific number")
                    print("   - Billing/credit issues with Magnus Billing")
                    print("   - Number not properly activated for outbound calls")
                    print()
            else:
                print("   ❌ Cannot compare - one or both trunks not found")
                print()
        else:
            print("=" * 80)
            print("⚠️  WARNING: Could not find both trunks for comparison")
            print("=" * 80)
            print()
            print(f"Found {len(trunks)} out of 2 expected trunks.")
            print("Available trunk IDs:")
            for trunk in result.items:
                print(f"  - {trunk.sip_trunk_id}")
            print()

    except Exception as e:
        print(f"❌ Error fetching trunks: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await livekit_api.aclose()

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
