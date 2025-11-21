#!/usr/bin/env python3
"""
Setup Platform Credentials in n8n
Creates SMTP and Twilio credentials via n8n API for funnel workflows
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import requests
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# n8n Configuration
N8N_URL = os.getenv('N8N_URL', 'https://n8n.ai.epic.dm')
N8N_API_KEY = os.getenv('N8N_API_KEY')

# SMTP Configuration (SendGrid)
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.sendgrid.net')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', 'apikey')
SMTP_PASSWORD = os.getenv('SENDGRID_API_KEY', '')

# Twilio Configuration
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')


def create_smtp_credential():
    """Create Platform SMTP credential in n8n"""
    logger.info("Creating Platform SMTP credential...")

    headers = {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
    }

    credential = {
        "name": "Platform SMTP",
        "type": "smtp",
        "data": {
            "user": SMTP_USER,
            "password": SMTP_PASSWORD,
            "host": SMTP_HOST,
            "port": SMTP_PORT,
            "secure": False,  # Use STARTTLS instead of SSL
            "disableStartTls": False  # Enable STARTTLS
        }
    }

    try:
        response = requests.post(
            f"{N8N_URL}/api/v1/credentials",
            headers=headers,
            json=credential,
            timeout=30
        )

        if response.status_code in [200, 201]:
            cred = response.json()
            logger.info(f"✅ Platform SMTP credential created: {cred.get('id')}")
            return cred
        elif response.status_code == 409:
            logger.info("ℹ️  Platform SMTP credential already exists")
            # Get existing credential
            response = requests.get(
                f"{N8N_URL}/api/v1/credentials",
                headers=headers,
                timeout=30
            )
            if response.status_code == 200:
                creds = response.json()
                for cred in creds.get('data', []):
                    if cred.get('name') == 'Platform SMTP':
                        logger.info(f"✅ Found existing Platform SMTP: {cred.get('id')}")
                        return cred
        else:
            logger.error(f"❌ Failed to create SMTP credential: {response.status_code}")
            logger.error(f"   Response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"❌ Error creating SMTP credential: {e}")
        return None


def create_twilio_credential():
    """Create Platform Twilio credential in n8n"""
    logger.info("Creating Platform Twilio credential...")

    headers = {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Content-Type': 'application/json'
    }

    credential = {
        "name": "Platform Twilio",
        "type": "twilioApi",
        "data": {
            "authType": "authToken",
            "accountSid": TWILIO_ACCOUNT_SID,
            "authToken": TWILIO_AUTH_TOKEN,
            # n8n schema requires these even for authToken type (seems like a bug)
            "apiKeySid": TWILIO_ACCOUNT_SID,  # Use account SID as fallback
            "apiKeySecret": TWILIO_AUTH_TOKEN  # Use auth token as fallback
        }
    }

    try:
        response = requests.post(
            f"{N8N_URL}/api/v1/credentials",
            headers=headers,
            json=credential,
            timeout=30
        )

        if response.status_code in [200, 201]:
            cred = response.json()
            logger.info(f"✅ Platform Twilio credential created: {cred.get('id')}")
            return cred
        elif response.status_code == 409:
            logger.info("ℹ️  Platform Twilio credential already exists")
            # Get existing credential
            response = requests.get(
                f"{N8N_URL}/api/v1/credentials",
                headers=headers,
                timeout=30
            )
            if response.status_code == 200:
                creds = response.json()
                for cred in creds.get('data', []):
                    if cred.get('name') == 'Platform Twilio':
                        logger.info(f"✅ Found existing Platform Twilio: {cred.get('id')}")
                        return cred
        else:
            logger.error(f"❌ Failed to create Twilio credential: {response.status_code}")
            logger.error(f"   Response: {response.text}")
            return None

    except Exception as e:
        logger.error(f"❌ Error creating Twilio credential: {e}")
        return None


def main():
    """Setup all platform credentials"""
    print("=" * 60)
    print("  n8n Platform Credentials Setup")
    print("=" * 60)

    if not N8N_API_KEY:
        logger.error("❌ N8N_API_KEY not set in environment")
        sys.exit(1)

    # Create SMTP credential
    smtp_cred = create_smtp_credential()

    # Create Twilio credential
    twilio_cred = create_twilio_credential()

    print("\n" + "=" * 60)
    print("  Setup Summary")
    print("=" * 60)
    print(f"Platform SMTP: {'✅ Created/Found' if smtp_cred else '❌ Failed'}")
    print(f"Platform Twilio: {'✅ Created/Found' if twilio_cred else '❌ Failed'}")

    if smtp_cred and twilio_cred:
        print("\n✅ All credentials ready!")
        print("\nWorkflows can now reference:")
        print('  - "Platform SMTP" for email nodes')
        print('  - "Platform Twilio" for SMS nodes')
    else:
        print("\n⚠️  Some credentials failed to create")
        sys.exit(1)


if __name__ == "__main__":
    main()
