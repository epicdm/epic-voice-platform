import requests
import random
import json
from typing import Dict, Optional, Any, List
from datetime import datetime
import urllib3

# Disable SSL warnings for self-signed certificates
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class MagnusBillingClientNew:
    def __init__(self, api_key: str, secret_key: str, base_url: str):
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.verify = False  # Disable SSL verification

    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, is_special: bool = False) -> Dict:
        # For special endpoints like createUser, the URL is just /index.php
        if is_special:
            url = f"{self.base_url}/index.php"
        else:
            # For normal endpoints: /index.php/{module}/{action}
            url = f"{self.base_url}/index.php/{endpoint}"
        
        # Magnus Billing uses custom Key/Sign authentication (not HTTP Basic Auth)
        import hmac
        import hashlib
        import time
        from urllib.parse import urlencode
        
        # Prepare request data
        if data is None:
            data = {}
        
        # Add nonce (like PHP library does)
        mt = str(time.time()).split('.')
        nonce = mt[0] + mt[1][:6]
        data['nonce'] = nonce
        
        # Generate POST data string (URL-encoded)
        post_data = urlencode(data)
        
        # Generate HMAC-SHA512 signature
        sign = hmac.new(
            self.secret_key.encode('utf-8'),
            post_data.encode('utf-8'),
            hashlib.sha512
        ).hexdigest()
        
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Key': self.api_key,
            'Sign': sign,
            'User-Agent': 'Python MagnusBilling Client'
        }
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, headers=headers, data=post_data)
            elif method == 'PUT':
                response = self.session.put(url, headers=headers, data=post_data)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            response.raise_for_status()
            try:
                return response.json()
            except json.JSONDecodeError:
                return {'success': True, 'data': response.text}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}

    def get_id(self, module: str, field: str, value: str) -> Optional[str]:
        # Use the read API with filter (matching PHP setFilter format)
        filter_obj = [{
            'type': 'string',
            'field': field,
            'value': value,
            'comparison': 'eq'
        }]
        read_data = {
            'module': module,
            'action': 'read',
            'page': 1,
            'start': 0,
            'limit': 25,
            'filter': json.dumps(filter_obj)
        }
        response = self._make_request('POST', f'{module}/read', read_data)
        print(f"🔍 GET_ID query: {module} where {field}={value}")
        print(f"   Response: {response}")
        if response.get('rows'):
            found_id = response['rows'][0].get('id')
            print(f"   Found ID: {found_id}")
            return found_id
        print(f"   No rows found in response")
        return None

    def create(self, module: str, data: Dict) -> Dict:
        # Add module and action parameters for generic create
        data['module'] = module
        data['action'] = 'save'
        data['id'] = 0
        create_response = self._make_request('POST', f'{module}/save', data)
        print(f"📝 CREATE {module} response: {create_response}")
        
        # Check if the ID is already in the response
        if create_response.get('id'):
            print(f"✅ ID found directly in create response: {create_response.get('id')}")
            return {'success': True, 'id': create_response.get('id')}
        
        # Check if ID is in rows structure (for DIDs and other resources)
        if create_response.get('rows') and len(create_response['rows']) > 0:
            row_id = create_response['rows'][0].get('id')
            if row_id:
                print(f"✅ ID found in rows[0]: {row_id}")
                return {'success': True, 'id': row_id}
        
        if not create_response.get('success'):
            print(f"❌ Create failed: {create_response}")
            return create_response
        
        # The create response doesn't contain the ID, so we must fetch it.
        # We assume the 'username' or 'did' is unique and can be used to fetch the record.
        identifier_field = 'username' if module == 'user' else 'did'
        identifier_value = data.get(identifier_field)
        
        if not identifier_value:
            return {'success': False, 'error': f'No unique identifier ({identifier_field}) found to fetch created record.'}

        print(f"🔍 Attempting to retrieve ID for {module} with {identifier_field}={identifier_value}")
        
        # Retry fetching the ID a few times to handle database delays
        new_record_id = None
        for i in range(5):
            import time
            time.sleep(i + 1) # Exponential backoff
            print(f"   Attempt {i+1}/5...")
            new_record_id = self.get_id(module, identifier_field, identifier_value)
            if new_record_id:
                print(f"✅ Found ID on attempt {i+1}: {new_record_id}")
                break
        
        if not new_record_id:
            print(f"❌ Failed to retrieve ID after 5 attempts")
            # Try to extract ID from the original create_response data if available
            if create_response.get('data') and isinstance(create_response['data'], dict):
                data_id = create_response['data'].get('id')
                if data_id:
                    print(f"✅ Found ID in create_response data: {data_id}")
                    return {'success': True, 'id': data_id}
            return {'success': False, 'error': f'Failed to retrieve ID for new {module} with {identifier_field} {identifier_value}'}

        return {'success': True, 'id': new_record_id}

    def update(self, module: str, record_id: str, data: Dict) -> Dict:
        # Magnus API requires module, action, and id in the data for updates
        # NOTE: Magnus API uses POST for saves, not PUT!
        data['module'] = module
        data['action'] = 'save'
        data['id'] = record_id
        return self._make_request('POST', f'{module}/save', data)

    def delete(self, module: str, record_id: str) -> Dict:
        """Delete a record from Magnus Billing using the destroy action"""
        data = {
            'module': module,
            'action': 'destroy',
            'id': record_id
        }
        try:
            result = self._make_request('POST', f'{module}/destroy', data)
            print(f"🗑️  DELETE {module} ID {record_id} response: {result}")
            return {'success': True, 'result': result}
        except Exception as e:
            print(f"❌ Error deleting {module} ID {record_id}: {e}")
            return {'success': False, 'error': str(e)}

    def delete_did(self, did_id: str, phone_number: str) -> Dict:
        """
        Delete a DID and its associated resources from Magnus Billing

        Args:
            did_id: The Magnus DID ID
            phone_number: The phone number (with +) to find associated resources

        Returns:
            dict: {'success': bool, 'deleted': list, 'errors': list}
        """
        deleted = []
        errors = []

        try:
            # Clean phone number for SIP username lookup
            clean_number = phone_number.replace('+', '')
            sip_username = phone_number  # SIP username is the phone number with +

            # 1. Delete DID destination first (foreign key dependency)
            print(f"🔍 Looking for DID destination for DID ID: {did_id}")
            diddest_id = self.get_id('diddestination', 'id_did', did_id)
            if diddest_id:
                print(f"🗑️  Deleting DID destination ID: {diddest_id}")
                result = self.delete('diddestination', diddest_id)
                if result.get('success'):
                    deleted.append(f'diddestination:{diddest_id}')
                else:
                    errors.append(f'diddestination:{diddest_id} - {result.get("error")}')

            # 2. Delete the DID itself
            print(f"🗑️  Deleting DID ID: {did_id}")
            result = self.delete('did', did_id)
            if result.get('success'):
                deleted.append(f'did:{did_id}')
            else:
                errors.append(f'did:{did_id} - {result.get("error")}')

            # 3. Optionally delete the SIP account (only if it was created for this DID)
            # SIP accounts may be shared, so we only delete if the name matches the phone number
            print(f"🔍 Looking for SIP account with name: {sip_username}")
            sip_id = self.get_id('sip', 'name', sip_username)
            if sip_id:
                print(f"🗑️  Deleting SIP account ID: {sip_id}")
                result = self.delete('sip', sip_id)
                if result.get('success'):
                    deleted.append(f'sip:{sip_id}')
                else:
                    errors.append(f'sip:{sip_id} - {result.get("error")}')

            return {
                'success': len(errors) == 0,
                'deleted': deleted,
                'errors': errors,
                'message': f'Deleted {len(deleted)} resources' + (f', {len(errors)} errors' if errors else '')
            }

        except Exception as e:
            print(f"❌ Error deleting DID {did_id}: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'deleted': deleted,
                'errors': errors + [str(e)],
                'message': f'Error during deletion: {str(e)}'
            }

    def create_user_special(self, user_data: Dict) -> Dict:
        """Create user using the special createUser endpoint (like PHP createUser function)"""
        user_data['createUser'] = 1
        user_data['id'] = 0
        print(f"🔧 Creating user with special createUser endpoint")
        print(f"   Data: {user_data}")
        result = self._make_request('POST', '', user_data, is_special=True)
        print(f"   Result: {result}")
        
        # Extract ID from the nested data structure
        if result.get('success') and result.get('data'):
            user_id = result['data'].get('id')
            if user_id:
                result['id'] = user_id
                print(f"✅ Extracted user ID: {user_id}")
        
        return result

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Check if user already exists in Magnus by email"""
        filter_obj = [{
            'type': 'string',
            'field': 'email',
            'value': email,
            'comparison': 'eq'
        }]
        read_data = {
            'module': 'user',
            'action': 'read',
            'page': 1,
            'start': 0,
            'limit': 1,
            'filter': json.dumps(filter_obj)
        }
        response = self._make_request('POST', 'user/read', read_data)
        if response.get('rows') and len(response['rows']) > 0:
            return response['rows'][0]
        return None

    def get_sip_credentials(self, sip_id: str) -> Optional[Dict]:
        """Get SIP account credentials by SIP ID"""
        filter_obj = [{
            'type': 'string',
            'field': 'id',
            'value': sip_id,
            'comparison': 'eq'
        }]
        read_data = {
            'module': 'sip',
            'action': 'read',
            'page': 1,
            'start': 0,
            'limit': 1,
            'filter': json.dumps(filter_obj)
        }
        response = self._make_request('POST', 'sip/read', read_data)
        if response.get('rows') and len(response['rows']) > 0:
            sip_data = response['rows'][0]
            return {
                'username': sip_data.get('name'),
                'password': sip_data.get('secret'),
                'callerid': sip_data.get('callerid')
            }
        return None

    def update_sip_for_livekit(
        self,
        sip_id: str,
        phone_number: str,
        password: str,
        livekit_sip_domain: str
    ) -> Dict:
        """
        Update SIP account to work with LiveKit
        Sets all required fields for bidirectional calling
        """
        try:
            # Remove + from phone number for SIP fields
            clean_number = phone_number.replace('+', '')

            # Update SIP account with LiveKit-specific configuration
            # Match the working example (17678183366) exactly
            sip_data = {
                # Authentication
                'defaultuser': phone_number,  # +17678189676
                'fromuser': '',  # Empty like working example
                'callerid': clean_number,  # 17678189676 (no angle brackets, no +)
                # LiveKit host configuration
                'host': livekit_sip_domain,  # 3m4yki5jezn.sip.livekit.cloud
                'fromdomain': '',  # Empty like working example
                # Security and transport
                'insecure': 'no',  # Match working example
                'type': 'friend',
                'permit': '',  # Empty like working example
                # Context
                'context': 'billing',
                # Codec support (keep the same)
                'allow': 'alaw,ulaw,g722',  # Match working example codecs
            }

            # Use the existing update method (which uses PUT)
            result = self.update('sip', sip_id, sip_data)

            if result.get('success'):
                print(f"✅ Updated SIP account for LiveKit:")
                print(f"   SIP ID: {sip_id}")
                print(f"   Host: {livekit_sip_domain}")
                print(f"   Callerid: {clean_number}")
                return {'success': True}
            else:
                print(f"⚠️  SIP update result: {result}")
                return {'success': False, 'error': result.get('error', 'Update failed')}

        except Exception as e:
            print(f"❌ Error updating SIP for LiveKit: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def update_did_destination(self, did_id: str, livekit_sip_uri: str) -> Dict:
        """Update DID destination to route to LiveKit instead of Magnus SIP user"""
        try:
            # Get the existing DID destination
            filter_obj = [{
                'type': 'string',
                'field': 'id_did',
                'value': did_id,
                'comparison': 'eq'
            }]
            read_data = {
                'module': 'diddestination',
                'action': 'read',
                'page': 1,
                'start': 0,
                'limit': 1,
                'filter': json.dumps(filter_obj)
            }
            response = self._make_request('POST', 'diddestination/read', read_data)

            if not response.get('rows') or len(response['rows']) == 0:
                return {'success': False, 'error': 'DID destination not found'}

            did_dest = response['rows'][0]
            did_dest_id = did_dest.get('id')

            # Update destination to point to LiveKit
            update_data = {
                'module': 'diddestination',
                'action': 'save',
                'id': did_dest_id,
                'destination': livekit_sip_uri,
                'voip_call': 9  # Match working example (was 1)
            }

            result = self._make_request('POST', 'diddestination/save', update_data)

            if result.get('success'):
                print(f"✅ Updated DID destination to LiveKit: {livekit_sip_uri}")
                return {'success': True}
            else:
                return {'success': False, 'error': result.get('error', 'Update failed')}

        except Exception as e:
            print(f"❌ Error updating DID destination: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def provision_did_for_existing_user(self, user_id: str, username: str, email: str) -> Dict:
        """Provision a new DID for an existing Magnus user - creates NEW SIP account for each phone number"""
        try:
            # 1. Generate DID
            did = None
            for _ in range(100):
                random_number = random.randint(9000, 9999)
                temp_did = f"1767818{random_number}"
                if not self.get_id('did', 'did', temp_did):
                    did = temp_did
                    break
            if not did:
                return {'success': False, 'error': 'Could not generate unique DID'}

            # 2. Generate password for NEW SIP account
            import string
            characters = string.ascii_letters + string.digits
            sip_password = ''.join(random.choice(characters) for _ in range(12))

            # 3. Generate SIP username based on phone number
            phone_number = f"+{did}"
            sip_username = phone_number  # Use phone number as SIP username

            print(f"🔧 Creating NEW SIP account for existing user:")
            print(f"   User ID: {user_id}")
            print(f"   DID: {did}")
            print(f"   SIP Username: {sip_username}")

            # Build Asterisk extra config for LiveKit SIP trunk
            livekit_sip_domain = "3m4yki5jezn.sip.livekit.cloud"
            clean_number = str(did)  # DID without + prefix

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

            # 4. Create NEW SIP account for this phone number
            sip_data = {
                'id_user': user_id,
                'name': sip_username,
                'accountcode': sip_username,
                'secret': sip_password,
                'defaultuser': sip_username,
                'callerid': did,
                'host': 'dynamic',
                'type': 'friend',
                'context': 'billing',
                'allow': 'opus,g729,gsm,alaw,ulaw',
                'nat': 'force_rport,comedia',
                'qualify': 'yes',
                'dtmfmode': 'RFC2833',
                'directmedia': 'no',
                'allowtransfer': 'no',
                'insecure': 'no',
                'transport': 'tcp',
                'sip_config': sip_config  # ✅ Asterisk extra config for LiveKit
            }

            sip_result = self.create('sip', sip_data)
            if not sip_result.get('success'):
                return {'success': False, 'error': f"SIP creation failed: {sip_result.get('error', 'Unknown error')}"}

            # Get the ID of the newly created SIP account
            id_sip = sip_result.get('id')
            if not id_sip:
                # Try to retrieve it
                id_sip = self.get_id('sip', 'name', sip_username)
            if not id_sip:
                return {'success': False, 'error': 'Failed to retrieve ID for newly created SIP account'}

            print(f"✅ Created SIP account:")
            print(f"   SIP ID: {id_sip}")
            print(f"   SIP Username: {sip_username}")

            # 5. Create DID
            did_data = {'did': did, 'country': 'Dominica', 'activated': 1}
            did_result = self.create('did', did_data)
            if not did_result.get('success'):
                return {'success': False, 'error': f"DID creation failed: {did_result.get('error', 'Unknown error')}"}
            id_did = self.get_id('did', 'did', did)

            # 6. Create DID Destination pointing to NEW SIP account
            # Match working example exactly
            dest_data = {
                'id_user': user_id,
                'id_did': id_did,
                'voip_call': 9,  # Match working example (was 1)
                'id_sip': id_sip,
                'destination': f'SIP/{sip_username}',  # Route to new SIP account
                'context': '',  # Empty string like working example (not None)
                'priority': 1
            }
            self.create('diddestination', dest_data)

            print(f"✅ DID provisioned for existing user:")
            print(f"   DID: {did}")
            print(f"   User ID: {user_id}")
            print(f"   SIP ID: {id_sip}")
            print(f"   SIP Username: {sip_username}")

            return {
                'success': True,
                'did': did,
                'username': sip_username,
                'password': sip_password,
                'did_id': id_did,
                'sip_id': id_sip,
                'sip_domain': self.base_url.replace('https://', '').replace('http://', '').split('/')[0],
                'sip_port': 5060,
                'destination': f'SIP/{sip_username}'
            }

        except Exception as e:
            print(f"❌ Error provisioning DID for existing user: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def provision_like_php(
        self,
        firstname: str,
        lastname: str,
        email: str,
        phone: str,
        password: Optional[str] = None
    ) -> Dict:
        try:
            # 1. Generate DID
            did = None
            for _ in range(100):
                random_number = random.randint(9000, 9999)
                temp_did = f"1767818{random_number}"
                if not self.get_id('did', 'did', temp_did):
                    did = temp_did
                    break
            if not did:
                return {'success': False, 'error': 'Could not generate unique DID'}

            # 2. Generate Password
            if not password:
                import string
                characters = string.ascii_letters + string.digits
                password = ''.join(random.choice(characters) for _ in range(12))

            # 3. Create User
            trimmed_firstname = firstname.replace(' ', '_')[:8]
            username = f"{trimmed_firstname}_{did}"
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
            user_result = self.create_user_special(user_data)
            if not user_result.get('success'):
                return {'success': False, 'error': f"User creation failed: {user_result.get('error', 'Unknown error')}"}

            # Try to get ID from response first
            id_user = user_result.get('id')
            if not id_user:
                id_user = self.get_id('user', 'username', username)
            if not id_user:
                return {'success': False, 'error': 'Failed to retrieve ID for newly created user'}

            # 4. Create DID
            did_data = {'did': did, 'country': 'Dominica', 'activated': 1}
            did_result = self.create('did', did_data)
            if not did_result.get('success'):
                return {'success': False, 'error': f"DID creation failed: {did_result.get('error', 'Unknown error')}"}
            id_did = self.get_id('did', 'did', did)

            # 5. Get SIP ID
            id_sip = self.get_id('sip', 'id_user', id_user)
            if not id_sip:
                return {'success': False, 'error': 'SIP account not found after user creation'}

            # 6. Create DID Destination
            dest_data = {
                'id_user': id_user,
                'id_did': id_did,
                'voip_call': 1,
                'id_sip': id_sip,
                'destination': f'SIP/{username}',
                'priority': 1
            }
            self.create('diddestination', dest_data)

            # 7. Update SIP with Asterisk extra config
            # Build Asterisk extra config for LiveKit SIP trunk
            livekit_sip_domain = "3m4yki5jezn.sip.livekit.cloud"
            clean_number = str(did)  # DID without + prefix
            sip_password = password  # Use the same password created for the user

            sip_config = f"""insecure=port,invite
