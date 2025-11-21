"""
SIP Inbound Call Handler
Routes incoming SIP calls to the correct LiveKit agent based on phone number mapping
"""

import os
from typing import Optional
from dotenv import load_dotenv
from livekit import api
from database import SessionLocal, PhoneMapping, AgentConfig
import asyncio
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class SIPInboundHandler:
    def __init__(self):
        self.livekit_url = os.getenv('LIVEKIT_URL')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')
        self.sip_trunk_id = os.getenv('SIP_OUTBOUND_TRUNK_ID')
        
    def get_agent_for_number(self, phone_number: str) -> Optional[dict]:
        """
        Look up which agent is assigned to a phone number
        
        Returns:
            dict with agent_id, agent_name, room_name or None
        """
        db = SessionLocal()
        try:
            # Normalize phone number (remove +, spaces, etc.)
            normalized = phone_number.replace('+', '').replace(' ', '').replace('-', '')
            
            # Find active mapping
            mapping = db.query(PhoneMapping).filter(
                PhoneMapping.phone_number.like(f'%{normalized}%'),
                PhoneMapping.is_active == True
            ).first()
            
            if not mapping:
                logger.warning(f"No active mapping found for {phone_number}")
                return None
            
            # Get agent config
            agent = db.query(AgentConfig).filter(
                AgentConfig.id == mapping.agent_config_id,
                AgentConfig.is_active == True
            ).first()
            
            if not agent:
                logger.warning(f"Agent not found for mapping: {mapping.agent_config_id}")
                return None
            
            # Generate room name for this call
            import uuid
            room_name = f"{agent.agent_id}_{uuid.uuid4().hex[:8]}"
            
            return {
                'agent_id': agent.id,
                'agent_name': agent.name,
                'agent_file_id': agent.agent_id,
                'room_name': room_name,
                'phone_number': phone_number
            }
            
        finally:
            db.close()
    
    async def create_room_for_call(self, room_name: str, agent_name: str) -> dict:
        """
        Create a LiveKit room for the incoming call
        """
        lk_api = api.LiveKitAPI(
            self.livekit_url.replace('wss://', 'https://').replace('ws://', 'http://'),
            self.livekit_api_key,
            self.livekit_api_secret
        )
        
        try:
            # Create room
            room = await lk_api.room.create_room(
                api.CreateRoomRequest(
                    name=room_name,
                    empty_timeout=300,  # 5 minutes
                    max_participants=10,
                    metadata=f'{{"agent_name": "{agent_name}", "type": "sip_call"}}'
                )
            )
            
            logger.info(f"Created room: {room_name}")
            return {'success': True, 'room': room}
            
        except Exception as e:
            logger.error(f"Failed to create room: {e}")
            return {'success': False, 'error': str(e)}
        finally:
            await lk_api.aclose()
    
    async def route_inbound_call(self, from_number: str, to_number: str) -> dict:
        """
        Main handler for incoming SIP calls
        
        Args:
            from_number: Caller's phone number
            to_number: Dialed number (our Magnus DID)
            
        Returns:
            dict with routing decision
        """
        logger.info(f"Inbound call: {from_number} → {to_number}")
        
        # Find agent for this number
        agent_info = self.get_agent_for_number(to_number)
        
        if not agent_info:
            logger.error(f"No agent found for number: {to_number}")
            return {
                'success': False,
                'error': 'No agent configured for this number',
                'action': 'reject'
            }
        
        # Create room
        room_result = await self.create_room_for_call(
            agent_info['room_name'],
            agent_info['agent_name']
        )
        
        if not room_result['success']:
            return {
                'success': False,
                'error': room_result['error'],
                'action': 'reject'
            }
        
        # Return routing information
        return {
            'success': True,
            'action': 'route',
            'room_name': agent_info['room_name'],
            'agent_id': agent_info['agent_id'],
            'agent_name': agent_info['agent_name'],
            'from_number': from_number,
            'to_number': to_number
        }

# Flask endpoint for SIP webhooks (if Magnus Billing supports webhooks)
def create_sip_webhook_handler(app):
    """
    Add SIP webhook endpoint to Flask app
    """
    from flask import request, jsonify
    
    handler = SIPInboundHandler()
    
    @app.route('/api/sip/inbound', methods=['POST'])
    def handle_inbound_sip_call():
        """
        Webhook endpoint for incoming SIP calls
        
        Expected payload from Magnus Billing or SIP provider:
        {
            "from": "+17671234567",
            "to": "+17678189186",
            "call_id": "abc123"
        }
        """
        try:
            data = request.json
            from_number = data.get('from') or data.get('caller')
            to_number = data.get('to') or data.get('called')
            
            if not from_number or not to_number:
                return jsonify({
                    'error': 'Missing from/to numbers'
                }), 400
            
            # Route the call
            result = asyncio.run(handler.route_inbound_call(from_number, to_number))
            
            if result['success']:
                return jsonify({
                    'action': 'route',
                    'room_name': result['room_name'],
                    'agent': result['agent_name']
                }), 200
            else:
                return jsonify({
                    'action': 'reject',
                    'error': result['error']
                }), 404
                
        except Exception as e:
            logger.error(f"Error handling inbound call: {e}", exc_info=True)
            return jsonify({
                'action': 'reject',
                'error': 'Internal server error'
            }), 500

if __name__ == '__main__':
    # Test the handler
    handler = SIPInboundHandler()
    
    # Test lookup
    agent_info = handler.get_agent_for_number('+17678189360')
    print(f"Agent info: {agent_info}")
    
    # Test routing
    result = asyncio.run(handler.route_inbound_call('+17671234567', '+17678189360'))
    print(f"Routing result: {result}")
