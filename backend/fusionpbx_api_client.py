"""
FusionPBX API Client for AI Agent Provisioning

This module provides a Python client for the FusionPBX AI Agent Provisioning API
at billing.call.epic.dm. It wraps the existing Laravel-based API endpoints that
handle SIP account creation, DID assignment, and deprovisioning.

API Documentation: /opt/AI_EPIC_PROVISIONING_DESIGN.md
Server: https://billing.call.epic.dm
Endpoints: /api/ai-agents/*

Author: AI Agent Provisioning System
Date: November 17, 2025
"""

import requests
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass

# Configure logging
logger = logging.getLogger(__name__)


@dataclass
class SipCredentials:
    """SIP credentials returned by FusionPBX API"""
    sip_username: str
    sip_password: str
    sip_server: str
    sip_domain: str
    ws_url: str
    did_number: str


@dataclass
class AgentProvisioningResult:
    """Result of agent provisioning operation"""
    success: bool
    agent_uuid: Optional[str] = None
    agent_name: Optional[str] = None
    extension_uuid: Optional[str] = None
    did_uuid: Optional[str] = None
    sip_credentials: Optional[SipCredentials] = None
    user_uuid: Optional[str] = None  # FusionPBX user UUID (for billing)
    user_api_key: Optional[str] = None  # FusionPBX user API key
    error: Optional[str] = None


