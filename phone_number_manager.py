"""
Phone Number Management System
Handles phone number inventory, assignment, and routing with multi-tenant isolation
"""

import os
import uuid
import random
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from database import Base, SessionLocal

# ============================================================================
# Database Models
# ============================================================================

class PhoneNumberPool(Base):
    """
    Phone number inventory - available numbers that can be assigned
    """
    __tablename__ = 'phone_number_pool'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column('phoneNumber', String(20), unique=True, nullable=False, index=True)
    country_code = Column('countryCode', String(5), default='+1')
    country = Column(String(50), default='US')
    provider = Column(String(50), default='magnus')  # magnus, telnyx, twilio, etc.
    provider_id = Column('providerId', String(100))  # Provider's ID for this number
    
    # Status tracking
    status = Column(String(20), default='available')  # available, assigned, reserved, suspended
    assigned_to_user_id = Column('assignedToUserId', String(36))  # Which user owns this number
    assigned_to_agent_id = Column('assignedToAgentId', String(36))  # Which agent is using it
    assigned_at = Column('assignedAt', DateTime)
    
    # Number capabilities
    can_receive_calls = Column('canReceiveCalls', Boolean, default=True)
    can_send_calls = Column('canSendCalls', Boolean, default=True)
    can_receive_sms = Column('canReceiveSms', Boolean, default=False)
    can_send_sms = Column('canSendSms', Boolean, default=False)
    
    # LiveKit SIP Trunk IDs
    livekit_inbound_trunk_id = Column('livekitInboundTrunkId', String(100))  # LiveKit inbound trunk
    livekit_outbound_trunk_id = Column('livekitOutboundTrunkId', String(100))  # LiveKit outbound trunk

    # Magnus Billing SIP Credentials
    magnus_sip_username = Column('magnusSipUsername', String(100))  # SIP username
    magnus_sip_password = Column('magnusSipPassword', String(100))  # SIP password
    magnus_sip_domain = Column('magnusSipDomain', String(100))  # SIP domain
    magnus_did_id = Column('magnusDidId', String(36))  # Magnus DID ID

    # FusionPBX/FreeSWITCH SIP Credentials
    fusionpbx_extension_uuid = Column('fusionpbx_extension_uuid', String(36))  # FusionPBX extension UUID
    fusionpbx_did_uuid = Column('fusionpbx_did_uuid', String(36))  # FusionPBX DID UUID
    fusionpbx_agent_uuid = Column('fusionpbx_agent_uuid', String(36))  # FusionPBX agent UUID
    fusionpbx_user_email = Column('fusionpbx_user_email', String(255))  # FusionPBX user email
    sip_username = Column('sip_username', String(50))  # SIP username (extension)
    sip_password = Column('sip_password', String(255))  # SIP password
    sip_domain = Column('sip_domain', String(255))  # SIP domain
    sip_server = Column('sip_server', String(255))  # SIP server address

    # Metadata
    purchase_date = Column('purchaseDate', DateTime, default=datetime.utcnow)
    monthly_cost = Column('monthlyCost', Integer, default=0)  # in cents
    notes = Column(Text)
    created_at = Column('createdAt', DateTime, default=datetime.utcnow)
    updated_at = Column('updatedAt', DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    __table_args__ = (
        Index('idx_phone_status', 'status'),
        Index('idx_phone_user', 'assignedToUserId'),
    )


class PhoneNumberHistory(Base):
    """
    Track all phone number assignments and changes
    """
    __tablename__ = 'phone_number_history'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column('phoneNumber', String(20), nullable=False, index=True)
    user_id = Column('userId', String(36))
    agent_id = Column('agentId', String(36))
    action = Column(String(50))  # assigned, unassigned, suspended, activated
    previous_status = Column('previousStatus', String(20))
    new_status = Column('newStatus', String(20))
    performed_by = Column('performedBy', String(36))  # admin user id
    notes = Column(Text)
    created_at = Column('createdAt', DateTime, default=datetime.utcnow)


# ============================================================================
# Phone Number Manager
# ============================================================================

class PhoneNumberManager:
    """
    Manages phone number lifecycle and assignment
    """
    
    def __init__(self, magnus_api_key=None, magnus_secret=None, magnus_url=None):
        """Initialize with optional Magnus Billing credentials"""
        self.magnus_api_key = magnus_api_key
        self.magnus_secret = magnus_secret
        self.magnus_url = magnus_url
        self.magnus_client = None
        
        # Try to initialize Magnus client
        if not all([magnus_api_key, magnus_secret, magnus_url]):
            import os
            magnus_api_key = os.getenv('MAGNUS_API_KEY')
            magnus_secret = os.getenv('MAGNUS_SECRET_KEY')
            magnus_url = os.getenv('MAGNUS_BASE_URL')
        
        if all([magnus_api_key, magnus_secret, magnus_url]):
            try:
                from magnus_billing_client_new import MagnusBillingClientNew as MagnusBillingClient
                self.magnus_client = MagnusBillingClient(
                    magnus_api_key, 
                    magnus_secret, 
                    magnus_url
                )
                print("✅ Magnus Billing integration enabled")
            except Exception as e:
                print(f"⚠️  Magnus Billing integration not available: {e}")

    # ========================================================================
    # LiveKit Dispatch Rule Management
    # ========================================================================

    async def create_dispatch_rule(self, phone_number, agent_id, trunk_id):
        """
        Create a LiveKit SIP dispatch rule for a phone number

        Args:
            phone_number: Phone number (e.g., '+17678189267')
            agent_id: Agent name (e.g., 'tst0002')
            trunk_id: LiveKit inbound trunk ID (e.g., 'ST_rVY7jNQB2ZLM')

        Returns:
            dict: {'success': bool, 'dispatch_rule_id': str, 'error': str}
        """
        import os
        from livekit import api
        from livekit.protocol import sip, room as proto_room

        try:
            # Get LiveKit credentials
            livekit_url = os.getenv('LIVEKIT_URL', '').replace('wss://', 'https://')
            livekit_api_key = os.getenv('LIVEKIT_API_KEY')
            livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

            if not all([livekit_url, livekit_api_key, livekit_api_secret]):
                return {
                    'success': False,
                    'dispatch_rule_id': None,
                    'error': 'LiveKit credentials not configured'
                }

            # Initialize LiveKit API client
            lkapi = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

            # Create dispatch rule for this trunk only
            rule = sip.SIPDispatchRule(
                dispatch_rule_individual=sip.SIPDispatchRuleIndividual(room_prefix='sip-call_')
            )

            # Configure room with agent dispatch
            room_config = proto_room.RoomConfiguration()
            agent_dispatch = room_config.agents.add()
            agent_dispatch.agent_name = agent_id

            # Create the dispatch rule
            result = await lkapi.sip.create_dispatch_rule(
                api.CreateSIPDispatchRuleRequest(
                    rule=rule,
                    trunk_ids=[trunk_id],  # Specific trunk only
                    name=f'{phone_number} → Agent {agent_id}',
                    metadata=f'{{"phone_number": "{phone_number}", "agent": "{agent_id}"}}',
                    room_config=room_config
                )
            )

            await lkapi.aclose()

            return {
                'success': True,
                'dispatch_rule_id': result.sip_dispatch_rule_id,
                'error': None
            }

        except Exception as e:
            return {
                'success': False,
                'dispatch_rule_id': None,
                'error': str(e)
            }

    async def delete_dispatch_rule(self, dispatch_rule_id):
        """
        Delete a LiveKit SIP dispatch rule

        Args:
            dispatch_rule_id: LiveKit dispatch rule ID (e.g., 'SDR_xxx')

        Returns:
            dict: {'success': bool, 'error': str}
        """
        import os
        from livekit import api

        try:
            # Get LiveKit credentials
            livekit_url = os.getenv('LIVEKIT_URL', '').replace('wss://', 'https://')
            livekit_api_key = os.getenv('LIVEKIT_API_KEY')
            livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')

            if not all([livekit_url, livekit_api_key, livekit_api_secret]):
                return {
                    'success': False,
                    'error': 'LiveKit credentials not configured'
                }

            # Initialize LiveKit API client
            lkapi = api.LiveKitAPI(livekit_url, livekit_api_key, livekit_api_secret)

            # Delete the dispatch rule
            await lkapi.sip.delete_dispatch_rule(
                api.DeleteSIPDispatchRuleRequest(sip_dispatch_rule_id=dispatch_rule_id)
            )

            await lkapi.aclose()

            return {'success': True, 'error': None}

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    # ========================================================================
    # Number Provisioning
    # ========================================================================
    
    def provision_number_from_magnus(self, db, user_id, country='Dominica', prefix='1767818'):
        """
        Provision a new phone number using Magnus Billing API
        Creates DID with proper routing, destination, and caller ID setup
        
        Args:
            db: Database session
            user_id: User to assign the number to
            country: Country for the number
            prefix: Number prefix/range (default: '1767818')
            
        Returns:
            dict: {'success': bool, 'phone_number': str, 'error': str}
        """
        if not self.magnus_client:
            print("❌ Magnus client not initialized")
            return {
                'success': False,
                'phone_number': None,
                'error': 'Magnus Billing not configured'
            }
        
        try:
            import os
            
            
            
            # Get user details from our local database
            from database import User
            local_user = db.query(User).filter(User.id == user_id).first()
            if not local_user:
                return {'success': False, 'error': 'Local user not found'}

            # Check if Magnus user already exists by email
            existing_magnus_user = self.magnus_client.get_user_by_email(local_user.email)

            if existing_magnus_user:
                # User exists - just provision a DID for them
                print(f"✅ User already exists in Magnus: {existing_magnus_user.get('username')}")
                magnus_result = self.magnus_client.provision_did_for_existing_user(
                    user_id=existing_magnus_user.get('id'),
                    username=existing_magnus_user.get('username'),
                    email=local_user.email
                )
            else:
                # Create new user, DID, SIP, and routing all at once
                user_phone = "17671234567"  # Default placeholder
                magnus_result = self.magnus_client.provision_like_php(
                    firstname=local_user.name or "User",
                    lastname=local_user.id,
                    email=local_user.email,
                    phone=user_phone
                )
            
            if not magnus_result.get('success'):
                return {
                    'success': False,
                    'phone_number': None,
                    'error': magnus_result.get('error', 'Magnus DID provisioning failed')
                }
            
            # Extract the provisioned DID
            did = magnus_result.get('did')
            phone_number = f"+{did}"

            # Check if this DID is already assigned to another user in our system
            existing_number = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number == phone_number
            ).first()

            if existing_number:
                if existing_number.assigned_to_user_id != user_id:
                    # DID is already assigned to a different user
                    print(f"❌ DID {phone_number} is already assigned to user {existing_number.assigned_to_user_id}")
                    return {
                        'success': False,
                        'phone_number': None,
                        'error': f'Phone number {phone_number} is already assigned to another user'
                    }
                else:
                    # DID already exists for this user - this shouldn't happen, but handle it
                    print(f"⚠️  DID {phone_number} already exists for this user")
                    return {
                        'success': False,
                        'phone_number': phone_number,
                        'error': f'Phone number {phone_number} already exists in your account'
                    }

            print(f"✅ Magnus provisioning complete:")
            print(f"   DID: {phone_number}")
            print(f"   Magnus DID ID: {magnus_result.get('did_id')}")
            print(f"   Destination: {magnus_result.get('destination')}")
            print(f"   SIP ID: {magnus_result.get('sip_id')}")

            # Add to local pool
            # Status is 'available' - owned by user but not yet assigned to an agent
            new_number = PhoneNumberPool(
                phone_number=phone_number,
                country=country,
                status='available',  # Available for agent assignment
                assigned_to_user_id=user_id,  # Owned by this user
                assigned_at=datetime.utcnow(),
                provider='magnus',
                provider_id=str(magnus_result.get('did_id'))
            )
            db.add(new_number)

            # Log the provisioning
            history = PhoneNumberHistory(
                phone_number=phone_number,
                user_id=user_id,
                action='provisioned_magnus',
                previous_status=None,
                new_status='available',  # Available, not assigned to agent yet
                notes=f'Magnus: DID {did}, routed to {magnus_result.get("destination")}, Caller ID set'
            )
            db.add(history)
            
            db.commit()
            
            print(f"✅ Added {phone_number} to local database")
            
            return {
                'success': True,
                'phone_number': phone_number,
                'error': None,
                'magnus_id': magnus_result.get('did_id'),
                'did_id': magnus_result.get('did_id'),
                'sip_id': magnus_result.get('sip_id'),
                'destination': magnus_result.get('destination'),
                # Pass through SIP credentials for LiveKit integration
                'username': magnus_result.get('username'),
                'password': magnus_result.get('password'),
                'sip_domain': magnus_result.get('sip_domain'),
                'sip_port': magnus_result.get('sip_port', 5060)
            }
            
        except Exception as e:
            db.rollback()
            print(f"❌ Magnus provisioning error: {e}")
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'phone_number': None,
                'error': f'Provisioning error: {str(e)}'
            }
    
    def provision_number(self, db, user_id, country='Dominica', prefix='1767818'):
        """
        Provision a new phone number for a user (like Magnus Billing flow)
        
        Args:
            db: Database session
            user_id: User to assign the number to
            country: Country for the number
            prefix: Number prefix/range
            
        Returns:
            dict: {'success': bool, 'phone_number': str, 'error': str}
        """
        # Generate unique DID in range 9000-9999 (like your PHP code)
        max_attempts = 100
        for attempt in range(max_attempts):
            random_number = random.randint(9000, 9999)
            phone_number = f"+{prefix}{random_number}"
            
            # Check if number exists in pool
            existing = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number == phone_number
            ).first()
            
            if not existing:
                # Create new number in pool
                # Status is 'available' - owned by user but not yet assigned to an agent
                new_number = PhoneNumberPool(
                    phone_number=phone_number,
                    country=country,
                    status='available',  # Available for agent assignment
                    assigned_to_user_id=user_id,
                    assigned_at=datetime.utcnow()
                )
                db.add(new_number)

                # Log the assignment
                history = PhoneNumberHistory(
                    phone_number=phone_number,
                    user_id=user_id,
                    action='provisioned',
                    previous_status=None,
                    new_status='available'  # Available, not assigned to agent yet
                )
                db.add(history)
                
                db.commit()
                
                return {
                    'success': True,
                    'phone_number': phone_number,
                    'error': None
                }
        
        return {
            'success': False,
            'phone_number': None,
            'error': 'Could not generate unique phone number'
        }
    
    # ========================================================================
    # Assignment & Routing
    # ========================================================================
    
    def assign_to_agent(self, db, phone_number, agent_id, user_id):
        """
        Assign a phone number to a specific agent
        
        Returns:
            dict: {'success': bool, 'error': str}
        """
        # Check if number is already assigned to another agent
        from database import PhoneMapping
        
        existing_mapping = db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == phone_number,
            PhoneMapping.isActive == True
        ).first()

        if existing_mapping:
            if existing_mapping.agentConfigId != agent_id:
                return {
                    'success': False,
                    'error': f'Phone number already assigned to another agent'
                }
            else:
                # Already correctly assigned
                return {'success': True, 'error': None}
        
        # Check if user owns this number
        pool_number = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_number
        ).first()
        
        if not pool_number:
            return {
                'success': False,
                'error': 'Phone number not found in pool'
            }
        
        if pool_number.assigned_to_user_id != user_id:
            return {
                'success': False,
                'error': 'You do not own this phone number'
            }
        
        # Update pool
        pool_number.assigned_to_agent_id = agent_id
        pool_number.status = "assigned"
        pool_number.updated_at = datetime.utcnow()
        
        # Check if phone mapping already exists
        existing_mapping = db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == phone_number
        ).first()
        
        if existing_mapping:
            # Update existing mapping
            existing_mapping.agentConfigId = agent_id
            existing_mapping.userId = user_id
            existing_mapping.isActive = True
        else:
            # Create new phone mapping
            mapping = PhoneMapping(
                id=str(uuid.uuid4()),
                userId=user_id,
                agentConfigId=agent_id,
                phoneNumber=phone_number,
                isActive=True
            )
            db.add(mapping)
        
        # Get agent details from AgentConfig
        from database import AgentConfig
        agent_config = db.query(AgentConfig).filter(AgentConfig.id == agent_id).first()

        if not agent_config or not agent_config.agentId:
            return {
                'success': False,
                'error': 'Agent configuration not found or agent not deployed'
            }

        # Get trunk ID for dispatch rule creation
        trunk_id = pool_number.livekit_inbound_trunk_id

        if not trunk_id:
            return {
                'success': False,
                'error': 'Phone number does not have a LiveKit inbound trunk configured'
            }

        # Create LiveKit dispatch rule
        import asyncio
        # IMPORTANT: All dispatch rules must point to the ONE physical agent
        # The physical agent (tst0002) is registered as 'epic-voice-agent'
        # Dynamic routing happens INSIDE the agent based on room name/phone number
        physical_agent_name = os.getenv('AGENT_NAME', 'epic-voice-agent')
        dispatch_result = asyncio.run(self.create_dispatch_rule(
            phone_number=phone_number,
            agent_id=physical_agent_name,  # Use physical agent name, NOT virtual agent ID
            trunk_id=trunk_id
        ))

        if not dispatch_result['success']:
            return {
                'success': False,
                'error': f"Failed to create dispatch rule: {dispatch_result['error']}"
            }

        # Store dispatch rule ID in the mapping
        if existing_mapping:
            existing_mapping.sipConfigId = dispatch_result['dispatch_rule_id']
        else:
            mapping.sipConfigId = dispatch_result['dispatch_rule_id']

        # Log the change
        history = PhoneNumberHistory(
            phone_number=phone_number,
            user_id=user_id,
            agent_id=agent_id,
            action='assigned_to_agent',
            previous_status='assigned',
            new_status='assigned'
        )
        db.add(history)

        db.commit()

        return {
            'success': True,
            'error': None,
            'dispatch_rule_id': dispatch_result['dispatch_rule_id']
        }
    
    def unassign_from_agent(self, db, phone_number, user_id):
        """
        Remove agent assignment from a phone number
        """
        from database import PhoneMapping
        
        # Find and deactivate mapping
        mapping = db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == phone_number,
            PhoneMapping.userId == user_id,
            PhoneMapping.isActive == True
        ).first()

        if mapping:
            # Delete LiveKit dispatch rule if it exists
            if mapping.sipConfigId:
                import asyncio
                dispatch_result = asyncio.run(self.delete_dispatch_rule(mapping.sipConfigId))

                if not dispatch_result['success']:
                    print(f"⚠️ Warning: Failed to delete dispatch rule: {dispatch_result['error']}")

            mapping.isActive = False

            # Update pool
            pool_number = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number == phone_number
            ).first()

            if pool_number:
                pool_number.assigned_to_agent_id = None
                pool_number.status = "available"
                pool_number.updated_at = datetime.utcnow()

            # Log
            history = PhoneNumberHistory(
                phone_number=phone_number,
                user_id=user_id,
                action='unassigned_from_agent',
                previous_status='assigned',
                new_status='assigned'
            )
            db.add(history)

            db.commit()

            return {'success': True, 'error': None}
        
        return {
            'success': False,
            'error': 'Phone number mapping not found'
        }
    
    # ========================================================================
    # Query & Management
    # ========================================================================
    
    def get_user_numbers(self, db, user_id):
        """Get all phone numbers owned by a user"""
        return db.query(PhoneNumberPool).filter(
            PhoneNumberPool.assigned_to_user_id == user_id
        ).all()
    
    def get_available_numbers(self, db, user_id):
        """Get numbers owned by user but not assigned to any agent"""
        return db.query(PhoneNumberPool).filter(
            PhoneNumberPool.assigned_to_user_id == user_id,
            PhoneNumberPool.assigned_to_agent_id == None
        ).all()
    
    def get_agent_number(self, db, agent_id):
        """Get the phone number assigned to an agent"""
        pool_number = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.assigned_to_agent_id == agent_id
        ).first()
        return pool_number.phone_number if pool_number else None
    
    def check_duplicate(self, db, phone_number):
        """
        Check if phone number is already in use
        
        Returns:
            dict: {'exists': bool, 'owner_id': str, 'agent_id': str}
        """
        pool_number = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_number
        ).first()
        
        if pool_number:
            return {
                'exists': True,
                'owner_id': pool_number.assigned_to_user_id,
                'agent_id': pool_number.assigned_to_agent_id,
                'status': pool_number.status
            }
        
        return {'exists': False, 'owner_id': None, 'agent_id': None}
    
    def get_routing_info(self, db, phone_number):
        """
        Get complete routing information for incoming call
        
        Returns:
            dict: {'agent_id': str, 'user_id': str, 'agent_name': str, 'sip_config': dict}
        """
        from database import PhoneMapping, AgentConfig
        
        mapping = db.query(PhoneMapping).filter(
            PhoneMapping.phoneNumber == phone_number,
            PhoneMapping.isActive == True
        ).first()

        if not mapping:
            return None

        agent = db.query(AgentConfig).filter(
            AgentConfig.id == mapping.agentConfigId
        ).first()
        
        if not agent:
            return None
        
        return {
            'agent_id': agent.id,
            'user_id': agent.user_id,
            'agent_name': agent.name,
            'file_path': agent.file_path,
            'status': agent.status
        }


# ============================================================================
# Database Migration
# ============================================================================

def migrate_phone_tables():
    """Create phone number management tables"""
    from database import engine
    
    PhoneNumberPool.__table__.create(engine, checkfirst=True)
    PhoneNumberHistory.__table__.create(engine, checkfirst=True)
    print("✅ Phone number management tables created")


if __name__ == '__main__':
    # Run migration
    migrate_phone_tables()
