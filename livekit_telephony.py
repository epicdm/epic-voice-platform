"""
LiveKit SIP Telephony Integration
Manages SIP trunk and dispatch rule creation for phone-to-agent routing
"""

import os
from livekit import api
from livekit.protocol.sip import (
    CreateSIPInboundTrunkRequest,
    CreateSIPOutboundTrunkRequest,
    CreateSIPDispatchRuleRequest,
    ListSIPInboundTrunkRequest,
    ListSIPDispatchRuleRequest,
    DeleteSIPTrunkRequest,
    DeleteSIPDispatchRuleRequest,
    SIPInboundTrunkInfo,
    SIPOutboundTrunkInfo,
    SIPDispatchRuleInfo,
    SIPDispatchRule,
    SIPDispatchRuleIndividual,
)
from livekit.protocol.room import RoomConfiguration, RoomAgent


class LiveKitTelephonyManager:
    """
    Manages LiveKit SIP configuration for voice agent telephony
    """

    def __init__(self):
        """Initialize LiveKit API client"""
        self.livekit_url = os.getenv('LIVEKIT_URL')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            print("⚠️  LiveKit credentials not fully configured")

    async def create_inbound_trunk(self, phone_numbers: list[str], user_id: str = None) -> dict:
        """
        Create SIP Inbound Trunk for receiving calls to phone numbers

        Args:
            phone_numbers: List of phone numbers (e.g., ['+15105550100'])
            user_id: Optional user ID for multi-tenant tracking

        Returns:
            dict: {'success': bool, 'trunk_id': str, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'trunk_id': None,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            # Create trunk name with user context
            trunk_name = f"User {user_id[:8]} Inbound" if user_id else "Inbound Trunk"

            trunk = SIPInboundTrunkInfo(
                name=trunk_name,
                numbers=phone_numbers,
                # Accept calls from anywhere (no IP restrictions)
                allowed_addresses=[],
                # Accept calls from any number
                allowed_numbers=[],
                # Enable Krisp noise cancellation
                krisp_enabled=True,
                # Custom headers for identification
                headers={
                    "X-Platform": "Epic-Voice",
                    "X-User-ID": user_id or "unknown"
                },
                # Map SIP headers to participant attributes
                headers_to_attributes={
                    "X-Customer-ID": "customer_id",
                },
            )

            request = CreateSIPInboundTrunkRequest(trunk=trunk)
            result = await lkapi.sip.create_sip_inbound_trunk(request)

            print(f"✅ Created LiveKit Inbound Trunk: {result.sip_trunk_id}")
            print(f"   Numbers: {result.numbers}")
            print(f"   Krisp Enabled: {result.krisp_enabled}")

            return {
                'success': True,
                'trunk_id': result.sip_trunk_id,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error creating inbound trunk: {e}")
            return {
                'success': False,
                'trunk_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def create_outbound_trunk(
        self,
        username: str,
        password: str,
        sip_domain: str,
        phone_numbers: list[str],
        user_id: str = None,
        port: int = 5060
    ) -> dict:
        """
        Create SIP Outbound Trunk for making calls through Magnus Billing

        Args:
            username: SIP username (e.g., 'Giraud.E_17678189145')
            password: SIP password
            sip_domain: SIP server domain (e.g., 'voice.epic.dm')
            phone_numbers: List of DIDs for caller ID (e.g., ['+17678189145'])
            user_id: Optional user ID for multi-tenant tracking
            port: SIP port (default: 5060)

        Returns:
            dict: {'success': bool, 'trunk_id': str, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'trunk_id': None,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            # Create trunk name with user context
            trunk_name = f"User {user_id[:8]} Outbound - Magnus" if user_id else "Outbound Trunk - Magnus"

            # Full SIP address
            sip_address = f"{sip_domain}:{port}"

            trunk = SIPOutboundTrunkInfo(
                name=trunk_name,
                address=sip_address,
                auth_username=username,
                auth_password=password,
                # Use these DIDs as caller ID for outbound calls
                numbers=phone_numbers,
            )

            request = CreateSIPOutboundTrunkRequest(trunk=trunk)
            result = await lkapi.sip.create_sip_outbound_trunk(request)

            print(f"✅ Created LiveKit Outbound Trunk: {result.sip_trunk_id}")
            print(f"   Address: {sip_address}")
            print(f"   Username: {username}")
            print(f"   Numbers (Caller ID): {result.numbers}")

            return {
                'success': True,
                'trunk_id': result.sip_trunk_id,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error creating outbound trunk: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'trunk_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def create_dispatch_rule(
        self,
        agent_name: str,
        trunk_ids: list[str] = None,
        phone_numbers: list[str] = None,
        user_id: str = None
    ) -> dict:
        """
        Create Dispatch Rule to route incoming calls to AI agents

        Args:
            agent_name: Name of the deployed LiveKit agent
            trunk_ids: Optional list of trunk IDs (empty = all trunks)
            phone_numbers: Optional list of phone numbers for this rule
            user_id: Optional user ID for multi-tenant tracking

        Returns:
            dict: {'success': bool, 'rule_id': str, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'rule_id': None,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            # Create rule name with context
            numbers_str = ", ".join(phone_numbers[:2]) if phone_numbers else "All"
            if phone_numbers and len(phone_numbers) > 2:
                numbers_str += f" +{len(phone_numbers) - 2}"
            rule_name = f"Agent: {agent_name} → {numbers_str}"

            # Create individual dispatch rule (one room per caller)
            # Use unique room prefix per phone number so we can identify which DID was called
            phone_number = phone_numbers[0] if phone_numbers else None
            # Extract digits from phone number for room prefix (remove + and spaces)
            phone_digits = phone_number.replace('+', '').replace('-', '').replace(' ', '') if phone_number else "unknown"
            room_prefix = f"sip-{phone_digits}__"  # e.g., "sip-17678189426__"

            rule = SIPDispatchRule(
                dispatch_rule_individual=SIPDispatchRuleIndividual(
                    room_prefix=room_prefix,  # Rooms: "sip-17678189426__<caller>_<random>"
                )
            )

            # Configure room to automatically dispatch agent
            # ALWAYS use tst0002 physical agent (dynamic routing loads config from DB)
            room_config = RoomConfiguration()
            dispatch = room_config.agents.add()
            dispatch.agent_name = "tst0002"  # Physical agent name (handles all calls)

            # Include phone number in metadata so agent can look up configuration
            phone_number = phone_numbers[0] if phone_numbers else None
            dispatch.metadata = f'{{"source": "inbound_call", "user_id": "{user_id or "unknown"}", "phone_number": "{phone_number or "unknown"}"}}'

            dispatch_info = SIPDispatchRuleInfo(
                rule=rule,
                name=rule_name,
                trunk_ids=trunk_ids or [],  # Empty = match all trunks
                hide_phone_number=False,  # Show phone number in participant identity
                metadata=f'{{"user_id": "{user_id or "unknown"}", "agent": "{agent_name}", "phone_number": "{phone_number or "unknown"}"}}',
                attributes={
                    "call_type": "inbound",
                    "platform": "epic-voice",
                    "user_id": user_id or "unknown",
                },
                room_config=room_config,
            )

            request = CreateSIPDispatchRuleRequest(dispatch_rule=dispatch_info)
            result = await lkapi.sip.create_sip_dispatch_rule(request)

            print(f"✅ Created LiveKit Dispatch Rule: {result.sip_dispatch_rule_id}")
            print(f"   Agent: {agent_name}")
            print(f"   Room Prefix: call-")
            print(f"   Trunk IDs: {result.trunk_ids or 'ALL'}")

            return {
                'success': True,
                'rule_id': result.sip_dispatch_rule_id,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error creating dispatch rule: {e}")
            return {
                'success': False,
                'rule_id': None,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def list_inbound_trunks(self) -> dict:
        """
        List all SIP inbound trunks

        Returns:
            dict: {'success': bool, 'trunks': list, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'trunks': [],
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            request = ListSIPInboundTrunkRequest()
            result = await lkapi.sip.list_sip_inbound_trunk(request)

            trunks = []
            for trunk in result.items:
                trunks.append({
                    'trunk_id': trunk.sip_trunk_id,
                    'name': trunk.name,
                    'numbers': trunk.numbers,
                    'krisp_enabled': trunk.krisp_enabled
                })

            return {
                'success': True,
                'trunks': trunks,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error listing inbound trunks: {e}")
            return {
                'success': False,
                'trunks': [],
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def list_dispatch_rules(self) -> dict:
        """
        List all SIP dispatch rules

        Returns:
            dict: {'success': bool, 'rules': list, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'rules': [],
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            request = ListSIPDispatchRuleRequest()
            result = await lkapi.sip.list_sip_dispatch_rule(request)

            rules = []
            for rule in result.items:
                rules.append({
                    'rule_id': rule.sip_dispatch_rule_id,
                    'name': rule.name,
                    'trunk_ids': rule.trunk_ids
                })

            return {
                'success': True,
                'rules': rules,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error listing dispatch rules: {e}")
            return {
                'success': False,
                'rules': [],
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def find_dispatch_rules_for_phone(self, phone_number: str, trunk_id: str = None) -> dict:
        """
        Find dispatch rules for a specific phone number

        Args:
            phone_number: Phone number to search for
            trunk_id: Optional trunk ID to narrow search

        Returns:
            dict: {'success': bool, 'rules': list[str], 'error': str}
        """
        rules_result = await self.list_dispatch_rules()
        if not rules_result['success']:
            return rules_result

        matching_rules = []
        for rule in rules_result['rules']:
            # Match by phone number in name or trunk ID
            if phone_number in rule['name']:
                matching_rules.append(rule['rule_id'])
            elif trunk_id and trunk_id in rule.get('trunk_ids', []):
                matching_rules.append(rule['rule_id'])

        return {
            'success': True,
            'rules': matching_rules,
            'error': None
        }

    async def delete_inbound_trunk(self, trunk_id: str) -> dict:
        """
        Delete SIP inbound trunk

        Args:
            trunk_id: LiveKit trunk ID to delete

        Returns:
            dict: {'success': bool, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            request = DeleteSIPTrunkRequest(sip_trunk_id=trunk_id)
            await lkapi.sip.delete_sip_trunk(request)

            print(f"✅ Deleted LiveKit Inbound Trunk: {trunk_id}")

            return {
                'success': True,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error deleting inbound trunk: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def delete_dispatch_rule(self, rule_id: str) -> dict:
        """
        Delete SIP dispatch rule

        Args:
            rule_id: LiveKit rule ID to delete

        Returns:
            dict: {'success': bool, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            request = DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=rule_id)
            await lkapi.sip.delete_sip_dispatch_rule(request)

            print(f"✅ Deleted LiveKit Dispatch Rule: {rule_id}")

            return {
                'success': True,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error deleting dispatch rule: {e}")
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()

    async def create_outbound_call(
        self,
        from_number: str,
        to_number: str,
        trunk_id: str,
        agent_name: str = None,
        agent_config_id: str = None
    ) -> dict:
        """
        Create an outbound call from a phone number to a destination

        Args:
            from_number: The phone number making the call (caller ID)
            to_number: The destination phone number
            trunk_id: LiveKit outbound trunk ID
            agent_name: Agent name to handle the call (always "tst0002")
            agent_config_id: Agent configuration ID from database for dynamic routing

        Returns:
            dict: {'success': bool, 'room_name': str, 'call_id': str, 'error': str}
        """
        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            return {
                'success': False,
                'error': 'LiveKit credentials not configured'
            }

        lkapi = api.LiveKitAPI()

        try:
            from livekit.protocol.sip import CreateSIPParticipantRequest
            import json

            # DEBUG: Log what parameters we received - write to file
            with open('/tmp/livekit_debug.log', 'a') as f:
                f.write(f"\n=== create_outbound_call ===\n")
                f.write(f"from_number={from_number}\n")
                f.write(f"to_number={to_number}\n")
                f.write(f"agent_name={agent_name}\n")
                f.write(f"agent_config_id={agent_config_id}\n")

            print(f"🔧 DEBUG create_outbound_call called with:")
            print(f"   from_number={from_number}")
            print(f"   to_number={to_number}")
            print(f"   agent_name={agent_name}")
            print(f"   agent_config_id={agent_config_id}")

            # Create unique room name for this call
            # Encode agent_config_id in room name for dynamic routing (SIP dispatch rules prevent metadata propagation)
            import uuid
            call_id = str(uuid.uuid4())[:8]
            if agent_config_id:
                # Include agent_config_id in room name so agent can parse it
                room_name = f"outbound-{call_id}-{agent_config_id}"
            else:
                room_name = f"outbound-{call_id}"

            # Create the room first (without automatic agent dispatch)
            from livekit.protocol.room import CreateRoomRequest
            from livekit.protocol.agent_dispatch import CreateAgentDispatchRequest

            # Create room without metadata (metadata goes to agent dispatch instead)
            room_request = CreateRoomRequest(name=room_name)
            room = await lkapi.room.create_room(room_request)
            print(f"✅ Created room: {room_name}")

            # If agent specified, create explicit agent dispatch with metadata
            if agent_name:
                # Prepare dispatch metadata with agent_config_id
                metadata = {}
                if agent_config_id:
                    metadata['agent_config_id'] = agent_config_id
                    print(f"📋 Adding agent_config_id to dispatch metadata: {agent_config_id}")

                metadata_str = json.dumps(metadata) if metadata else ""

                with open('/tmp/livekit_debug.log', 'a') as f:
                    f.write(f"metadata dict: {metadata}\n")
                    f.write(f"metadata JSON string: {metadata_str}\n")
                    f.write(f"Creating agent dispatch with metadata\n")

                # Create explicit agent dispatch (this passes metadata to JobContext!)
                dispatch_request = CreateAgentDispatchRequest(
                    agent_name=agent_name,
                    room=room_name,
                    metadata=metadata_str
                )

                dispatch_result = await lkapi.agent_dispatch.create_dispatch(dispatch_request)
                print(f"✅ Created agent dispatch: {agent_name} with metadata")

                with open('/tmp/livekit_debug.log', 'a') as f:
                    f.write(f"Dispatch created: {dispatch_result}\n")

            # Create SIP participant (places the call)
            sip_request = CreateSIPParticipantRequest(
                sip_trunk_id=trunk_id,
                sip_call_to=to_number,  # Destination number
                sip_number=from_number,  # Caller ID - which number to call FROM
                room_name=room_name,
                participant_identity=f"caller-{call_id}",
                participant_name=f"Outbound Call to {to_number}",
                play_ringtone=True  # Play ringtone while connecting
            )

            sip_participant = await lkapi.sip.create_sip_participant(sip_request)

            print(f"✅ Outbound call initiated:")
            print(f"   Trunk ID: {trunk_id}")
            print(f"   From: {from_number}")
            print(f"   To: {to_number}")
            print(f"   Room: {room_name}")
            print(f"   Participant: {sip_participant.participant_id}")

            return {
                'success': True,
                'room_name': room_name,
                'call_id': call_id,
                'participant_id': sip_participant.participant_id,
                'error': None
            }

        except Exception as e:
            print(f"❌ Error creating outbound call: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': str(e)
            }
        finally:
            await lkapi.aclose()


# Singleton instance
telephony_manager = LiveKitTelephonyManager()
