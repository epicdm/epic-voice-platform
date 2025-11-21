#!/usr/bin/env python3
"""
FreeSWITCH Multi-Tenant Provisioning Service
Implements proper user/agent isolation with SIP accounts and DID routing
Similar to Magnus Billing architecture
"""

import logging
import paramiko
import uuid
import secrets
import string
from typing import Optional, Dict, List

logger = logging.getLogger(__name__)


class FreeSWITCHMultiTenantProvisioner:
    """
    Multi-tenant FreeSWITCH provisioner with proper user/agent isolation

    Architecture:
    - Each epic.dm user gets a FreeSWITCH account (domain/context)
    - Each AI agent gets a SIP account with credentials
    - DIDs route to agent's SIP extension
    - Outbound calls use agent's DID as caller ID
    """

    def __init__(
        self,
        ssh_host: str = "24.199.103.153",
        ssh_user: str = "root",
        ssh_password: Optional[str] = None,
        ssh_key_path: Optional[str] = None,
        base_extension: int = 10000  # Starting extension number
    ):
        """
        Initialize multi-tenant provisioner

        Args:
            ssh_host: FreeSWITCH server IP
            ssh_user: SSH username
            ssh_password: SSH password
            ssh_key_path: SSH key path (alternative to password)
            base_extension: Starting extension number for agents
        """
        self.ssh_host = ssh_host
        self.ssh_user = ssh_user
        self.ssh_password = ssh_password
        self.ssh_key_path = ssh_key_path
        self.base_extension = base_extension

    def _ssh_execute(self, command: str) -> tuple[int, str, str]:
        """
        Execute command via SSH

        Returns:
            Tuple of (exit_code, stdout, stderr)
        """
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            if self.ssh_password:
                ssh.connect(
                    self.ssh_host,
                    username=self.ssh_user,
                    password=self.ssh_password,
                    timeout=10
                )
            elif self.ssh_key_path:
                ssh.connect(
                    self.ssh_host,
                    username=self.ssh_user,
                    key_filename=self.ssh_key_path,
                    timeout=10
                )
            else:
                raise ValueError("Must provide either ssh_password or ssh_key_path")

            stdin, stdout, stderr = ssh.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()

            stdout_text = stdout.read().decode('utf-8')
            stderr_text = stderr.read().decode('utf-8')

            ssh.close()

            return exit_code, stdout_text, stderr_text

        except Exception as e:
            logger.error(f"SSH command failed: {e}")
            raise

    def _generate_sip_password(self, length: int = 16) -> str:
        """Generate secure random SIP password"""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))

    def create_user_account(
        self,
        user_id: str,
        user_email: str
    ) -> Dict:
        """
        Create FreeSWITCH user account (context/domain)

        Args:
            user_id: Epic.dm user ID
            user_email: User email

        Returns:
            Dict with account creation status
        """
        logger.info(f"Creating FreeSWITCH account for user {user_email} (ID: {user_id})")

        # For FreeSWITCH, we use the default domain but track user context
        # This is simpler than creating separate domains per user

        return {
            'success': True,
            'user_id': user_id,
            'user_email': user_email,
            'message': f'User account ready for {user_email}'
        }

    def create_agent_sip_account(
        self,
        agent_config_id: str,
        agent_name: str,
        user_id: str,
        extension_number: Optional[int] = None
    ) -> Dict:
        """
        Create SIP account for AI agent

        Args:
            agent_config_id: Agent configuration ID
            agent_name: Agent name
            user_id: Owner user ID
            extension_number: Optional specific extension (auto-assigned if None)

        Returns:
            Dict with SIP account details
        """
        logger.info(f"Creating SIP account for agent '{agent_name}' (ID: {agent_config_id})")

        # Generate extension number if not provided
        if extension_number is None:
            extension_number = self.base_extension + hash(agent_config_id) % 90000

        # Generate SIP credentials
        sip_username = f"agent_{agent_config_id[:8]}"  # Use first 8 chars of UUID
        sip_password = self._generate_sip_password()
        sip_extension = str(extension_number)

        # Create SIP user XML file
        xml_filename = f"agent_{agent_config_id}.xml"
        xml_filepath = f"/etc/freeswitch/directory/users/{xml_filename}"

        xml_content = f"""<include>
  <user id="{sip_username}">
    <params>
      <param name="password" value="{sip_password}"/>
      <param name="vm-password" value="{sip_password}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international"/>
      <variable name="accountcode" value="{agent_config_id}"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="{agent_name}"/>
      <variable name="effective_caller_id_number" value="{sip_extension}"/>
      <variable name="agent_config_id" value="{agent_config_id}"/>
      <variable name="user_id" value="{user_id}"/>
    </variables>
  </user>
</include>"""

        # Create SIP user file via SSH
        create_command = f"cat > {xml_filepath} << 'EOF'\n{xml_content}\nEOF"

        try:
            exit_code, stdout, stderr = self._ssh_execute(create_command)

            if exit_code != 0:
                raise Exception(f"Failed to create SIP user file: {stderr}")

            logger.info(f"✅ Created SIP user file: {xml_filepath}")

            # Reload FreeSWITCH directory
            reload_exit, reload_out, reload_err = self._ssh_execute('fs_cli -x "reloadxml"')

            if reload_exit == 0 and '+OK' in reload_out:
                logger.info(f"✅ FreeSWITCH configuration reloaded")
            else:
                logger.warning(f"⚠️  Reload may have failed: {reload_err}")

            return {
                'success': True,
                'agent_config_id': agent_config_id,
                'sip_username': sip_username,
                'sip_password': sip_password,
                'sip_extension': sip_extension,
                'sip_domain': self.ssh_host,
                'sip_port': 5060,
                'filepath': xml_filepath,
                'message': f'SIP account created for agent {agent_name}'
            }

        except Exception as e:
            logger.error(f"❌ Failed to create SIP account: {e}")
            return {
                'success': False,
                'agent_config_id': agent_config_id,
                'error': str(e)
            }

    def assign_did_to_agent(
        self,
        phone_number: str,
        agent_config_id: str,
        sip_extension: str,
        agent_name: str
    ) -> Dict:
        """
        Assign DID to agent's SIP extension

        Args:
            phone_number: Phone number (e.g., '+17678189426')
            agent_config_id: Agent configuration ID
            sip_extension: Agent's SIP extension number
            agent_name: Agent name for logging

        Returns:
            Dict with assignment status
        """
        logger.info(f"Assigning DID {phone_number} to agent extension {sip_extension}")

        clean_did = phone_number.replace('+', '').replace('-', '').replace(' ', '')

        # Create inbound route XML
        filename = f"did_{clean_did}.xml"
        filepath = f"/etc/freeswitch/dialplan/public/{filename}"

        xml_content = f"""<include>
  <extension name="DID_{clean_did}">
    <condition field="destination_number" expression="^(\\+?1?{clean_did})$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode={agent_config_id}"/>
      <action application="set" data="agent_config_id={agent_config_id}"/>
      <action application="log" data="INFO Routing DID {phone_number} to extension {sip_extension} (Agent: {agent_name})"/>
      <action application="transfer" data="{sip_extension} XML default"/>
    </condition>
  </extension>
</include>"""

        create_command = f"cat > {filepath} << 'EOF'\n{xml_content}\nEOF"

        try:
            exit_code, stdout, stderr = self._ssh_execute(create_command)

            if exit_code != 0:
                raise Exception(f"Failed to create DID route: {stderr}")

            logger.info(f"✅ Created DID route: {filepath}")

            # Reload FreeSWITCH
            self._ssh_execute('fs_cli -x "reloadxml"')

            return {
                'success': True,
                'phone_number': phone_number,
                'agent_config_id': agent_config_id,
                'sip_extension': sip_extension,
                'filepath': filepath,
                'message': f'DID {phone_number} assigned to extension {sip_extension}'
            }

        except Exception as e:
            logger.error(f"❌ Failed to assign DID: {e}")
            return {
                'success': False,
                'phone_number': phone_number,
                'error': str(e)
            }

    def configure_outbound_caller_id(
        self,
        agent_config_id: str,
        sip_extension: str,
        caller_id_number: str,
        caller_id_name: str
    ) -> Dict:
        """
        Configure outbound caller ID for agent

        Args:
            agent_config_id: Agent configuration ID
            sip_extension: Agent's SIP extension
            caller_id_number: Caller ID number (DID)
            caller_id_name: Caller ID name

        Returns:
            Dict with configuration status
        """
        logger.info(f"Configuring outbound caller ID for extension {sip_extension}: {caller_id_number}")

        # Create outbound route with caller ID
        filename = f"outbound_{sip_extension}.xml"
        filepath = f"/etc/freeswitch/dialplan/default/{filename}"

        clean_number = caller_id_number.replace('+', '').replace('-', '').replace(' ', '')

        xml_content = f"""<include>
  <extension name="Outbound_{sip_extension}">
    <condition field="caller_id_number" expression="^{sip_extension}$"/>
    <condition field="destination_number" expression="^(\\+?1?\\d{{10,15}})$">
      <action application="set" data="effective_caller_id_name={caller_id_name}"/>
      <action application="set" data="effective_caller_id_number={clean_number}"/>
      <action application="set" data="accountcode={agent_config_id}"/>
      <action application="log" data="INFO Outbound call from extension {sip_extension} with caller ID {caller_id_number}"/>
      <action application="bridge" data="sofia/external/$1@outbound_trunk"/>
    </condition>
  </extension>
</include>"""

        create_command = f"cat > {filepath} << 'EOF'\n{xml_content}\nEOF"

        try:
            exit_code, stdout, stderr = self._ssh_execute(create_command)

            if exit_code != 0:
                raise Exception(f"Failed to create outbound route: {stderr}")

            logger.info(f"✅ Created outbound route: {filepath}")

            # Reload FreeSWITCH
            self._ssh_execute('fs_cli -x "reloadxml"')

            return {
                'success': True,
                'agent_config_id': agent_config_id,
                'sip_extension': sip_extension,
                'caller_id_number': caller_id_number,
                'caller_id_name': caller_id_name,
                'filepath': filepath,
                'message': f'Outbound caller ID configured for extension {sip_extension}'
            }

        except Exception as e:
            logger.error(f"❌ Failed to configure caller ID: {e}")
            return {
                'success': False,
                'agent_config_id': agent_config_id,
                'error': str(e)
            }

    def delete_agent_sip_account(
        self,
        agent_config_id: str,
        sip_extension: str
    ) -> Dict:
        """
        Delete agent's SIP account and routes

        Args:
            agent_config_id: Agent configuration ID
            sip_extension: Agent's SIP extension

        Returns:
            Dict with deletion status
        """
        logger.info(f"Deleting SIP account for agent {agent_config_id}")

        results = []

        try:
            # Delete SIP user file
            user_file = f"/etc/freeswitch/directory/default/agent_{agent_config_id}.xml"
            self._ssh_execute(f"rm -f {user_file}")
            results.append(f"Deleted SIP user: {user_file}")

            # Delete outbound route
            outbound_file = f"/etc/freeswitch/dialplan/default/outbound_{sip_extension}.xml"
            self._ssh_execute(f"rm -f {outbound_file}")
            results.append(f"Deleted outbound route: {outbound_file}")

            # Reload FreeSWITCH
            self._ssh_execute('fs_cli -x "reloadxml"')
            results.append("FreeSWITCH configuration reloaded")

            logger.info(f"✅ Deleted SIP account for agent {agent_config_id}")

            return {
                'success': True,
                'agent_config_id': agent_config_id,
                'results': results,
                'message': f'SIP account deleted for agent {agent_config_id}'
            }

        except Exception as e:
            logger.error(f"❌ Failed to delete SIP account: {e}")
            return {
                'success': False,
                'agent_config_id': agent_config_id,
                'error': str(e)
            }

    def unassign_did(
        self,
        phone_number: str
    ) -> Dict:
        """
        Unassign DID from agent

        Args:
            phone_number: Phone number to unassign

        Returns:
            Dict with status
        """
        logger.info(f"Unassigning DID {phone_number}")

        clean_did = phone_number.replace('+', '').replace('-', '').replace(' ', '')
        filepath = f"/etc/freeswitch/dialplan/public/did_{clean_did}.xml"

        try:
            self._ssh_execute(f"rm -f {filepath}")
            logger.info(f"✅ Deleted DID route: {filepath}")

            # Reload FreeSWITCH
            self._ssh_execute('fs_cli -x "reloadxml"')

            return {
                'success': True,
                'phone_number': phone_number,
                'message': f'DID {phone_number} unassigned'
            }

        except Exception as e:
            logger.error(f"❌ Failed to unassign DID: {e}")
            return {
                'success': False,
                'phone_number': phone_number,
                'error': str(e)
            }


