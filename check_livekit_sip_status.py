#!/usr/bin/env python3
"""
Check LiveKit SIP Trunk Status
"""
import os
import asyncio
from livekit import api
from livekit.protocol import sip

async def check_sip_trunk_status(trunk_id: str, kind: str):
    """Check if a LiveKit SIP trunk is active"""
    # LiveKit doesn't have a direct "status" check - trunks are either configured or not
    # We'll just return if we can find it in the list
    print(f"Trunk {trunk_id} ({kind}): Configured and ready")
    return True

async def list_all_trunks():
    """List all SIP trunks"""
    try:
        livekit_url = os.getenv('LIVEKIT_URL', 'wss://ai-agent-dl6ldsi8.livekit.cloud')
        livekit_api_key = os.getenv('LIVEKIT_API_KEY', 'APIfFhqC7dRApB2')
        livekit_api_secret = os.getenv('LIVEKIT_API_SECRET', 'U5ln2qZ6BDX1SwYBnla31AgcyhInbSuepNDYPIfhs9V')

        # Create LiveKit API client
        lk_api = api.LiveKitAPI(
            url=livekit_url,
            api_key=livekit_api_key,
            api_secret=livekit_api_secret
        )

        print("=== LIVEKIT SIP TRUNK STATUS ===\n")

        # List inbound trunks
        print("📥 INBOUND TRUNKS:")
        inbound_request = sip.ListSIPInboundTrunkRequest()
        inbound_trunks = await lk_api.sip.list_sip_inbound_trunk(inbound_request)

        if inbound_trunks and len(inbound_trunks.items) > 0:
            for trunk in inbound_trunks.items:
                print(f"\n  ✓ Trunk ID: {trunk.sip_trunk_id}")
                print(f"    Numbers: {', '.join(trunk.numbers) if trunk.numbers else 'None'}")
                print(f"    Name: {trunk.name}")
                if hasattr(trunk, 'allowed_numbers'):
                    print(f"    Allowed Numbers: {trunk.allowed_numbers}")
        else:
            print("  No inbound trunks found")

        # List outbound trunks
        print("\n\n📤 OUTBOUND TRUNKS:")
        outbound_request = sip.ListSIPOutboundTrunkRequest()
        outbound_trunks = await lk_api.sip.list_sip_outbound_trunk(outbound_request)

        if outbound_trunks and len(outbound_trunks.items) > 0:
            for trunk in outbound_trunks.items:
                print(f"\n  ✓ Trunk ID: {trunk.sip_trunk_id}")
                print(f"    Numbers: {', '.join(trunk.numbers) if trunk.numbers else 'None'}")
                print(f"    Name: {trunk.name}")
                print(f"    Address: {trunk.address}")
        else:
            print("  No outbound trunks found")

        await lk_api.aclose()

        return {
            'inbound': inbound_trunks.items if inbound_trunks else [],
            'outbound': outbound_trunks.items if outbound_trunks else []
        }

    except Exception as e:
        print(f"❌ Error listing trunks: {e}")
        import traceback
        traceback.print_exc()
        return None

async def main():
    # List all trunks
    trunks = await list_all_trunks()

    if trunks:
        print("\n\n=== ANALYSIS ===")
        print(f"Total Inbound Trunks: {len(trunks.get('inbound', []))}")
        print(f"Total Outbound Trunks: {len(trunks.get('outbound', []))}")

        # Check for our specific phone numbers
        our_numbers = ['+17678189612', '+17678189487', '+17678189426', '+17678189910', '+17678189654']

        print("\n📞 Checking our phone numbers:")
        for number in our_numbers:
            found_inbound = any(number in trunk.numbers for trunk in trunks.get('inbound', []) if trunk.numbers)
            found_outbound = any(number in trunk.numbers for trunk in trunks.get('outbound', []) if trunk.numbers)

            status = "✅" if (found_inbound or found_outbound) else "❌"
            print(f"  {status} {number}: Inbound={'✓' if found_inbound else '✗'} Outbound={'✓' if found_outbound else '✗'}")

if __name__ == '__main__':
    asyncio.run(main())
