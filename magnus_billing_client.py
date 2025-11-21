"""
Magnus Billing API Client
Based on the PHP Magnus Billing integration
"""

import requests
import random
import json
from typing import Dict, Optional, Any, List
from datetime import datetime


class MagnusBillingClient:
    """
    Client for Magnus Billing API operations
    Compatible with the PHP magnusBilling API
    """
    
    def __init__(self, api_key: str, secret_key: str, base_url: str):
        """
        Initialize Magnus Billing client
        
        Args:
            api_key: Magnus Billing API key
            secret_key: Magnus Billing secret key
            base_url: Magnus Billing URL (e.g., https://voice.epic.dm)
        """
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verification
        
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """
        Make API request to Magnus Billing
        
        Args:
            method: HTTP method (GET, POST, PUT, DELETE)
            endpoint: API endpoint
            data: Request payload
            
        Returns:
            Response data as dictionary
        """
        url = f"{self.base_url}/index.php/api/{endpoint}"  # Corrected URL
        
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f"Basic {self.api_key}:{self.secret_key}",
            'User-Agent': 'Python MagnusBilling Client'
        }
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = self.session.post(url, headers=headers, json=data)
            elif method == 'PUT':
                response = self.session.put(url, headers=headers, json=data)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            try:
                return response.json()
            except json.JSONDecodeError:
                # Handle non-JSON responses on success (e.g., simple "success" string)
                return {'success': True, 'data': response.text}
            
        except requests.exceptions.RequestException as e:
            print(f"Magnus Billing API Error: {e}")
            return {'success': False, 'error': str(e)}
    
    # ========================================================================
    # User Management (Based on PHP createUser)
    # ========================================================================
    
    def create_user(self, user_data: Dict) -> Dict:
        """
        Create a new user in Magnus Billing
        
        Args:
            user_data: Dictionary with user information
                - username: Account username
                - password: Account password
                - firstname: First name
                - lastname: Last name
                - email: Email address
                - phone: Phone number
                - id_plan: Plan ID (default: 34)
                - id_group: Group ID (default: 3)
                - typepaid: Payment type (default: 0)
                - prefix_local: Local prefix rules
                - id_offer: Offer ID
                
        Returns:
            Response from Magnus Billing API
        """
        endpoint = 'user'
        return self._make_request('POST', endpoint, user_data)
    
    def get_user(self, username: str) -> Optional[Dict]:
        """
        Get user by username
        
        Args:
            username: Username to search for
            
        Returns:
            User data or None
        """
        endpoint = f'user?filter[username]={username}'
        response = self._make_request('GET', endpoint)
        
        if response.get('rows'):
            return response['rows'][0]
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """
        Get user by ID
        
        Args:
            user_id: User ID
            
        Returns:
            User data or None
        """
        endpoint = f'user/{user_id}'
        response = self._make_request('GET', endpoint)
        return response if response.get('success') else None
    
    def update_user(self, user_id: str, updates: Dict) -> Dict:
        """
        Update user information
        
        Args:
            user_id: User ID to update
            updates: Dictionary of fields to update
            
        Returns:
            Response from Magnus Billing
        """
        endpoint = f'user/{user_id}'
        return self._make_request('PUT', endpoint, updates)
    
    # ========================================================================
    # DID Management (Based on PHP DID operations)
    # ========================================================================
    
    def generate_unique_did(self, prefix: str = '1767818', min_range: int = 9000, max_range: int = 9999, max_attempts: int = 100) -> Optional[str]:
        """
        Generate a unique DID number in the specified range (like PHP code)
        
        Args:
            prefix: Number prefix (e.g., '1767818')
            min_range: Minimum number in range (e.g., 9000)
            max_range: Maximum number in range (e.g., 9999)
            max_attempts: Maximum attempts to find unique number
            
        Returns:
            Unique DID or None if failed
        """
        for attempt in range(max_attempts):
            random_number = random.randint(min_range, max_range)
            did = f"{prefix}{random_number}"
            
            # Check if DID exists in Magnus Billing
            existing = self.get_did(did)
            if not existing:
                return did
        
        return None
    
    def create_did(self, did: str, country: str = 'Dominica', activated: int = 1) -> Dict:
        """
        Create DID in Magnus Billing
        
        Args:
            did: DID number
            country: Country name
            activated: 1 for active, 0 for inactive
            
        Returns:
            Response from Magnus Billing
        """
        data = {
            'did': did,
            'country': country,
            'activated': activated
        }
        
        endpoint = 'did'
        return self._make_request('POST', endpoint, data)
    
    def get_did(self, did: str) -> Optional[Dict]:
        """
        Get DID information
        
        Args:
            did: DID number to search
            
        Returns:
            DID data or None
        """
        endpoint = f'did?filter[did]={did}'
        response = self._make_request('GET', endpoint)
        
        if response.get('rows'):
            return response['rows'][0]
        return None
    
    def get_did_by_id(self, did_id: str) -> Optional[Dict]:
        """
        Get DID by ID
        
        Args:
            did_id: DID ID
            
        Returns:
            DID data or None
        """
        endpoint = f'did/{did_id}'
        response = self._make_request('GET', endpoint)
        return response if response.get('success') else None
    
    # ========================================================================
    # DID Destination (Routing)
    # ========================================================================
    
    def create_did_destination(self, destination_data: Dict) -> Dict:
        """
        Create DID destination (routing rules)
        
        Args:
            destination_data: Dictionary with:
                - id_user: User ID
                - id_did: DID ID
                - voip_call: 1 for VoIP call
                - id_sip: SIP account ID
                - destination: Destination string (e.g., 'SIP/username')
                - priority: Priority (default: 1)
                
        Returns:
            Response from Magnus Billing
        """
        endpoint = 'diddestination'
        return self._make_request('POST', endpoint, destination_data)
    
    # ========================================================================
    # SIP Management
    # ========================================================================
    
    def get_sip_by_user(self, user_id: str) -> Optional[Dict]:
        """
        Get SIP account for user
        
        Args:
            user_id: User ID
            
        Returns:
            SIP account data or None
        """
        endpoint = f'sip?filter[id_user]={user_id}'
        response = self._make_request('GET', endpoint)
        
        if response.get('rows'):
            return response['rows'][0]
        return None
    
    def update_sip(self, sip_id: str, updates: Dict) -> Dict:
        """
        Update SIP account settings
        
        Args:
            sip_id: SIP account ID
            updates: Dictionary of fields to update
                - callerid: Caller ID
                - voicemail: Enable voicemail (1/0)
                - voicemail_email: Email for voicemail
                - voicemail_password: Voicemail PIN
                - allow: Codecs (e.g., 'opus,g729,gsm,alaw,ulaw')
                
        Returns:
            Response from Magnus Billing
        """
        endpoint = f'sip/{sip_id}'
        return self._make_request('PUT', endpoint, updates)
    
    # ========================================================================
    # Offer Management
    # ========================================================================
    
    def create_offer_use(self, offer_data: Dict) -> Dict:
        """
        Create offer usage for user
        
        Args:
            offer_data: Dictionary with:
                - id_user: User ID
                - id_offer: Offer ID
                - reservationdate: Reservation date
                - month_payed: Months paid
                - status: Status (1 for active)
                
        Returns:
            Response from Magnus Billing
        """
        endpoint = 'offeruse'
        return self._make_request('POST', endpoint, offer_data)
    
    # ========================================================================
    # DID Provisioning with Routing (For existing users)
    # ========================================================================
    
    def provision_did_for_user(
        self,
        user_id: str,
        username: str,
        prefix: str = '1767818',
        min_range: int = 9000,
        max_range: int = 9999
    ) -> Dict:
        """
        Provision a DID for an existing user with complete setup:
        - Generate unique DID in range
        - Create DID in Magnus Billing
        - Set up routing (DID destination)
        - Set caller ID on SIP account
        
        Args:
            user_id: Magnus Billing user ID
            username: SIP username
            prefix: DID prefix (default: '1767818')
            min_range: Min number in range (default: 9000)
            max_range: Max number in range (default: 9999)
            
        Returns:
            Dictionary with success status and DID info
        """
        try:
            # 1. Generate unique DID in range 9000-9999
            did = self.generate_unique_did(prefix, min_range, max_range)
            if not did:
                return {
                    'success': False,
                    'error': f'No available DIDs in range {prefix}{min_range}-{max_range}'
                }
            
            print(f"📞 Generated DID: {did}")
            
            # 2. Create DID in Magnus Billing
            did_result = self.create_did(did, country='Dominica', activated=1)
            if not did_result.get('success') and not did_result.get('id'):
                return {
                    'success': False,
                    'error': f"Failed to create DID: {did_result.get('error', 'Unknown error')}"
                }
            
            did_id = did_result.get('id')
            print(f"✅ Created DID in Magnus, ID: {did_id}")
            
            # 3. Get user's SIP account
            sip = self.get_sip_by_user(user_id)
            if not sip:
                return {
                    'success': False,
                    'error': f'No SIP account found for user {user_id}'
                }
            
            sip_id = sip.get('id')
            print(f"✅ Found SIP account, ID: {sip_id}")
            
            # 4. Create DID destination (routing to SIP account)
            destination_data = {
                'id_user': user_id,
                'id_did': did_id,
                'voip_call': 1,
                'id_sip': sip_id,
                'destination': f'SIP/{username}',
                'priority': 1
            }
            
            dest_result = self.create_did_destination(destination_data)
            print(f"✅ Created DID destination: SIP/{username}")
            
            # 5. Set caller ID on SIP account
            sip_updates = {
                'callerid': did,
                'allow': 'opus,g729,gsm,alaw,ulaw'
            }
            
    """
    Provision a DID for an existing user with complete setup:
    - Generate unique DID in range
    - Create DID in Magnus Billing
    - Set up routing (DID destination)
    - Set caller ID on SIP account
    
    Args:
        user_id: Magnus Billing user ID
        username: SIP username
        prefix: DID prefix (default: '1767818')
        min_range: Min number in range (default: 9000)
        max_range: Max number in range (default: 9999)
        
    Returns:
        Dictionary with success status and DID info
    """
    try:
        # 1. Generate unique DID in range 9000-9999
        did = self.generate_unique_did(prefix, min_range, max_range)
        if not did:
            return {
                'success': False,
                'error': f'No available DIDs in range {prefix}{min_range}-{max_range}'
            }
        
        print(f"📞 Generated DID: {did}")
        
        # 2. Create DID in Magnus Billing
        did_result = self.create_did(did, country='Dominica', activated=1)
        if not did_result.get('success') and not did_result.get('id'):
            return {
                'success': False,
                'error': f"Failed to create DID: {did_result.get('error', 'Unknown error')}"
            }
        
        did_id = did_result.get('id')
        print(f"✅ Created DID in Magnus, ID: {did_id}")
        
        # 3. Get user's SIP account
        sip = self.get_sip_by_user(user_id)
        if not sip:
            return {
                'success': False,
                'error': f'No SIP account found for user {user_id}'
            }
        
        sip_id = sip.get('id')
        print(f"✅ Found SIP account, ID: {sip_id}")
        
        # 4. Create DID destination (routing to SIP account)
        destination_data = {
            'id_user': user_id,
            'id_did': did_id,
            'voip_call': 1,
            'id_sip': sip_id,
            'destination': f'SIP/{username}',
            'priority': 1
        }
        
        dest_result = self.create_did_destination(destination_data)
        print(f"✅ Created DID destination: SIP/{username}")
        
        # 5. Set caller ID on SIP account
        sip_updates = {
            'callerid': did,
            'allow': 'opus,g729,gsm,alaw,ulaw'
        }
        
        self.update_sip(sip_id, sip_updates)
        print(f"✅ Set caller ID: {did}")
        
        return {
            'success': True,
            'did': did,
            'did_id': did_id,
            'sip_id': sip_id,
            'destination': f'SIP/{username}',
            'message': f'DID {did} provisioned and routed to {username}'
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"DID provisioning failed: {str(e)}"
        }

