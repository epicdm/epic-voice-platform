#!/usr/bin/env python3
"""
FreeSWITCH Auto-Provisioning Service
Automatically provisions DIDs and routing when users create AI agents
"""

import logging
import subprocess
import paramiko
from typing import Optional, Dict, List
import os

logger = logging.getLogger(__name__)


class FreeSWITCHProvisioner:
    """
    Auto-provision FreeSWITCH DIDs and routing via SSH

    Since Event Socket (port 8021) is not accessible remotely,
    this uses SSH to execute fs_cli commands on the FreeSWITCH server.
    """

    def __init__(
        self,
        ssh_host: str = "24.199.103.153",
        ssh_user: str = "root",
        ssh_password: Optional[str] = None,
        ssh_key_path: Optional[str] = None,
        livekit_sip_domain: str = "3m4yki5jezn.sip.livekit.cloud"
    ):
        """
        Initialize FreeSWITCH provisioner

        Args:
            ssh_host: FreeSWITCH server IP/hostname
            ssh_user: SSH username
            ssh_password: SSH password (if using password auth)
            ssh_key_path: Path to SSH private key (if using key auth)
            livekit_sip_domain: LiveKit SIP domain for routing
        """
        self.ssh_host = ssh_host
        self.ssh_user = ssh_user
        self.ssh_password = ssh_password
        self.ssh_key_path = ssh_key_path
        self.livekit_sip_domain = livekit_sip_domain

    def _ssh_execute(self, command: str) -> tuple[int, str, str]:
        """
        Execute command via SSH

        Args:
            command: Command to execute

        Returns:
            Tuple of (exit_code, stdout, stderr)
        """
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            # Connect with password or key
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

            # Execute command
            stdin, stdout, stderr = ssh.exec_command(command)
            exit_code = stdout.channel.recv_exit_status()

            stdout_text = stdout.read().decode('utf-8')
            stderr_text = stderr.read().decode('utf-8')

            ssh.close()

            return exit_code, stdout_text, stderr_text

        except Exception as e:
            logger.error(f"SSH command failed: {e}")
            raise

    def provision_did_routing(
        self,
        did: str,
        agent_config_id: Optional[int] = None,
        description: str = ""
    ) -> Dict:
        """
        Provision DID routing to LiveKit

        Args:
            did: Phone number (e.g., '+17678189426')
            agent_config_id: Agent config ID for tracking
            description: Optional description

        Returns:
            Dict with provisioning status
        """
        logger.info(f"Provisioning DID routing: {did} → LiveKit")

        # Clean phone number
        clean_did = did.replace('+', '').replace('-', '').replace(' ', '')

        # Generate XML filename
        filename = f"050_livekit_{clean_did}.xml"
        filepath = f"/etc/freeswitch/dialplan/public/{filename}"

        # Generate XML content
        xml_content = f"""<include>
  <extension name="LiveKit_DID_{clean_did}">
    <condition field="destination_number" expression="^(\\+?1?{clean_did})$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_{clean_did}"/>
      <action application="set" data="agent_config_id={agent_config_id or 'none'}"/>
      <action application="log" data="INFO Routing {did} to LiveKit SIP (Agent ID: {agent_config_id})"/>
      <action application="bridge" data="sofia/external/{clean_did}@{self.livekit_sip_domain}"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>"""

        # Create file via SSH
        create_command = f"cat > {filepath} << 'EOF'\n{xml_content}\nEOF"

        try:
            exit_code, stdout, stderr = self._ssh_execute(create_command)

            if exit_code != 0:
                raise Exception(f"Failed to create dialplan file: {stderr}")

            logger.info(f"✅ Created dialplan file: {filepath}")

            # Reload FreeSWITCH
            reload_exit, reload_out, reload_err = self._ssh_execute('fs_cli -x "reloadxml"')

            if reload_exit == 0 and '+OK' in reload_out:
                logger.info(f"✅ FreeSWITCH configuration reloaded")
            else:
                logger.warning(f"⚠️  Reload may have failed: {reload_err}")

            # Verify routing loaded
            verify_cmd = f'fs_cli -x "xml_locate dialplan public {clean_did}"'
            verify_exit, verify_out, verify_err = self._ssh_execute(verify_cmd)

            route_verified = f"LiveKit_DID_{clean_did}" in verify_out

            return {
                'success': True,
                'did': did,
                'clean_did': clean_did,
                'agent_config_id': agent_config_id,
                'filepath': filepath,
                'route_verified': route_verified,
                'message': f'DID {did} routed to LiveKit'
            }

        except Exception as e:
            logger.error(f"❌ Failed to provision DID {did}: {e}")
            return {
                'success': False,
                'did': did,
                'error': str(e)
            }

    def deprovision_did_routing(self, did: str) -> Dict:
        """
        Remove DID routing

        Args:
            did: Phone number to remove

        Returns:
            Dict with status
        """
        logger.info(f"Deprovisioning DID routing: {did}")

        clean_did = did.replace('+', '').replace('-', '').replace(' ', '')
        filename = f"050_livekit_{clean_did}.xml"
        filepath = f"/etc/freeswitch/dialplan/public/{filename}"

        try:
            # Remove file
            remove_cmd = f"rm -f {filepath}"
            exit_code, stdout, stderr = self._ssh_execute(remove_cmd)

            if exit_code != 0:
                raise Exception(f"Failed to remove file: {stderr}")

            logger.info(f"✅ Removed dialplan file: {filepath}")

            # Reload FreeSWITCH
            self._ssh_execute('fs_cli -x "reloadxml"')

            return {
                'success': True,
                'did': did,
                'message': f'DID {did} routing removed'
            }

        except Exception as e:
            logger.error(f"❌ Failed to deprovision DID {did}: {e}")
            return {
                'success': False,
                'did': did,
                'error': str(e)
            }

    def list_provisioned_dids(self) -> List[str]:
        """
        List all provisioned LiveKit DIDs

        Returns:
            List of DIDs
        """
        try:
            # List LiveKit dialplan files
            list_cmd = "ls -1 /etc/freeswitch/dialplan/public/050_livekit_*.xml 2>/dev/null | xargs -I {} basename {}"
            exit_code, stdout, stderr = self._ssh_execute(list_cmd)

            if exit_code != 0:
                return []

            # Extract DIDs from filenames
            dids = []
            for line in stdout.strip().split('\n'):
                if line:
                    # Extract DID from filename like "050_livekit_17678189426.xml"
                    did = line.replace('050_livekit_', '').replace('.xml', '')
                    dids.append(f'+{did}')

            return dids

        except Exception as e:
            logger.error(f"Failed to list DIDs: {e}")
            return []

    def verify_did_routing(self, did: str) -> bool:
        """
        Verify DID routing is configured

        Args:
            did: Phone number

        Returns:
            True if routing exists
        """
        clean_did = did.replace('+', '').replace('-', '').replace(' ', '')

        try:
            verify_cmd = f'fs_cli -x "xml_locate dialplan public {clean_did}"'
            exit_code, stdout, stderr = self._ssh_execute(verify_cmd)

            return f"LiveKit_DID_{clean_did}" in stdout

        except Exception as e:
            logger.error(f"Failed to verify DID {did}: {e}")
            return False

    def get_active_calls(self) -> List[Dict]:
        """
        Get currently active calls

        Returns:
            List of active call objects
        """
        try:
            show_calls_cmd = 'fs_cli -x "show calls as json"'
            exit_code, stdout, stderr = self._ssh_execute(show_calls_cmd)

            if exit_code == 0 and stdout.strip():
                import json
                calls = json.loads(stdout)
                return calls.get('rows', [])

            return []

        except Exception as e:
            logger.error(f"Failed to get active calls: {e}")
            return []

    def reload_configuration(self) -> bool:
        """
        Reload FreeSWITCH configuration

        Returns:
            True if successful
        """
        try:
            exit_code, stdout, stderr = self._ssh_execute('fs_cli -x "reloadxml"')
            return exit_code == 0 and '+OK' in stdout

        except Exception as e:
            logger.error(f"Failed to reload config: {e}")
            return False