class FusionPBXApiClient:
    """
    Client for FusionPBX AI Agent Provisioning API

    This client communicates with the existing Laravel-based API on
    billing.call.epic.dm to provision SIP accounts and DIDs for AI agents.

    The API handles:
    - Creating FusionPBX extensions (SIP accounts)
    - Assigning DIDs to extensions
    - Configuring inbound/outbound routing
    - Managing agent lifecycle

    Usage:
        client = FusionPBXApiClient()
        result = client.provision_agent(
            user_email="user@ai.epic.dm",
            agent_name="Sales Agent",
            agent_type="voice",
            livekit_room_name="room-123"
        )
        if result.success:
            print(f"SIP Username: {result.sip_credentials.sip_username}")
    """

    def __init__(self, base_url: str = "https://billing.call.epic.dm"):
        """
        Initialize FusionPBX API client

        Args:
            base_url: Base URL for FusionPBX API (default: https://billing.call.epic.dm)
        """
        self.base_url = base_url.rstrip('/')
        self.api_base = f"{self.base_url}/api/ai-agents"

        # Create session for connection pooling
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'LiveKit-Backend/1.0'
        })

        # Set timeout for all requests (30 seconds)
        self.timeout = 30

        logger.info(f"FusionPBX API Client initialized: {self.api_base}")

    def provision_agent(
        self,
        user_email: str,
        agent_name: str,
        agent_type: str = "voice",
        livekit_room_name: Optional[str] = None,
        description: Optional[str] = None
    ) -> AgentProvisioningResult:
        """
        Provision a new AI agent with SIP account and DID using RocketChat sync endpoint

        This creates:
        1. FusionPBX user account (if doesn't exist)
        2. SIP extension in v_extensions
        3. DID assignment
        4. Inbound routing (dialplan)
        5. Outbound routing with caller ID

        Args:
            user_email: Email of the user creating the agent
            agent_name: Name for the agent (e.g., "Customer Support Agent")
            agent_type: Type of agent ("voice", "video", "text") - not used by RocketChat endpoint
            livekit_room_name: LiveKit room name for routing (used as rocketchat_user_id)
            description: Optional description - not used by RocketChat endpoint

        Returns:
            AgentProvisioningResult with success status and SIP credentials

        Example:
            result = client.provision_agent(
                user_email="test@ai.epic.dm",
                agent_name="Sales Bot",
                livekit_room_name="sales-room-001"
            )
            if result.success:
                print(f"Extension: {result.sip_credentials.sip_username}")
                print(f"DID: {result.sip_credentials.did_number}")
        """
        try:
            # Use the WORKING RocketChat sync endpoint instead of broken ai-agents endpoint
            # This endpoint creates FusionPBX users and returns all SIP credentials

            username = user_email.split('@')[0]
            rocketchat_user_id = livekit_room_name or f"agent-{username}"

            # Prepare request payload for RocketChat sync endpoint
            payload = {
                "rocketchat_user_id": rocketchat_user_id,
                "email": user_email,
                "name": agent_name,
                "username": username
            }

            logger.info(f"Provisioning agent via RocketChat sync: {agent_name} for user {user_email}")

            # Get API key from environment
            import os
            api_key = os.getenv('FUSIONPBX_API_KEY', 'da6247d75a79ef3c6490b54bbe422944cc4f80859b00ce8c51c7e2602d8bfc37')

            # Make API request to WORKING endpoint with API key
            response = self.session.post(
                f"{self.base_url}/api/rocketchat/users/sync",  # Use working endpoint!
                json=payload,
                headers={
                    'X-API-Key': api_key,
                    'Content-Type': 'application/json'
                },
                timeout=self.timeout,
                verify=False  # Skip SSL verification for self-signed cert
            )

            # Check for HTTP errors
            response.raise_for_status()

            # Parse response
            data = response.json()

            if not data.get('success'):
                error_msg = data.get('error', 'Unknown error from FusionPBX API')
                logger.error(f"Provisioning failed: {error_msg}")
                return AgentProvisioningResult(
                    success=False,
                    error=error_msg
                )

            # RocketChat sync endpoint returns flat structure, not nested
            # Response format:
            # {
            #   "success": true,
            #   "extension": "2009",
            #   "sip_password": "...",
            #   "sip_domain": "billing.call.epic.dm",
            #   "ws_url": "wss://call.epic.dm:7443",
            #   "did_number": "17678189031",
            #   "caller_id_name": "...",
            #   "caller_id_number": "...",
            #   "stun_servers": [...]
            # }

            # Create SipCredentials object from flat response
            credentials = SipCredentials(
                sip_username=data.get('extension'),  # Extension IS the username
                sip_password=data.get('sip_password'),
                sip_server=data.get('sip_domain'),  # Use domain as server
                sip_domain=data.get('sip_domain'),
                ws_url=data.get('ws_url'),
                did_number=data.get('did_number')
            )

            logger.info(
                f"✅ Agent provisioned successfully via RocketChat sync: "
                f"Extension={credentials.sip_username}, "
                f"DID={credentials.did_number}, "
                f"CallerID={data.get('caller_id_name')}"
            )

            return AgentProvisioningResult(
                success=True,
                agent_uuid=rocketchat_user_id,  # Use rocketchat_user_id as agent UUID
                agent_name=agent_name,
                extension_uuid=None,  # Not returned by this endpoint
                did_uuid=None,  # Not returned by this endpoint
                sip_credentials=credentials,
                user_api_key=data.get('accountcode'),  # ✅ Use accountcode for billing consolidation
                user_uuid=data.get('user_uuid')        # ✅ Use user_uuid from FusionPBX
            )

        except requests.exceptions.RequestException as e:
            error_msg = f"HTTP request failed: {str(e)}"
            logger.error(error_msg)
            return AgentProvisioningResult(
                success=False,
                error=error_msg
            )
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return AgentProvisioningResult(
                success=False,
                error=error_msg
            )

    def get_agent_details(self, agent_uuid: str) -> Dict:
        """
        Get details for a specific agent

        Args:
            agent_uuid: UUID of the agent

        Returns:
            Dictionary with agent details or error
        """
        try:
            response = self.session.get(
                f"{self.api_base}/{agent_uuid}",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get agent details: {e}")
            return {"success": False, "error": str(e)}

    def get_agent_credentials(self, agent_uuid: str) -> Optional[SipCredentials]:
        """
        Get SIP credentials for an agent

        Args:
            agent_uuid: UUID of the agent

        Returns:
            SipCredentials object or None if failed
        """
        try:
            response = self.session.get(
                f"{self.api_base}/{agent_uuid}/credentials",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            if data.get('success'):
                creds = data.get('sip_credentials', {})
                return SipCredentials(
                    sip_username=creds.get('sip_username'),
                    sip_password=creds.get('sip_password'),
                    sip_server=creds.get('sip_server'),
                    sip_domain=creds.get('sip_domain'),
                    ws_url=creds.get('ws_url'),
                    did_number=creds.get('did_number')
                )
            return None
        except Exception as e:
            logger.error(f"Failed to get agent credentials: {e}")
            return None

    def list_user_agents(self, user_email: str) -> List[Dict]:
        """
        List all agents for a user

        Args:
            user_email: Email of the user

        Returns:
            List of agent dictionaries
        """
        try:
            response = self.session.get(
                f"{self.api_base}/user/{user_email}",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            if data.get('success'):
                return data.get('agents', [])
            return []
        except Exception as e:
            logger.error(f"Failed to list user agents: {e}")
            return []

    def update_agent(
        self,
        agent_uuid: str,
        agent_name: Optional[str] = None,
        livekit_room_name: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict:
        """
        Update agent details

        Args:
            agent_uuid: UUID of the agent
            agent_name: New name (optional)
            livekit_room_name: New room name (optional)
            is_active: Active status (optional)

        Returns:
            Dictionary with success status
        """
        try:
            payload = {}
            if agent_name is not None:
                payload["agent_name"] = agent_name
            if livekit_room_name is not None:
                payload["livekit_room_name"] = livekit_room_name
            if is_active is not None:
                payload["is_active"] = is_active

            response = self.session.put(
                f"{self.api_base}/{agent_uuid}",
                json=payload,
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to update agent: {e}")
            return {"success": False, "error": str(e)}

    def delete_agent(self, agent_uuid: str) -> Dict:
        """
        Delete an agent and deprovision resources

        This removes:
        1. Agent from v_ai_agents
        2. SIP extension from v_extensions
        3. DID assignment from v_did_assignments
        4. Dialplan entries

        Args:
            agent_uuid: UUID of the agent to delete

        Returns:
            Dictionary with success status

        Example:
            result = client.delete_agent("e6be751c-1f2e-4669-ab52-ccd23ed7e997")
            if result.get('success'):
                print("Agent deprovisioned successfully")
        """
        try:
            logger.info(f"Deprovisioning agent: {agent_uuid}")

            response = self.session.delete(
                f"{self.api_base}/{agent_uuid}",
                timeout=self.timeout
            )
            response.raise_for_status()
            data = response.json()

            if data.get('success'):
                logger.info(f"✅ Agent deprovisioned successfully: {agent_uuid}")
            else:
                logger.error(f"Deprovisioning failed: {data.get('message')}")

            return data
        except Exception as e:
            error_msg = f"Failed to delete agent: {str(e)}"
            logger.error(error_msg)
            return {"success": False, "error": error_msg}

    def get_agent_stats(self, agent_uuid: str) -> Dict:
        """
        Get statistics for an agent

        Args:
            agent_uuid: UUID of the agent

        Returns:
            Dictionary with call statistics
        """
        try:
            response = self.session.get(
                f"{self.api_base}/{agent_uuid}/stats",
                timeout=self.timeout
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to get agent stats: {e}")
            return {"success": False, "error": str(e)}

    def provision_standalone_did(
        self,
        user_email: str,
        country: str = "Dominica",
        prefix: str = "1767818"
    ) -> Dict:
        """
        Provision a standalone DID for phone number inventory

        This creates a complete SIP account + DID in FusionPBX but NOT tied
        to a specific agent yet. The number goes into the user's inventory
        and can be assigned to any agent later.

        Creates:
        1. User account in FusionPBX (if doesn't exist)
        2. Extension (3001-3999 range)
        3. DID/phone number assignment
        4. SIP credentials
        5. Inbound routing (to placeholder/parking)
        6. Outbound routing with caller ID

        Args:
            user_email: Email of the user (for consolidated billing)
            country: Country for phone number
            prefix: Prefix for phone number selection

        Returns:
            Dictionary with success status and provisioning details
            {
                'success': True,
                'did_number': '+17678189025',
                'sip_username': '3018',
                'sip_password': 'xxx',
                'sip_domain': 'billing.call.epic.dm',
                'sip_server': 'billing.call.epic.dm',
                'ws_url': 'wss://billing.call.epic.dm',
                'extension_uuid': 'xxx',
                'did_uuid': 'xxx',
                'fusionpbx_agent_uuid': 'xxx',
                'user_api_key': 'ak_xxx...'
            }

        Example:
            result = client.provision_standalone_did(
                user_email="user@ai.epic.dm",
                country="Dominica",
                prefix="1767818"
            )
            if result['success']:
                print(f"Provisioned DID: {result['did_number']}")
        """
        try:
            logger.info(f"Provisioning standalone DID for {user_email}")

            # Call FusionPBX API to provision
            # Use agent_name "PHONE_INVENTORY" to indicate this is for inventory
            # agent_type must be "voice" for FusionPBX to accept it
            response = self.session.post(
                f"{self.api_base}/provision",
                json={
                    "user_email": user_email,
                    "agent_name": "PHONE_INVENTORY",
                    "agent_type": "voice",  # Must be "voice" for FusionPBX
                    "description": f"Phone number in inventory for {user_email}"
                },
                timeout=self.timeout
            )

            response.raise_for_status()
            data = response.json()

            if not data.get('success'):
                error_msg = data.get('error', 'FusionPBX provisioning failed')
                logger.error(f"Standalone DID provisioning failed: {error_msg}")
                return {
                    'success': False,
                    'error': error_msg
                }

            # Extract agent and SIP details
            agent = data.get('agent', {})
            sip_creds = data.get('sip_credentials', {})

            # Extract user information for billing
            user_api_key = agent.get('api_key')

            logger.info(
                f"✅ Standalone DID provisioned: "
                f"DID={sip_creds.get('did_number')}, "
                f"Extension={sip_creds.get('sip_username')}, "
                f"UserAPIKey={user_api_key[:16] if user_api_key else 'N/A'}..."
            )

            return {
                'success': True,
                'did_number': sip_creds.get('did_number'),
                'sip_username': sip_creds.get('sip_username'),
                'sip_password': sip_creds.get('sip_password'),
                'sip_domain': sip_creds.get('sip_domain'),
                'sip_server': sip_creds.get('sip_server'),
                'ws_url': sip_creds.get('ws_url'),
                'extension_uuid': agent.get('extension_uuid'),
                'did_uuid': agent.get('did_uuid'),
                'fusionpbx_agent_uuid': agent.get('agent_uuid'),
                'user_api_key': user_api_key,
                'user_uuid': agent.get('user_uuid')
            }

        except requests.exceptions.RequestException as e:
            error_msg = f"HTTP request failed: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Unexpected error: {str(e)}"
            logger.error(error_msg)
            return {
                'success': False,
                'error': error_msg
            }

    def health_check(self) -> bool:
        """
        Check if FusionPBX API is accessible

        Returns:
            True if API is accessible, False otherwise
        """
        try:
            # Try to hit a simple endpoint
            response = self.session.get(
                f"{self.base_url}/api/health",
                timeout=5
            )
            return response.status_code == 200
        except:
            return False


# Convenience functions for backward compatibility

def provision_agent(
    user_email: str,
    agent_name: str,
    agent_type: str = "voice",
    livekit_room_name: Optional[str] = None
) -> AgentProvisioningResult:
    """
    Provision a new AI agent (convenience function)

    Args:
        user_email: Email of the user
        agent_name: Name for the agent
        agent_type: Type of agent
        livekit_room_name: LiveKit room name

    Returns:
        AgentProvisioningResult
    """
    client = FusionPBXApiClient()
    return client.provision_agent(
        user_email=user_email,
        agent_name=agent_name,
        agent_type=agent_type,
        livekit_room_name=livekit_room_name
    )


def deprovision_agent(agent_uuid: str) -> Dict:
    """
    Deprovision an agent (convenience function)

    Args:
        agent_uuid: UUID of the agent

    Returns:
        Dictionary with success status
    """
    client = FusionPBXApiClient()
    return client.delete_agent(agent_uuid)


def get_sip_credentials(agent_uuid: str) -> Optional[SipCredentials]:
    """
    Get SIP credentials for an agent (convenience function)

    Args:
        agent_uuid: UUID of the agent

    Returns:
        SipCredentials or None
    """
    client = FusionPBXApiClient()
    return client.get_agent_credentials(agent_uuid)


# Test function
if __name__ == "__main__":
    # Configure logging for testing
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Initialize client
    client = FusionPBXApiClient()

    print("🧪 Testing FusionPBX API Client\n")

    # Test 1: Health check
    print("1. Health Check")
    healthy = client.health_check()
    print(f"   API Status: {'✅ Healthy' if healthy else '❌ Unreachable'}\n")

    # Test 2: Provision agent
    print("2. Provisioning Test Agent")
    result = client.provision_agent(
        user_email="test@ai.epic.dm",
        agent_name="Test Voice Agent API Client",
        agent_type="voice",
        livekit_room_name="test-room-api-client"
    )

    if result.success:
        print(f"   ✅ Success!")
        print(f"   Agent UUID: {result.agent_uuid}")
        print(f"   Agent Name: {result.agent_name}")
        print(f"   SIP Username: {result.sip_credentials.sip_username}")
        print(f"   SIP Password: {result.sip_credentials.sip_password}")
        print(f"   SIP Server: {result.sip_credentials.sip_server}")
        print(f"   SIP Domain: {result.sip_credentials.sip_domain}")
        print(f"   WebSocket URL: {result.sip_credentials.ws_url}")
        print(f"   DID Number: {result.sip_credentials.did_number}")

        # Test 3: Get credentials
        print("\n3. Retrieving Credentials")
        creds = client.get_agent_credentials(result.agent_uuid)
        if creds:
            print(f"   ✅ Retrieved: {creds.sip_username}")

        # Test 4: Get agent details
        print("\n4. Getting Agent Details")
        details = client.get_agent_details(result.agent_uuid)
        if details.get('success'):
            print(f"   ✅ Agent active: {details.get('agent', {}).get('is_active')}")

        # Test 5: Delete agent
        print("\n5. Deprovisioning Agent")
        delete_result = client.delete_agent(result.agent_uuid)
        if delete_result.get('success'):
            print(f"   ✅ Agent deprovisioned")
    else:
        print(f"   ❌ Failed: {result.error}")

    print("\n✅ Testing complete!")
