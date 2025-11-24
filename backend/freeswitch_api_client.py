#!/usr/bin/env python3
"""
FreeSWITCH/FusionPBX API Client
Provides interface to FreeSWITCH APIs for DID management, routing, CDR, and call control
"""

import requests
import logging
from typing import Optional, Dict, List, Any
from datetime import datetime
import socket

logger = logging.getLogger(__name__)


class FreeSWITCHAPIClient:
    """Client for FreeSWITCH/FusionPBX REST API and Event Socket"""

    def __init__(
        self,
        base_url: str = "https://billing.call.epic.dm",
        api_token: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        event_socket_host: str = "24.199.103.153",
        event_socket_port: int = 8021,
        event_socket_password: str = "ClueCon"
    ):
        """
        Initialize FreeSWITCH API client

        Args:
            base_url: Base URL for FusionPBX API
            api_token: Bearer token for API authentication
            username: Username for session-based auth
            password: Password for session-based auth
            event_socket_host: FreeSWITCH Event Socket host
            event_socket_port: FreeSWITCH Event Socket port
            event_socket_password: FreeSWITCH Event Socket password
        """
        self.base_url = base_url.rstrip('/')
        self.api_token = api_token
        self.username = username
        self.password = password
        self.session = requests.Session()

        # Event Socket connection details
        self.es_host = event_socket_host
        self.es_port = event_socket_port
        self.es_password = event_socket_password

        # Set default headers
        if api_token:
            self.session.headers.update({
                'Authorization': f'Bearer {api_token}',
                'Content-Type': 'application/json'
            })

    def _request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Make HTTP request to FusionPBX API

        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint (e.g., '/api/extensions')
            data: Request body data
            params: Query parameters

        Returns:
            Response JSON as dictionary
        """
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data,
                params=params,
                timeout=30
            )
            response.raise_for_status()

            # Try to parse JSON, return empty dict if not JSON
            try:
                return response.json()
            except ValueError:
                return {'success': True, 'data': response.text}

        except requests.exceptions.RequestException as e:
            logger.error(f"API request failed: {method} {url} - {e}")
            raise

    def _event_socket_command(self, command: str) -> str:
        """
        Execute command via FreeSWITCH Event Socket

        Args:
            command: FreeSWITCH command (e.g., 'api status')

        Returns:
            Command output as string
        """
        try:
            # Connect to Event Socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            sock.connect((self.es_host, self.es_port))

            # Read initial banner
            response = sock.recv(1024).decode('utf-8')

            # Authenticate
            auth_cmd = f"auth {self.es_password}\n\n"
            sock.send(auth_cmd.encode('utf-8'))
            auth_response = sock.recv(1024).decode('utf-8')

            if 'Reply-Text: +OK accepted' not in auth_response:
                raise Exception(f"Event Socket authentication failed: {auth_response}")

            # Send command
            sock.send(f"{command}\n\n".encode('utf-8'))

            # Read response
            output = ""
            while True:
                chunk = sock.recv(4096).decode('utf-8')
                if not chunk:
                    break
                output += chunk
                if '\n\n' in chunk:  # End of response
                    break

            sock.close()
            return output

        except Exception as e:
            logger.error(f"Event Socket command failed: {command} - {e}")
            raise

    # ==================== EXTENSION MANAGEMENT ====================

    def list_extensions(self, params: Optional[Dict] = None) -> List[Dict]:
        """
        List all extensions

        Args:
            params: Query parameters (e.g., {'limit': 100, 'offset': 0})

        Returns:
            List of extension objects
        """
        response = self._request('GET', '/api/extensions', params=params)
        return response.get('data', [])

    def get_extension(self, extension_id: str) -> Dict:
        """
        Get extension details by ID

        Args:
            extension_id: Extension UUID

        Returns:
            Extension object
        """
        return self._request('GET', f'/api/extensions/{extension_id}')

    def create_extension(
        self,
        extension: str,
        password: str,
        caller_id_name: str,
        caller_id_number: str,
        **kwargs
    ) -> Dict:
        """
        Create new extension

        Args:
            extension: Extension number (e.g., '2000')
            password: SIP password
            caller_id_name: Caller ID name
            caller_id_number: Caller ID number
            **kwargs: Additional extension parameters

        Returns:
            Created extension object
        """
        data = {
            'extension': extension,
            'password': password,
            'effective_caller_id_name': caller_id_name,
            'effective_caller_id_number': caller_id_number,
            'outbound_caller_id_number': caller_id_number,
            **kwargs
        }
        return self._request('POST', '/api/extensions', data=data)

    def update_extension(self, extension_id: str, updates: Dict) -> Dict:
        """
        Update extension

        Args:
            extension_id: Extension UUID
            updates: Fields to update

        Returns:
            Updated extension object
        """
        return self._request('PUT', f'/api/extensions/{extension_id}', data=updates)

    def delete_extension(self, extension_id: str) -> Dict:
        """
        Delete extension

        Args:
            extension_id: Extension UUID

        Returns:
            Success response
        """
        return self._request('DELETE', f'/api/extensions/{extension_id}')

    def get_extension_registrations(self) -> List[Dict]:
        """
        Get currently registered extensions

        Returns:
            List of registered extensions
        """
        response = self._request('GET', '/api/extensions/registrations')
        return response.get('data', [])

    # ==================== DID/DIALPLAN MANAGEMENT ====================

    def create_inbound_route(
        self,
        did: str,
        destination: str,
        description: str = "",
        enabled: bool = True
    ) -> Dict:
        """
        Create inbound route for DID

        Args:
            did: Phone number (e.g., '+17678189426')
            destination: SIP destination (e.g., '17678189426@3m4yki5jezn.sip.livekit.cloud')
            description: Route description
            enabled: Enable route immediately

        Returns:
            Created route object
        """
        # Use Event Socket to create dialplan entry in database
        # This creates a database-driven dialplan entry

        # Format: INSERT INTO v_dialplans ...
        # For now, use Event Socket to add XML

        dialplan_xml = f"""
        <extension name="LiveKit_DID_{did.replace('+', '').replace('-', '')}">
          <condition field="destination_number" expression="^(\\+?1?{did.replace('+', '').replace('-', '')})$">
            <action application="set" data="call_direction=inbound"/>
            <action application="set" data="accountcode=livekit_{did.replace('+', '')}"/>
            <action application="log" data="INFO Routing {did} to LiveKit SIP"/>
            <action application="bridge" data="sofia/external/{destination}"/>
            <action application="hangup" data="NO_ANSWER"/>
          </condition>
        </extension>
        """

        # Note: This requires database access or FusionPBX admin API
        # For now, return the XML that needs to be added

        return {
            'success': True,
            'did': did,
            'destination': destination,
            'dialplan_xml': dialplan_xml,
            'message': 'Dialplan XML generated. Use Event Socket or database to add.'
        }

    def reload_dialplan(self) -> str:
        """
        Reload FreeSWITCH dialplan

        Returns:
            Reload command output
        """
        return self._event_socket_command('api reloadxml')

    # ==================== CDR (CALL DETAIL RECORDS) ====================

    def get_cdrs(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        extension: Optional[str] = None,
        caller: Optional[str] = None,
        destination: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict]:
        """
        Get call detail records

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            extension: Filter by extension
            caller: Filter by caller number
            destination: Filter by destination number
            limit: Number of records to return
            offset: Pagination offset

        Returns:
            List of CDR objects
        """
        params = {
            'limit': limit,
            'offset': offset
        }

        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        if extension:
            params['extension'] = extension
        if caller:
            params['caller'] = caller
        if destination:
            params['destination'] = destination

        response = self._request('GET', '/api/cdrs', params=params)
        return response.get('data', [])

    def get_cdr_stats(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """
        Get call statistics

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)

        Returns:
            Statistics object with totals, averages, etc.
        """
        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date

        return self._request('GET', '/api/cdrs/stats', params=params)

    def export_cdrs(
        self,
        start_date: str,
        end_date: str,
        format: str = 'csv'
    ) -> bytes:
        """
        Export CDRs to file

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            format: Export format ('csv', 'pdf')

        Returns:
            File content as bytes
        """
        params = {
            'start_date': start_date,
            'end_date': end_date,
            'format': format
        }

        response = self.session.get(
            f"{self.base_url}/call-detail-records/export",
            params=params,
            timeout=60
        )
        response.raise_for_status()
        return response.content

    # ==================== CALL CONTROL ====================

    def get_active_calls(self) -> List[Dict]:
        """
        Get currently active calls

        Returns:
            List of active call objects
        """
        response = self._request('GET', '/active-calls')
        return response.get('data', [])

    def hangup_call(self, call_uuid: str) -> Dict:
        """
        Hangup active call

        Args:
            call_uuid: Call UUID

        Returns:
            Success response
        """
        data = {
            'action': 'hangup',
            'uuid': call_uuid
        }
        return self._request('POST', '/active-calls/action', data=data)

    def transfer_call(self, call_uuid: str, destination: str) -> Dict:
        """
        Transfer call to destination

        Args:
            call_uuid: Call UUID
            destination: Transfer destination (extension or number)

        Returns:
            Success response
        """
        data = {
            'action': 'transfer',
            'uuid': call_uuid,
            'destination': destination
        }
        return self._request('POST', '/active-calls/action', data=data)

    def originate_call(
        self,
        from_extension: str,
        to_number: str,
        caller_id_number: Optional[str] = None
    ) -> str:
        """
        Originate new call

        Args:
            from_extension: Originating extension (e.g., 'user/2000')
            to_number: Destination number
            caller_id_number: Caller ID to present

        Returns:
            Call UUID
        """
        # Use Event Socket to originate
        caller_id = f"origination_caller_id_number={caller_id_number}" if caller_id_number else ""
        command = f"api originate {{{caller_id}}}user/{from_extension} {to_number}"

        output = self._event_socket_command(command)

        # Extract UUID from response
        if '+OK' in output:
            # UUID is in the response
            uuid = output.split('\n')[0].replace('+OK', '').strip()
            return uuid
        else:
            raise Exception(f"Call origination failed: {output}")

    # ==================== BILLING ====================

    def get_balance(self, account_id: str) -> Dict:
        """
        Get account balance

        Args:
            account_id: Account ID

        Returns:
            Balance object
        """
        params = {'account_id': account_id}
        return self._request('GET', '/api/billing/balance', params=params)

    def add_credit(self, account_id: str, amount: float, description: str = "") -> Dict:
        """
        Add credit to account

        Args:
            account_id: Account ID
            amount: Amount to add
            description: Transaction description

        Returns:
            Transaction object
        """
        data = {
            'account_id': account_id,
            'amount': amount,
            'description': description
        }
        return self._request('POST', '/api/billing/credit/add', data=data)

    def deduct_credit(self, account_id: str, amount: float, description: str = "") -> Dict:
        """
        Deduct credit from account

        Args:
            account_id: Account ID
            amount: Amount to deduct
            description: Transaction description

        Returns:
            Transaction object
        """
        data = {
            'account_id': account_id,
            'amount': amount,
            'description': description
        }
        return self._request('POST', '/api/billing/credit/deduct', data=data)

    # ==================== SMS ====================

    def send_sms(self, from_number: str, to_number: str, message: str) -> Dict:
        """
        Send SMS message

        Args:
            from_number: From phone number
            to_number: To phone number
            message: Message content

        Returns:
            SMS send result
        """
        data = {
            'from': from_number,
            'to': to_number,
            'message': message
        }
        return self._request('POST', '/sms/send/single', data=data)

    def send_bulk_sms(
        self,
        from_number: str,
        to_numbers: List[str],
        message: str
    ) -> Dict:
        """
        Send bulk SMS messages

        Args:
            from_number: From phone number
            to_numbers: List of recipient numbers
            message: Message content

        Returns:
            Bulk send result
        """
        data = {
            'from': from_number,
            'to': to_numbers,
            'message': message
        }
        return self._request('POST', '/sms/send/bulk', data=data)

    def get_sms_logs(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get SMS logs

        Args:
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            limit: Number of records

        Returns:
            List of SMS log objects
        """
        params = {'limit': limit}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date

        response = self._request('GET', '/sms/logs/data', params=params)
        return response.get('data', [])

    # ==================== UTILITY METHODS ====================

    def get_status(self) -> str:
        """
        Get FreeSWITCH status

        Returns:
            Status output
        """
        return self._event_socket_command('api status')

    def show_calls(self) -> str:
        """
        Show active calls via Event Socket

        Returns:
            Calls output
        """
        return self._event_socket_command('api show calls')

    def sofia_status(self) -> str:
        """
        Get SIP profile status

        Returns:
            Sofia status output
        """
        return self._event_socket_command('api sofia status')


# ==================== EXAMPLE USAGE ====================

if __name__ == '__main__':
    # Initialize client
    client = FreeSWITCHAPIClient(
        base_url="https://billing.call.epic.dm",
        api_token="your-api-token-here",  # Or use username/password
        event_socket_host="24.199.103.153",
        event_socket_port=8021,
        event_socket_password="ClueCon"
    )

    # List extensions
    print("Extensions:")
    extensions = client.list_extensions()
    for ext in extensions:
        print(f"  {ext.get('extension')} - {ext.get('effective_caller_id_name')}")

    # Get CDRs
    print("\nRecent CDRs:")
    cdrs = client.get_cdrs(limit=10)
    for cdr in cdrs:
        print(f"  {cdr.get('caller_id_number')} → {cdr.get('destination_number')} ({cdr.get('billsec')}s)")

    # Get active calls
    print("\nActive Calls:")
    calls = client.get_active_calls()
    print(f"  {len(calls)} active calls")

    # Get status via Event Socket
    print("\nFreeSWITCH Status:")
    status = client.get_status()
    print(status)