# ==================== HIGH-LEVEL INTEGRATION FUNCTIONS ====================

def provision_complete_agent(
    agent_config_id: str,
    agent_name: str,
    user_id: str,
    phone_number: Optional[str] = None
) -> Dict:
    """
    Complete agent provisioning: SIP account + DID + caller ID

    This is the main function to call when creating an AI agent

    Args:
        agent_config_id: Agent configuration ID
        agent_name: Agent name
        user_id: Owner user ID
        phone_number: Phone number to assign (optional)

    Returns:
        Dict with complete provisioning details
    """
    provisioner = FreeSWITCHMultiTenantProvisioner(
        ssh_host="24.199.103.153",
        ssh_user="root",
        ssh_password="TAIOiEajqAl7H9vF4uXN"  # TODO: Move to env var
    )

    logger.info(f"Provisioning complete agent: {agent_name} (ID: {agent_config_id})")

    results = {}

    # Step 1: Create SIP account
    sip_result = provisioner.create_agent_sip_account(
        agent_config_id=agent_config_id,
        agent_name=agent_name,
        user_id=user_id
    )
    results['sip_account'] = sip_result

    if not sip_result['success']:
        return {
            'success': False,
            'error': 'Failed to create SIP account',
            'details': results
        }

    sip_extension = sip_result['sip_extension']

    # Step 2: Assign DID (if provided)
    if phone_number:
        did_result = provisioner.assign_did_to_agent(
            phone_number=phone_number,
            agent_config_id=agent_config_id,
            sip_extension=sip_extension,
            agent_name=agent_name
        )
        results['did_assignment'] = did_result

        # Step 3: Configure outbound caller ID
        if did_result['success']:
            caller_id_result = provisioner.configure_outbound_caller_id(
                agent_config_id=agent_config_id,
                sip_extension=sip_extension,
                caller_id_number=phone_number,
                caller_id_name=agent_name
            )
            results['caller_id'] = caller_id_result

    logger.info(f"✅ Complete agent provisioning finished for {agent_name}")

    return {
        'success': True,
        'agent_config_id': agent_config_id,
        'sip_credentials': {
            'username': sip_result['sip_username'],
            'password': sip_result['sip_password'],
            'extension': sip_result['sip_extension'],
            'domain': sip_result['sip_domain'],
            'port': sip_result['sip_port']
        },
        'phone_number': phone_number,
        'results': results,
        'message': f'Agent {agent_name} fully provisioned'
    }