# ============================================================================
# Complete User Provisioning (Based on PHP workflow)
# ========================================================================
    
def provision_complete_user(
    self,
    firstname: str,
    lastname: str,
    email: str,
    phone: str,
    password: Optional[str] = None,
    prefix: str = '17678180'
) -> Dict:
    """ Replicates the exact working logic of the PHP script """
    """
    Complete user provisioning workflow (like PHP script)
    Creates user, generates DID, creates SIP, sets up routing
    
    Args:
        firstname: First name
        lastname: Last name
        email: Email address
        phone: Phone number
        password: Password (auto-generated if None)
        prefix: DID prefix
        
    Returns:
        Dictionary with:
            - success: Boolean
            - user_id: Magnus user ID
            - username: Generated username
            - did: Generated DID
            - password: Account password
            - error: Error message (if failed)
    """
    try:
        # Generate password if not provided
        if not password:
            import string
            characters = string.ascii_letters + string.digits
            password = ''.join(random.choice(characters) for _ in range(12))
        
        # Generate unique DID
        did = self.generate_unique_did(prefix)
        if not did:
            return {
                'success': False,
                'error': 'Could not generate unique DID'
            }
        
        # Create username
        safe_firstname = firstname.replace(' ', '_')[:8]
        username = f"{safe_firstname}_{did}"
        
        # Check if user exists
        existing_user = self.get_user(username)
        if existing_user:
            return {
                'success': False,
                'error': 'User already exists'
            }
        
        # Create user
        user_data = {
            'username': username,
            'password': password,
            'active': 1,
            'firstname': firstname,
            'lastname': lastname,
            'email': email,
            'typepaid': 0,
            'prefix_local': "*/1767/7,767/1767/10",
            'id_group': 3,
            'id_plan': 34,
            'description': 'EMA_Customer',
            'phone': phone,
            'mobile': phone,
            'id_offer': 7
        }
        
        user_result = self.create_user(user_data)
        
        if not user_result.get('success'):
            return {
                'success': False,
                'error': f"User creation failed: {user_result.get('error', 'Unknown error')}"
            }
        
        user_id = user_result.get('id')
        
        # Create DID
        did_result = self.create_did(did, country='Dominica', activated=1)
        if not did_result.get('success'):
            return {
                'success': False,
                'error': f"DID creation failed: {did_result.get('error', 'Unknown error')}"
            }
        
        did_id = did_result.get('id')
        
        # Get SIP account
        sip = self.get_sip_by_user(user_id)
        if not sip:
            return {
                'success': False,
                'error': 'SIP account not found'
            }
        
        sip_id = sip.get('id')
        
        # Create DID destination
        destination_data = {
            'id_user': user_id,
            'id_did': did_id,
            'voip_call': 1,
            'id_sip': sip_id,
            'destination': f'SIP/{username}',
            'priority': 1
        }
        
        dest_result = self.create_did_destination(destination_data)
        
        # Update SIP settings
        sip_updates = {
            'callerid': did,
            'voicemail': 1,
            'voicemail_email': email,
            'voicemail_password': did[-4:],  # Last 4 digits of DID
            'allow': 'opus,g729,gsm,alaw,ulaw'
        }
        
        self.update_sip(sip_id, sip_updates)
        
        # Create offer use
        offer_data = {
            'id_user': user_id,
            'id_offer': 7,
            'reservationdate': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
            'month_payed': 1,
            'status': 1
        }
        
        self.create_offer_use(offer_data)
        
        return {
            'success': True,
            'user_id': user_id,
            'username': username,
            'did': did,
            'password': password,
            'sip_id': sip_id,
            'email': email
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': f"Provisioning failed: {str(e)}"
        }


if __name__ == '__main__':
    # Test Magnus Billing connection
    client = get_magnus_client()
    
    if client:
        print("✅ Magnus Billing client initialized")
        print(f"   Base URL: {client.base_url}")
        
        # Test DID generation
        did = client.generate_unique_did('17678180')
        if did:
            print(f"✅ Generated test DID: {did}")
        else:
            print("❌ DID generation failed")
    else:
        print("❌ Magnus Billing client not available")
