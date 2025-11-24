#!/usr/bin/env python3
"""
FusionPBX Multi-Tenant Provisioning Service
Uses FusionPBX REST API to create SIP accounts, extensions, and DID routing
"""

import logging
import requests
import secrets
import string
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class FusionPBXProvisioner:
    """
    Multi-tenant FusionPBX provisioner with proper user/agent isolation

    Architecture:
    - Each epic.dm user gets a FusionPBX domain
    - Each AI agent gets a SIP extension with credentials
    - DIDs route to agent's SIP extension
    - Outbound calls use agent's DID as caller ID
    """

    def __init__(
        self,
        base_url: str = "https://billing.call.epic.dm",
        api_token: str = "LVWnT7ebrMbHqJ6X0CTnM9qfVPmc1H6H",
        domain_uuid: Optional[str] = None
    ):
        """
        Initialize FusionPBX provisioner

        Args:
            base_url: FusionPBX base URL
            api_token: API authentication token
            domain_uuid: Default domain UUID (will fetch if not provided)
        """
        self.base_url = base_url.rstrip('/')
        self.api_token = api_token
        self.domain_uuid = domain_uuid
        self.session = requests.Session()

        # Set authentication headers
        self.session.headers.update({
            'Authorization': f'Bearer {api_token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })

        # Get default domain if not provided
        if not self.domain_uuid:
            self._fetch_default_domain()

    def _fetch_default_domain(self):
        """Fetch default domain UUID from FusionPBX"""
        try:
            response = self.session.get(f"{self.base_url}/api/domains")
            response.raise_for_status()
            domains = response.json()

            if domains and len(domains) > 0:
                self.domain_uuid = domains[0].get('domain_uuid')
                logger.info(f"Using default domain: {self.domain_uuid}")
            else:
                logger.warning("No domains found in FusionPBX")

        except Exception as e:
            logger.error(f"Failed to fetch default domain: {e}")

    def _generate_password(self, length: int = 16) -> str:
        """Generate secure random password"""
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def create_extension(
        self,
        agent_config_id: str,
        agent_name: str,
        user_id: str,
        extension_number: Optional[str] = None
    ) -> Dict:
        """
        Create SIP extension for AI agent

        Args:
            agent_config_id: Agent configuration ID
            agent_name: Agent name
            user_id: Owner user ID
            extension_number: Optional specific extension (auto-assigned if None)

        Returns:
            Dict with extension details including SIP credentials
        """
        logger.info(f"Creating extension for agent '{agent_name}' (ID: {agent_config_id})")

        # Generate extension number if not provided
        if extension_number is None:
            extension_number = str(10000 + hash(agent_config_id) % 90000)

        # Generate SIP credentials
        sip_password = self._generate_password()

        # Prepare extension data
        extension_data = {
            "domain_uuid": self.domain_uuid,
            "extension": extension_number,
            "number_alias": agent_config_id[:8],
            "password": sip_password,
            "accountcode": agent_config_id,
            "effective_caller_id_name": agent_name,
            "effective_caller_id_number": extension_number,
            "directory_first_name": agent_name,
            "directory_last_name": f"(Agent {agent_config_id[:8]})",
            "directory_visible": "false",
            "directory_exten_visible": "false",
            "limit_max": "5",
            "limit_destination": "error",
            "enabled": "true",
            "description": f"AI Agent: {agent_name} | User: {user_id} | Agent ID: {agent_config_id}"
        }

        try:
            # Create extension via API
            response = self.session.post(
                f"{self.base_url}/api/extensions",
                json=extension_data
            )

            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                extension_uuid = result.get('extension_uuid', result.get('uuid'))

                logger.info(f"✅ Created extension {extension_number} (UUID: {extension_uuid})")

                return {
                    'success': True,
                    'agent_config_id': agent_config_id,
                    'extension_uuid': extension_uuid,
                    'extension': extension_number,
                    'sip_username': extension_number,
                    'sip_password': sip_password,
                    'sip_domain': 'billing.call.epic.dm',
                    'sip_port': 5060,
                    'message': f'Extension {extension_number} created for agent {agent_name}'
                }
            else:
                error_msg = response.text
                logger.error(f"❌ Failed to create extension: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': f'API returned {response.status_code}: {error_msg}'
                }

        except Exception as e:
            logger.error(f"❌ Exception creating extension: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def assign_did_to_extension(
        self,
        phone_number: str,
        extension: str,
        agent_config_id: str,
        agent_name: str
    ) -> Dict:
        """
        Assign DID to extension (create inbound route)

        Args:
            phone_number: Phone number (e.g., '+17678189426')
            extension: Extension number to route to
            agent_config_id: Agent configuration ID
            agent_name: Agent name for description

        Returns:
            Dict with assignment status
        """
        logger.info(f"Assigning DID {phone_number} to extension {extension}")

        # Clean phone number
        clean_number = phone_number.replace('+', '').replace('-', '').replace(' ', '')

        # Prepare destination data (inbound route)
        destination_data = {
            "domain_uuid": self.domain_uuid,
            "dialplan_uuid": None,  # Auto-generate
            "dialplan_name": f"DID_{clean_number}",
            "dialplan_number": clean_number,
            "dialplan_context": "public",
            "dialplan_continue": "false",
            "dialplan_order": "100",
            "dialplan_enabled": "true",
            "dialplan_description": f"Route DID {phone_number} to Agent: {agent_name} (Extension {extension})",
            "dialplan_details": [
                {
                    "dialplan_detail_tag": "condition",
                    "dialplan_detail_type": "destination_number",
                    "dialplan_detail_data": f"^({clean_number}|\\+?1?{clean_number})$",
                    "dialplan_detail_order": "010"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "set",
                    "dialplan_detail_data": "call_direction=inbound",
                    "dialplan_detail_order": "020"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "set",
                    "dialplan_detail_data": f"accountcode={agent_config_id}",
                    "dialplan_detail_order": "030"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "transfer",
                    "dialplan_detail_data": f"{extension} XML default",
                    "dialplan_detail_order": "040"
                }
            ]
        }

        try:
            response = self.session.post(
                f"{self.base_url}/api/dialplans",
                json=destination_data
            )

            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                dialplan_uuid = result.get('dialplan_uuid', result.get('uuid'))

                logger.info(f"✅ Created inbound route for DID {phone_number} → extension {extension}")

                # Reload dialplan
                self._reload_dialplan()

                return {
                    'success': True,
                    'phone_number': phone_number,
                    'extension': extension,
                    'dialplan_uuid': dialplan_uuid,
                    'message': f'DID {phone_number} assigned to extension {extension}'
                }
            else:
                error_msg = response.text
                logger.error(f"❌ Failed to create inbound route: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': f'API returned {response.status_code}: {error_msg}'
                }

        except Exception as e:
            logger.error(f"❌ Exception creating inbound route: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def configure_outbound_caller_id(
        self,
        extension: str,
        caller_id_number: str,
        caller_id_name: str,
        agent_config_id: str
    ) -> Dict:
        """
        Configure outbound caller ID for extension

        Args:
            extension: Extension number
            caller_id_number: Caller ID number (DID)
            caller_id_name: Caller ID name
            agent_config_id: Agent configuration ID

        Returns:
            Dict with configuration status
        """
        logger.info(f"Configuring outbound caller ID for extension {extension}: {caller_id_number}")

        clean_number = caller_id_number.replace('+', '').replace('-', '').replace(' ', '')

        # Create outbound route with caller ID
        outbound_data = {
            "domain_uuid": self.domain_uuid,
            "dialplan_name": f"Outbound_{extension}",
            "dialplan_number": "^(\\+?1?\\d{10,15})$",
            "dialplan_context": "default",
            "dialplan_continue": "false",
            "dialplan_order": "200",
            "dialplan_enabled": "true",
            "dialplan_description": f"Outbound route for extension {extension} with caller ID {caller_id_number}",
            "dialplan_details": [
                {
                    "dialplan_detail_tag": "condition",
                    "dialplan_detail_type": "caller_id_number",
                    "dialplan_detail_data": f"^{extension}$",
                    "dialplan_detail_order": "010"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "set",
                    "dialplan_detail_data": f"effective_caller_id_name={caller_id_name}",
                    "dialplan_detail_order": "020"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "set",
                    "dialplan_detail_data": f"effective_caller_id_number={clean_number}",
                    "dialplan_detail_order": "030"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "set",
                    "dialplan_detail_data": f"accountcode={agent_config_id}",
                    "dialplan_detail_order": "040"
                },
                {
                    "dialplan_detail_tag": "action",
                    "dialplan_detail_type": "bridge",
                    "dialplan_detail_data": "sofia/external/$1@outbound_trunk",
                    "dialplan_detail_order": "050"
                }
            ]
        }

        try:
            response = self.session.post(
                f"{self.base_url}/api/dialplans",
                json=outbound_data
            )

            if response.status_code == 201 or response.status_code == 200:
                result = response.json()
                dialplan_uuid = result.get('dialplan_uuid', result.get('uuid'))

                logger.info(f"✅ Created outbound route for extension {extension}")

                # Reload dialplan
                self._reload_dialplan()

                return {
                    'success': True,
                    'extension': extension,
                    'caller_id_number': caller_id_number,
                    'dialplan_uuid': dialplan_uuid,
                    'message': f'Outbound caller ID configured for extension {extension}'
                }
            else:
                error_msg = response.text
                logger.error(f"❌ Failed to create outbound route: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': f'API returned {response.status_code}: {error_msg}'
                }

        except Exception as e:
            logger.error(f"❌ Exception creating outbound route: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_extension(
        self,
        extension_uuid: str
    ) -> Dict:
        """
        Delete extension

        Args:
            extension_uuid: Extension UUID to delete

        Returns:
            Dict with deletion status
        """
        logger.info(f"Deleting extension {extension_uuid}")

        try:
            response = self.session.delete(
                f"{self.base_url}/api/extensions/{extension_uuid}"
            )

            if response.status_code == 200 or response.status_code == 204:
                logger.info(f"✅ Deleted extension {extension_uuid}")
                return {
                    'success': True,
                    'extension_uuid': extension_uuid,
                    'message': f'Extension {extension_uuid} deleted'
                }
            else:
                error_msg = response.text
                logger.error(f"❌ Failed to delete extension: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': f'API returned {response.status_code}: {error_msg}'
                }

        except Exception as e:
            logger.error(f"❌ Exception deleting extension: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def delete_dialplan(
        self,
        dialplan_uuid: str
    ) -> Dict:
        """
        Delete dialplan (inbound/outbound route)

        Args:
            dialplan_uuid: Dialplan UUID to delete

        Returns:
            Dict with deletion status
        """
        logger.info(f"Deleting dialplan {dialplan_uuid}")

        try:
            response = self.session.delete(
                f"{self.base_url}/api/dialplans/{dialplan_uuid}"
            )

            if response.status_code == 200 or response.status_code == 204:
                logger.info(f"✅ Deleted dialplan {dialplan_uuid}")

                # Reload dialplan
                self._reload_dialplan()

                return {
                    'success': True,
                    'dialplan_uuid': dialplan_uuid,
                    'message': f'Dialplan {dialplan_uuid} deleted'
                }
            else:
                error_msg = response.text
                logger.error(f"❌ Failed to delete dialplan: {response.status_code} - {error_msg}")
                return {
                    'success': False,
                    'error': f'API returned {response.status_code}: {error_msg}'
                }

        except Exception as e:
            logger.error(f"❌ Exception deleting dialplan: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def _reload_dialplan(self):
        """Reload FreeSWITCH dialplan"""
        try:
            response = self.session.post(
                f"{self.base_url}/api/system/reload_xml"
            )
            if response.status_code == 200:
                logger.info("✅ Dialplan reloaded")
            else:
                logger.warning(f"⚠️  Dialplan reload may have failed: {response.status_code}")
        except Exception as e:
            logger.warning(f"⚠️  Exception reloading dialplan: {e}")


# ==================== HIGH-LEVEL INTEGRATION FUNCTIONS ====================

def provision_complete_agent(
    agent_config_id: str,
    agent_name: str,
    user_id: str,
    phone_number: Optional[str] = None
) -> Dict:
    """
    Complete agent provisioning via FusionPBX API

    Args:
        agent_config_id: Agent configuration ID
        agent_name: Agent name
        user_id: Owner user ID
        phone_number: Phone number to assign (optional)

    Returns:
        Dict with complete provisioning details including SIP credentials
    """
    provisioner = FusionPBXProvisioner()

    logger.info(f"Provisioning complete agent via FusionPBX: {agent_name} (ID: {agent_config_id})")

    results = {}

    # Step 1: Create extension (SIP account)
    ext_result = provisioner.create_extension(
        agent_config_id=agent_config_id,
        agent_name=agent_name,
        user_id=user_id
    )
    results['extension'] = ext_result

    if not ext_result['success']:
        return {
            'success': False,
            'error': 'Failed to create extension',
            'details': results
        }

    extension = ext_result['extension']
    extension_uuid = ext_result['extension_uuid']

    # Step 2: Assign DID (if provided)
    if phone_number:
        did_result = provisioner.assign_did_to_extension(
            phone_number=phone_number,
            extension=extension,
            agent_config_id=agent_config_id,
            agent_name=agent_name
        )
        results['did_assignment'] = did_result

        # Step 3: Configure outbound caller ID
        if did_result['success']:
            caller_id_result = provisioner.configure_outbound_caller_id(
                extension=extension,
                caller_id_number=phone_number,
                caller_id_name=agent_name,
                agent_config_id=agent_config_id
            )
            results['caller_id'] = caller_id_result

    logger.info(f"✅ Complete agent provisioning finished for {agent_name}")

    return {
        'success': True,
        'agent_config_id': agent_config_id,
        'extension_uuid': extension_uuid,
        'sip_credentials': {
            'username': ext_result['sip_username'],
            'password': ext_result['sip_password'],
            'extension': ext_result['extension'],
            'domain': ext_result['sip_domain'],
            'port': ext_result['sip_port']
        },
        'phone_number': phone_number,
        'results': results,
        'message': f'Agent {agent_name} fully provisioned via FusionPBX'
    }


def deprovision_complete_agent(
    extension_uuid: str,
    inbound_dialplan_uuid: Optional[str] = None,
    outbound_dialplan_uuid: Optional[str] = None
) -> Dict:
    """
    Complete agent deprovisioning via FusionPBX API

    Args:
        extension_uuid: Extension UUID to delete
        inbound_dialplan_uuid: Inbound route UUID (optional)
        outbound_dialplan_uuid: Outbound route UUID (optional)

    Returns:
        Dict with deprovisioning status
    """
    provisioner = FusionPBXProvisioner()

    logger.info(f"Deprovisioning agent extension {extension_uuid}")

    results = {}

    # Delete inbound route
    if inbound_dialplan_uuid:
        inbound_result = provisioner.delete_dialplan(inbound_dialplan_uuid)
        results['inbound_deletion'] = inbound_result

    # Delete outbound route
    if outbound_dialplan_uuid:
        outbound_result = provisioner.delete_dialplan(outbound_dialplan_uuid)
        results['outbound_deletion'] = outbound_result

    # Delete extension
    ext_result = provisioner.delete_extension(extension_uuid)
    results['extension_deletion'] = ext_result

    logger.info(f"✅ Complete agent deprovisioning finished")

    return {
        'success': True,
        'extension_uuid': extension_uuid,
        'results': results,
        'message': f'Agent extension {extension_uuid} fully deprovisioned'
    }


# ==================== EXAMPLE USAGE ====================

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    print("\n=== Testing FusionPBX Agent Provisioning ===\n")

    # Test: Provision complete agent with phone number
    result = provision_complete_agent(
        agent_config_id="test-fusion-001",
        agent_name="Test FusionPBX Agent",
        user_id="user-123",
        phone_number="+17678189145"
    )

    print(f"\nProvisioning Result:")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"\nSIP Credentials:")
        print(f"  Username: {result['sip_credentials']['username']}")
        print(f"  Password: {result['sip_credentials']['password']}")
        print(f"  Extension: {result['sip_credentials']['extension']}")
        print(f"  Domain: {result['sip_credentials']['domain']}")
        print(f"  Port: {result['sip_credentials']['port']}")
        print(f"\nPhone Number: {result['phone_number']}")
        print(f"Extension UUID: {result['extension_uuid']}")
    else:
        print(f"Error: {result.get('error')}")
        print(f"Details: {result.get('details')}")
