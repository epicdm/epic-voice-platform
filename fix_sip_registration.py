#!/usr/bin/env python3
"""
Fix SIP Registration for +17678189659
Updates Magnus SIP account with correct settings for LiveKit registration
"""

import os
import sys
sys.path.insert(0, '/opt/livekit1')

from magnus_billing_client_new import MagnusBillingClientNew
from dotenv import load_dotenv
from database import SessionLocal
from phone_number_manager import PhoneNumberPool

load_dotenv('/opt/livekit1/.env')

def fix_sip_account(phone_number):
    """Fix SIP account settings for a phone number"""

    # Initialize Magnus client
    client = MagnusBillingClientNew(
        api_key=os.getenv('MAGNUS_API_KEY'),
        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
        base_url=os.getenv('MAGNUS_BASE_URL')
    )

    # Get phone number details from local database
    db = SessionLocal()
    try:
        phone_record = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_number
        ).first()

        if not phone_record:
            print(f"❌ Phone number {phone_number} not found in database")
            return False

        print(f"✅ Found phone number record:")
        print(f"   Phone: {phone_record.phone_number}")
        print(f"   SIP Username: {phone_record.magnus_sip_username}")
        print(f"   SIP Password: {phone_record.magnus_sip_password}")
        print(f"   SIP Domain: {phone_record.magnus_sip_domain}")
        print(f"   Magnus DID ID: {phone_record.magnus_did_id}")

        sip_username = phone_record.magnus_sip_username or phone_number
        sip_password = phone_record.magnus_sip_password
        livekit_sip_domain = phone_record.magnus_sip_domain

        if not sip_password:
            print(f"❌ No SIP password found in database")
            return False

        # Find the SIP account ID in Magnus
        print(f"\n🔍 Searching for SIP account with username: {sip_username}")
        sip_id = client.get_id('sip', 'name', sip_username)

        if not sip_id:
            print(f"❌ SIP account not found in Magnus for username: {sip_username}")
            return False

        print(f"✅ Found SIP account ID: {sip_id}")

        # Build the correct sip_config
        clean_number = phone_number.replace('+', '')

        sip_config = f"""insecure=port,invite
type=friend
fromdomain={livekit_sip_domain}
defaultuser={sip_username}
authuser={sip_username}
secret={sip_password}
fromuser={sip_username}
context=billing
callerid=<{clean_number}>
transport=tcp
port=5060
permit=0.0.0.0/0.0.0.0"""

        print(f"\n🔧 Updating SIP account {sip_id} with correct settings:")
        print("=" * 60)
        print(sip_config)
        print("=" * 60)

        # Update the SIP account
        update_data = {
            'id': sip_id,
            'host': livekit_sip_domain,  # CRITICAL: Must match LiveKit domain
            'sip_config': sip_config
        }

        result = client.update('sip', sip_id, update_data)

        if result.get('success'):
            print(f"\n✅ Successfully updated SIP account!")
            print(f"\n📋 Updated fields:")
            print(f"   Host: {livekit_sip_domain}")
            print(f"   SIP Config: Updated with insecure, permit, and LiveKit domain settings")

            print(f"\n⏳ Now waiting for LiveKit to REGISTER...")
            print(f"   LiveKit should send SIP REGISTER to: voice.epic.dm:5060")
            print(f"   With username: {sip_username}")
            print(f"   To domain: {livekit_sip_domain}")

            print(f"\n💡 Next steps:")
            print(f"   1. Wait 30-60 seconds for LiveKit to register")
            print(f"   2. Check status in UI - should show SIP trunk REGISTERED")
            print(f"   3. If still not registered, check LiveKit logs")

            return True
        else:
            print(f"❌ Failed to update SIP account: {result.get('error')}")
            return False

    finally:
        db.close()

if __name__ == '__main__':
    phone_number = '+17678189659'

    print("=" * 70)
    print(f"🔧 SIP Registration Fix Script")
    print(f"   Phone Number: {phone_number}")
    print("=" * 70)
    print()

    success = fix_sip_account(phone_number)

    print()
    print("=" * 70)
    if success:
        print("✅ FIX COMPLETED SUCCESSFULLY")
        print("\n🎯 What was fixed:")
        print("   1. Updated Magnus SIP host to LiveKit domain")
        print("   2. Added insecure=port,invite (allow connections)")
        print("   3. Added permit=0.0.0.0/0.0.0.0 (allow any IP)")
        print("   4. Configured proper SIP authentication settings")
        print("\n🚀 LiveKit should now be able to REGISTER with Magnus")
    else:
        print("❌ FIX FAILED - See error messages above")
    print("=" * 70)

    sys.exit(0 if success else 1)
