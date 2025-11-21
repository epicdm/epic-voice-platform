#!/usr/bin/env python3
"""
Recreate outbound trunk for +17678189426 to refresh Magnus Billing connection
"""
import asyncio
import os
from livekit import api
from livekit.protocol.sip import (
    CreateSIPOutboundTrunkRequest,
    DeleteSIPOutboundTrunkRequest,
    SIPOutboundTrunkInfo
)
from database import SessionLocal
from phone_number_manager import PhoneNumberPool

async def main():
    # Get current configuration from database
    db = SessionLocal()
    phone = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.phone_number == '+17678189426'
    ).first()

    if not phone:
        print("❌ Phone number not found in database")
        return

    print("=" * 80)
    print("Recreating Outbound Trunk for +17678189426")
    print("=" * 80)
    print()
    print(f"Current configuration:")
    print(f"  Phone: {phone.phone_number}")
    print(f"  Current Trunk ID: {phone.livekit_outbound_trunk_id}")
    print(f"  Magnus Username: {phone.magnus_sip_username}")
    print(f"  Magnus Password: {phone.magnus_sip_password}")
    print()

    # Initialize LiveKit API
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.epic.dm')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    livekit_api = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

    try:
        # Step 1: Delete old trunk
        print(f"🗑️  Deleting old trunk {phone.livekit_outbound_trunk_id}...")
        delete_request = DeleteSIPOutboundTrunkRequest(
            sip_trunk_id=phone.livekit_outbound_trunk_id
        )
        await livekit_api.sip.delete_sip_outbound_trunk(delete_request)
        print(f"✅ Old trunk deleted")
        print()

        # Step 2: Create new trunk with same configuration
        print(f"🔧 Creating new trunk...")
        trunk = SIPOutboundTrunkInfo(
            name=f"User 0efe6c17 Outbound - Magnus",
            address="voice.epic.dm:5060",
            auth_username=phone.magnus_sip_username,
            auth_password=phone.magnus_sip_password,
            numbers=[phone.phone_number]
        )

        create_request = CreateSIPOutboundTrunkRequest(trunk=trunk)
        result = await livekit_api.sip.create_sip_outbound_trunk(create_request)

        new_trunk_id = result.sip_trunk_id
        print(f"✅ New trunk created: {new_trunk_id}")
        print()

        # Step 3: Update database with new trunk ID
        print(f"💾 Updating database...")
        phone.livekit_outbound_trunk_id = new_trunk_id
        db.commit()
        print(f"✅ Database updated")
        print()

        print("=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print()
        print(f"New trunk ID: {new_trunk_id}")
        print()
        print("Test outbound call with:")
        print(f"  curl -X POST http://localhost:5001/api/user/calls/test-outbound \\")
        print(f'    -H "X-User-Email: giraud.eric@gmail.com" \\')
        print(f'    -H "Content-Type: application/json" \\')
        print(f"    -d '{{")
        print(f'      "from_number": "+17678189426",')
        print(f'      "to_number": "+YOUR_PHONE",')
        print(f'      "agent_id": "139d8d20-293d-4a1b-817f-73cc7f35b1ee"')
        print(f"    }}'"
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        await livekit_api.aclose()

if __name__ == "__main__":
    asyncio.run(main())