type=friend
fromdomain={livekit_sip_domain}
defaultuser={username}
authuser={username}
secret={sip_password}
fromuser={username}
context=billing
callerid=<{clean_number}>
transport=tcp
port=5060
permit=0.0.0.0/0.0.0.0"""

            sip_updates = {
                'callerid': did,
                'voicemail': '1',
                'voicemail_email': email,
                'voicemail_password': did[-4:],
                'allow': 'opus,g729,gsm,alaw,ulaw',
                'sip_config': sip_config  # ✅ Asterisk extra config for LiveKit
            }
            self.update('sip', id_sip, sip_updates)

            # 8. Create Offer Use
            offer_data = {
                'id_user': id_user,
                'id_offer': 7,
                'reservationdate': datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                'month_payed': 1,
                'status': 1
            }
            self.create('offerUse', offer_data)

            return {
                'success': True,
                'did': did,
                'username': username,
                'password': password,
                'sip_id': id_sip,
                'sip_domain': self.base_url.replace('https://', '').replace('http://', '').split('/')[0],
                'sip_port': 5060
            }

        except Exception as e:
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def get_sip_registration_status(self, sip_id: str = None, sip_name: str = None) -> Dict:
        """
        Check SIP registration status from Magnus Billing
        Returns registration status, IP address, port, last seen time, and latency

        Args:
            sip_id: Magnus SIP account ID
            sip_name: SIP username (e.g., "+17678189267")

        Returns:
            {
                'success': True,
                'registered': True/False,
                'ip_address': '1.2.3.4',
                'port': 5060,
                'last_seen': '2025-11-20 17:30:45',
                'latency_ms': 50,
                'user_agent': 'LiveKit SIP',
                'expires': 3600
            }
        """
        try:
            # WORKAROUND: Magnus /sip/read filter is broken (returns wrong account)
            # Use get_id() instead which works correctly and returns full data
            sip_account = None

            if sip_name:
                # Use get_id() which actually works (unlike /sip/read filter)
                # This returns the full SIP account data including registration
                read_data = {
                    'module': 'sip',
                    'action': 'read',
                    'page': 1,
                    'start': 0,
                    'limit': 25,
                    'filter': json.dumps([{
                        'type': 'string',
                        'field': 'name',
                        'value': sip_name,
                        'comparison': 'eq'
                    }])
                }
                response = self._make_request('POST', 'sip/read', read_data)

                if response.get('rows') and len(response['rows']) > 0:
                    sip_account = response['rows'][0]
            elif sip_id:
                # Query by ID
                filter_data = [{'field': 'id', 'value': sip_id, 'operator': 'eq'}]
                read_data = {
                    'module': 'sip',
                    'action': 'read',
                    'page': 1,
                    'start': 0,
                    'limit': 1,
                    'filter': json.dumps(filter_data)
                }
                response = self._make_request('POST', 'sip/read', read_data)

                if response.get('rows') and len(response['rows']) > 0:
                    sip_account = response['rows'][0]
            else:
                return {'success': False, 'error': 'Either sip_id or sip_name must be provided'}

            if not sip_account:
                return {'success': False, 'error': 'SIP account not found'}
            
            # Check registration fields
            # Magnus Billing stores registration info in these fields:
            # - ipaddr: IP address of registered peer
            # - port: Port number
            # - regseconds: Unix timestamp of registration
            # - lastms: Last response time in milliseconds (latency)
            # - useragent: SIP User-Agent header
            # - regserver: Registration server
            
            ipaddr = sip_account.get('ipaddr', '')
            port = sip_account.get('port', '')
            regseconds = sip_account.get('regseconds', '')
            lastms = sip_account.get('lastms', '')
            useragent = sip_account.get('useragent', '')
            line_status = sip_account.get('lineStatus', '')

            # Determine if registered/reachable
            # For IP-authenticated peers (like LiveKit with host=domain):
            #   - ipaddr will be null (no REGISTER)
            #   - lineStatus shows qualify result: "OK (67 ms)" or "UNREACHABLE"
            # For traditional registration:
            #   - ipaddr shows registered IP

            # Check lineStatus first (works for both IP auth and traditional)
            if line_status and 'OK' in line_status:
                is_registered = True
                # Parse latency from lineStatus: "OK (67 ms) localhost"
                import re
                match = re.search(r'OK \((\d+) ms\)', line_status)
                if match and not lastms:
                    lastms = match.group(1)
            # Fallback to ipaddr check (traditional registration)
            elif ipaddr and ipaddr not in ['', '(null)', 'NULL', '0.0.0.0']:
                is_registered = True
            else:
                is_registered = False
            
            # Calculate last seen time
            last_seen = None
            if regseconds and str(regseconds).isdigit() and int(regseconds) > 0:
                try:
                    last_seen = datetime.fromtimestamp(int(regseconds)).strftime('%Y-%m-%d %H:%M:%S')
                except:
                    pass

            # For IP-authenticated peers, if lineStatus shows OK, peer is reachable NOW
            if not last_seen and line_status and 'OK' in line_status:
                last_seen = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Parse latency
            latency_ms = None
            if lastms and str(lastms).isdigit():
                latency_ms = int(lastms)
            
            return {
                'success': True,
                'registered': is_registered,
                'ip_address': ipaddr if ipaddr else None,
                'port': int(port) if port and str(port).isdigit() else None,
                'last_seen': last_seen if last_seen else None,
                'latency_ms': latency_ms,
                'user_agent': useragent if useragent else None,
                'sip_name': sip_account.get('name'),
                'sip_id': sip_account.get('id'),
                'callerid': sip_account.get('callerid'),
                'line_status': line_status,  # Include for debugging
                'auth_type': 'ip' if (line_status and 'OK' in line_status and not ipaddr) else 'register'
            }
            
        except Exception as e:
            print(f"❌ Error checking SIP registration status: {e}")
            import traceback
            traceback.print_exc()
            return {'success': False, 'error': str(e)}

    def get_bulk_sip_status(self, sip_names: List[str]) -> Dict[str, Dict]:
        """
        Check registration status for multiple SIP accounts at once
        
        Args:
            sip_names: List of SIP usernames (e.g., ["+17678189267", "+17678189268"])
        
        Returns:
            {
                "+17678189267": {'registered': True, 'ip_address': '1.2.3.4', ...},
                "+17678189268": {'registered': False, ...}
            }
        """
        results = {}
        
        for sip_name in sip_names:
            status = self.get_sip_registration_status(sip_name=sip_name)
            if status.get('success'):
                results[sip_name] = status
            else:
                results[sip_name] = {
                    'success': False,
                    'registered': False,
                    'error': status.get('error')
                }
        
        return results
