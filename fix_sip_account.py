#!/usr/bin/env python3
"""
Quick script to update existing SIP account 1674 with correct LiveKit fields
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from magnus_billing_client_new import MagnusBillingClientNew

def main():
    # Initialize Magnus client
    magnus_client = MagnusBillingClientNew(
        api_key=os.getenv('MAGNUS_API_KEY'),
        secret_key=os.getenv('MAGNUS_SECRET_KEY'),
        base_url=os.getenv('MAGNUS_BASE_URL')
    )

    # SIP account details from the provision attempt
    sip_id = "1674"
    phone_number = "+17678189866"
    livekit_sip_domain = "3m4yki5jezn.sip.livekit.cloud"

    # Use a password (you can set a new one if needed)
    password = "NewSecurePass123"

    print(f"🔧 Updating SIP account {sip_id} for LiveKit integration...")
    print(f"   Phone: {phone_number}")
    print(f"   LiveKit Domain: {livekit_sip_domain}")

    result = magnus_client.update_sip_for_livekit(
        sip_id=sip_id,
        phone_number=phone_number,
        password=password,
        livekit_sip_domain=livekit_sip_domain
    )

    if result.get('success'):
        print("\n✅ SIP account updated successfully!")
        print(f"\nFields that were set:")
        print(f"  - host: {livekit_sip_domain}")
        print(f"  - fromdomain: {livekit_sip_domain}")
        print(f"  - defaultuser: {phone_number}")
        print(f"  - authuser: {phone_number}")
        print(f"  - fromuser: {phone_number}")
        print(f"  - callerid: <{phone_number.replace('+', '')}>")
        print(f"  - insecure: port,invite")
        print(f"  - transport: tcp")
        print(f"  - port: 5060")
        print(f"  - permit: 0.0.0.0/0.0.0.0")
        print(f"  - context: billing")
    else:
        print(f"\n❌ Failed to update: {result.get('error')}")

if __name__ == "__main__":
    main()
