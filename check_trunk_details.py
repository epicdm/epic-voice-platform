#!/usr/bin/env python3
"""
Get detailed trunk information including creation time and all parameters
"""
import asyncio
import os
from livekit import api
from livekit.protocol.sip import ListSIPOutboundTrunkRequest

async def main():
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.epic.dm')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    livekit_api = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

    try:
        result = await livekit_api.sip.list_sip_outbound_trunk(
            ListSIPOutboundTrunkRequest()
        )

        trunk_ids = ['ST_wtHm7jtDaJAs', 'ST_zjY8VpLRdM88']

        for trunk in result.items:
            if trunk.sip_trunk_id in trunk_ids:
                phone = trunk.numbers[0] if trunk.numbers else 'NO NUMBER'
                status = 'NOT WORKING' if trunk.sip_trunk_id == 'ST_wtHm7jtDaJAs' else 'WORKING'

                print("=" * 80)
                print(f"Trunk: {trunk.sip_trunk_id} ({phone}) - {status}")
                print("=" * 80)

                # Use dir() to see all available attributes
                for attr in dir(trunk):
                    if not attr.startswith('_'):
                        try:
                            value = getattr(trunk, attr)
                            if not callable(value):
                                print(f"{attr}: {value}")
                        except:
                            pass
                print()

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await livekit_api.aclose()

if __name__ == "__main__":
    asyncio.run(main())
