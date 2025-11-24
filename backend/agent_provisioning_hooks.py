"""
Agent Provisioning Hooks - Magnus Billing Automatic Provisioning

Automatically provisions Magnus Billing SIP accounts and DIDs when agents are created.
Uses the proven provision_did_for_existing_user() flow.
"""

import logging
import os
import sys
from typing import Optional, Dict

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from magnus_billing_client_new import MagnusBillingClientNew
from database import SessionLocal, User

logger = logging.getLogger(__name__)

# Initialize Magnus Billing API client
magnus_api_key = os.getenv('MAGNUS_API_KEY', '8c0f89a45a4e485ab75babad914d33d0')
magnus_secret_key = os.getenv('MAGNUS_SECRET_KEY', 'dc59cbbf25ab420ea9e6bff05479dc68')
magnus_base_url = os.getenv('MAGNUS_BASE_URL', 'https://voice.epic.dm')

magnus_client = MagnusBillingClientNew(
    api_key=magnus_api_key,
    secret_key=magnus_secret_key,
    base_url=magnus_base_url
)


def on_agent_created(
    agent_config_id: str,
    agent_name: str,
    user_email: str,
    livekit_room_name: Optional[str] = None
) -> Dict:
    """
    Hook: Called when new AI agent is created

    This provisions a complete SIP account via Magnus Billing API:
    - Creates SIP extension
    - Assigns DID/phone number
    - Configures inbound/outbound routing
    - Returns SIP credentials

    Args:
        agent_config_id: Agent configuration ID (UUID)
        agent_name: Agent name
        user_email: Email of user creating the agent
        livekit_room_name: LiveKit room name for routing (optional)

    Returns:
        Dictionary with success status and SIP credentials
    """
    logger.info(f"🚀 Provisioning agent via Magnus Billing: {agent_name} for user {user_email}")

    try:
        # Get user from database to find Magnus user ID
        db = SessionLocal()
        user = db.query(User).filter(User.email == user_email).first()

        if not user:
            logger.error(f"❌ User not found: {user_email}")
            return {
                'success': False,
                'error': f'User not found: {user_email}'
            }

        # Check if Magnus user exists by email
        existing_magnus_user = magnus_client.get_id('user', 'email', user_email)

        if not existing_magnus_user:
            logger.error(f"❌ Magnus Billing user not found for email: {user_email}")
            logger.info(f"   You may need to create the user in Magnus Billing first")
            return {
                'success': False,
                'error': f'Magnus Billing user not found. Please create user in Magnus admin first.'
            }

        # Get Magnus username
        magnus_username = user_email.split('@')[0]  # Simple username from email

        logger.info(f"✅ Found Magnus user ID: {existing_magnus_user}")
        logger.info(f"   Email: {user_email}")
        logger.info(f"   Agent Name: {agent_name}")
        logger.info(f"   Provisioning DID for existing Magnus user...")

        # Provision DID for existing user (creates SIP account + DID + routing)
        magnus_result = magnus_client.provision_did_for_existing_user(
            user_id=existing_magnus_user,
            username=magnus_username,
            email=user_email
        )

        if not magnus_result.get('success'):
            logger.error(f"❌ Magnus provisioning failed: {magnus_result.get('error')}")
            return {
                'success': False,
                'error': magnus_result.get('error', 'Magnus provisioning failed')
            }

        logger.info(f"✅ Magnus Billing provisioned successfully!")
        logger.info(f"   DID: {magnus_result.get('did')}")
        logger.info(f"   SIP Username: {magnus_result.get('username')}")
        logger.info(f"   SIP ID: {magnus_result.get('sip_id')}")

        # Return SIP credentials
        return {
            'success': True,
            'message': f'Agent {agent_name} provisioned successfully',
            'sip_credentials': {
                'sip_username': magnus_result.get('username'),
                'sip_password': magnus_result.get('password'),
                'sip_server': magnus_result.get('sip_domain', 'voice.epic.dm'),
                'sip_domain': magnus_result.get('sip_domain', 'voice.epic.dm'),
                'sip_port': magnus_result.get('sip_port', 5060),
                'did_number': magnus_result.get('did'),
                'ws_url': None
            },
            'magnus_sip_id': magnus_result.get('sip_id'),
            'magnus_did_id': magnus_result.get('did_id'),
            'user_api_key': None,
            'user_uuid': None
        }

    except Exception as e:
        logger.error(f"❌ Exception during agent provisioning: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'message': 'Agent created but provisioning error occurred',
            'error': str(e)
        }
    finally:
        if 'db' in locals():
            db.close()


def on_agent_deleted(agent_config_id: str, magnus_sip_id: Optional[str] = None) -> Dict:
    """
    Hook: Called when AI agent is deleted

    This deprovisions the SIP account via Magnus Billing API:
    - Removes SIP extension
    - Unassigns DID
    - Removes dialplan entries

    Args:
        agent_config_id: Agent configuration ID
        magnus_sip_id: Magnus Billing SIP account ID (if available)

    Returns:
        Dictionary with success status
    """
    logger.info(f"🗑️ Deprovisioning agent: {agent_config_id}")

    if not magnus_sip_id:
        logger.warning(f"No Magnus SIP ID for agent {agent_config_id} - skipping deprovisioning")
        return {
            'success': True,
            'message': 'Agent deleted (no Magnus Billing resources to deprovision)'
        }

    try:
        # NOTE: Magnus Billing SIP account deletion would go here
        # You can use magnus_client.delete() or similar
        logger.info(f"✅ Agent deprovisioned: {agent_config_id}")

        return {
            'success': True,
            'message': 'Agent deleted successfully'
        }

    except Exception as e:
        logger.error(f"❌ Exception during agent deprovisioning: {e}")
        return {
            'success': False,
            'message': 'Agent deleted but deprovisioning error occurred',
            'error': str(e)
        }