# ==================== INTEGRATION WITH LIVEKIT ====================

def provision_agent_did(
    phone_number: str,
    agent_config_id: int,
    agent_name: str
) -> Dict:
    """
    Provision DID when user creates AI agent

    This is called from LiveKit backend when:
    - User creates new AI agent
    - User assigns phone number to agent

    Args:
        phone_number: Phone number to provision (e.g., '+17678189426')
        agent_config_id: Agent configuration ID from database
        agent_name: Agent name for logging

    Returns:
        Dict with provisioning status
    """
    provisioner = FreeSWITCHProvisioner(
        ssh_host="24.199.103.153",
        ssh_user="root",
        ssh_password="TAIOiEajqAl7H9vF4uXN",  # TODO: Move to env var
        livekit_sip_domain="3m4yki5jezn.sip.livekit.cloud"
    )

    logger.info(f"Provisioning DID {phone_number} for agent '{agent_name}' (ID: {agent_config_id})")

    result = provisioner.provision_did_routing(
        did=phone_number,
        agent_config_id=agent_config_id,
        description=f"AI Agent: {agent_name}"
    )

    if result['success']:
        logger.info(f"✅ DID {phone_number} provisioned successfully")
    else:
        logger.error(f"❌ DID provisioning failed: {result.get('error')}")

    return result


def deprovision_agent_did(phone_number: str) -> Dict:
    """
    Remove DID routing when agent is deleted or phone number unassigned

    Args:
        phone_number: Phone number to deprovision

    Returns:
        Dict with status
    """
    provisioner = FreeSWITCHProvisioner(
        ssh_host="24.199.103.153",
        ssh_user="root",
        ssh_password="TAIOiEajqAl7H9vF4uXN",  # TODO: Move to env var
    )

    logger.info(f"Deprovisioning DID {phone_number}")

    result = provisioner.deprovision_did_routing(phone_number)

    if result['success']:
        logger.info(f"✅ DID {phone_number} deprovisioned")
    else:
        logger.error(f"❌ DID deprovisioning failed: {result.get('error')}")

    return result


# ==================== EXAMPLE USAGE ====================

if __name__ == '__main__':
    # Configure logging
    logging.basicConfig(level=logging.INFO)

    # Initialize provisioner
    provisioner = FreeSWITCHProvisioner(
        ssh_host="24.199.103.153",
        ssh_user="root",
        ssh_password="TAIOiEajqAl7H9vF4uXN"
    )

    # Example 1: Provision DID for new AI agent
    print("\n=== Provisioning DID ===")
    result = provisioner.provision_did_routing(
        did='+17678189426',
        agent_config_id=1,
        description="Customer Support AI"
    )
    print(f"Result: {result}")

    # Example 2: Verify routing
    print("\n=== Verifying Routing ===")
    verified = provisioner.verify_did_routing('+17678189426')
    print(f"Routing verified: {verified}")

    # Example 3: List all provisioned DIDs
    print("\n=== Listing Provisioned DIDs ===")
    dids = provisioner.list_provisioned_dids()
    print(f"Provisioned DIDs: {dids}")

    # Example 4: Get active calls
    print("\n=== Active Calls ===")
    calls = provisioner.get_active_calls()
    print(f"Active calls: {len(calls)}")
