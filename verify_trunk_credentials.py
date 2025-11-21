#!/usr/bin/env python3
"""
Verify that LiveKit trunk credentials match database credentials
"""
import asyncio
import os
from livekit import api
from livekit.protocol.sip import ListSIPOutboundTrunkRequest
from database import SessionLocal
from phone_number_manager import PhoneNumberPool

async def main():
    print("=" * 80)
    print("LiveKit Trunk Credentials Verification")
    print("=" * 80)
    print()

    # Initialize LiveKit API
    livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.epic.dm')
    livekit_api_key = os.getenv('LIVEKIT_API_KEY')
    livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

    livekit_api = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

    # Get database credentials
    db = SessionLocal()
    try:
        phones = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number.in_(['+17678189426', '+17678189267'])
        ).all()

        db_creds = {}
        for phone in phones:
            db_creds[phone.phone_number] = {
                'username': phone.magnus_sip_username,
                'password': phone.magnus_sip_password,
                'domain': phone.magnus_sip_domain,
                'outbound_trunk_id': phone.livekit_outbound_trunk_id
            }

        # Get LiveKit trunk credentials
        result = await livekit_api.sip.list_sip_outbound_trunk(
            ListSIPOutboundTrunkRequest()
        )

        print("CREDENTIAL VERIFICATION:")
        print("-" * 80)
        print()

        mismatches = []
        for trunk in result.items:
            trunk_id = trunk.sip_trunk_id
            trunk_numbers = trunk.numbers

            if trunk_numbers:
                phone_number = trunk_numbers[0]  # Get first number from trunk

                if phone_number in db_creds:
                    db_info = db_creds[phone_number]

                    print(f"📞 Phone Number: {phone_number}")
                    print(f"   Trunk ID: {trunk_id}")
                    print()

                    # Check username match
                    username_match = trunk.auth_username == db_info['username']
                    print(f"   Username Match: {'✅ YES' if username_match else '❌ NO'}")
                    print(f"      LiveKit Trunk: {trunk.auth_username}")
                    print(f"      Database:      {db_info['username']}")

                    if not username_match:
                        mismatches.append(('username', phone_number, trunk_id))
                    print()

                    # Check password match
                    password_match = trunk.auth_password == db_info['password']
                    print(f"   Password Match: {'✅ YES' if password_match else '❌ NO'}")
                    print(f"      LiveKit Trunk: {trunk.auth_password}")
                    print(f"      Database:      {db_info['password']}")

                    if not password_match:
                        mismatches.append(('password', phone_number, trunk_id))
                    print()

                    print("-" * 80)
                    print()

        if mismatches:
            print("=" * 80)
            print("⚠️  CREDENTIAL MISMATCHES FOUND!")
            print("=" * 80)
            print()
            print(f"Found {len(mismatches)} credential mismatches.")
            print()

            for field, phone, trunk_id in mismatches:
                db_info = db_creds[phone]
                print(f"❌ {phone} ({trunk_id}): {field} mismatch")
                print(f"   Database has correct Magnus Billing credentials")
                print(f"   LiveKit trunk needs to be updated")
                print()

            print("RECOMMENDED ACTION:")
            print("-" * 80)
            print()
            print("Update the LiveKit trunk with correct credentials from database:")
            print()
            for field, phone, trunk_id in mismatches:
                db_info = db_creds[phone]
                print(f"Trunk {trunk_id} ({phone}):")
                print(f"  Username: {db_info['username']}")
                print(f"  Password: {db_info['password']}")
                print()

            print("Use livekit_telephony.py to update trunk or use LiveKit dashboard.")
            print()
        else:
            print("=" * 80)
            print("✅ ALL CREDENTIALS MATCH!")
            print("=" * 80)
            print()
            print("LiveKit trunk credentials match the database.")
            print("The issue may be on the Magnus Billing side.")
            print()
            print("Next steps:")
            print("1. Verify Magnus Billing SIP account is activated for outbound calls")
            print("2. Check Magnus Billing user has sufficient credit")
            print("3. Verify Magnus Billing DID is properly configured for outbound")
            print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()
        await livekit_api.aclose()

    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(main())