def deprovision_complete_agent(
    agent_config_id: str,
    sip_extension: str,
    phone_number: Optional[str] = None
) -> Dict:
    """
    Complete agent deprovisioning: Remove SIP account + DID

    Args:
        agent_config_id: Agent configuration ID
        sip_extension: Agent's SIP extension
        phone_number: Phone number to unassign (optional)

    Returns:
        Dict with deprovisioning status
    """
    provisioner = FreeSWITCHMultiTenantProvisioner(
        ssh_host="24.199.103.153",
        ssh_user="root",
        ssh_password="TAIOiEajqAl7H9vF4uXN"
    )

    logger.info(f"Deprovisioning agent {agent_config_id}")

    results = {}

    # Step 1: Unassign DID (if provided)
    if phone_number:
        did_result = provisioner.unassign_did(phone_number)
        results['did_unassignment'] = did_result

    # Step 2: Delete SIP account
    sip_result = provisioner.delete_agent_sip_account(
        agent_config_id=agent_config_id,
        sip_extension=sip_extension
    )
    results['sip_deletion'] = sip_result

    logger.info(f"✅ Complete agent deprovisioning finished for {agent_config_id}")

    return {
        'success': True,
        'agent_config_id': agent_config_id,
        'results': results,
        'message': f'Agent {agent_config_id} fully deprovisioned'
    }


# ==================== EXAMPLE USAGE ====================

if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)

    print("\n=== Testing Complete Agent Provisioning ===\n")

    # Test: Provision complete agent with phone number
    result = provision_complete_agent(
        agent_config_id="test-agent-001",
        agent_name="Test Sales Agent",
        user_id="user-123",
        phone_number="+17678189987"
    )

    print(f"\nProvisioning Result:")
    print(f"Success: {result['success']}")
    if result['success']:
        print(f"SIP Username: {result['sip_credentials']['username']}")
        print(f"SIP Password: {result['sip_credentials']['password']}")
        print(f"SIP Extension: {result['sip_credentials']['extension']}")
        print(f"SIP Domain: {result['sip_credentials']['domain']}")
        print(f"Phone Number: {result['phone_number']}")
