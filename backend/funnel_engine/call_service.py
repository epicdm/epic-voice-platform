"""
Call Service for Funnel Engine

Handles LiveKit SIP call initiation for CALL nodes in funnels.
"""

import os
import uuid
import asyncio
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session

# Import LiveKit API
from livekit import api
from livekit.protocol.sip import CreateSIPParticipantRequest

logger = logging.getLogger(__name__)


class CallService:
    """Service for initiating outbound calls via LiveKit"""

    def __init__(self, db: Session):
        """
        Initialize call service

        Args:
            db: Database session
        """
        self.db = db
        self.livekit_url = os.getenv('LIVEKIT_URL')
        self.livekit_api_key = os.getenv('LIVEKIT_API_KEY')
        self.livekit_api_secret = os.getenv('LIVEKIT_API_SECRET')
        self.sip_trunk_id = os.getenv('SIP_OUTBOUND_TRUNK_ID')

        if not all([self.livekit_url, self.livekit_api_key, self.livekit_api_secret]):
            raise ValueError("LiveKit credentials not configured")

    async def initiate_call_async(
        self,
        agent_id: str,
        to_number: str,
        from_number: Optional[str] = None,
        execution_id: Optional[str] = None,
        node_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Initiate an outbound call via LiveKit

        Args:
            agent_id: Agent configuration ID
            to_number: Phone number to call
            from_number: Optional caller ID number (if not provided, uses agent's assigned number)
            execution_id: Optional funnel execution ID
            node_id: Optional funnel node ID

        Returns:
            Dict with call details (room_name, sip_call_id, participant_id)
        """
        # Ensure phone number has plus sign
        if not to_number.startswith('+'):
            to_number = f"+{to_number}"

        # If from_number not provided, look up agent's assigned phone number
        if not from_number:
            from database import PhoneMapping

            # Query agent's phone mapping
            phone_mapping = self.db.query(PhoneMapping).filter(
                PhoneMapping.agentConfigId == agent_id,
                PhoneMapping.isActive == True
            ).first()

            if phone_mapping and phone_mapping.phoneNumber:
                from_number = phone_mapping.phoneNumber
                logger.info(f"Using agent's assigned phone number: {from_number}")
            else:
                from_number = "+17678183366"  # System default fallback
                logger.warning(f"Agent {agent_id} has no phone mapping, using default: {from_number}")
        elif not from_number.startswith('+'):
            from_number = f"+{from_number}"

        # Create unique room name
        # Include execution_id AND agent_id for dynamic routing
        # Format: funnel-{execution_id[:8]}-{agent_id}
        if execution_id:
            room_name = f"funnel-{execution_id[:8]}-{agent_id}"
        else:
            # Non-funnel outbound calls also include agent_id
            room_name = f"outbound-call-{agent_id}"

        logger.info(
            f"Initiating call: agent={agent_id}, to={to_number}, "
            f"from={from_number}, room={room_name}"
        )

        # Get LiveKit API URL (convert WebSocket to HTTP)
        api_url = self.livekit_url.replace('wss://', 'https://').replace('ws://', 'http://')
        api_url = api_url.rstrip('/')

        # Initialize LiveKit API
        lk_api = api.LiveKitAPI(
            api_url,
            self.livekit_api_key,
            self.livekit_api_secret
        )

        try:
            # Step 1: Create room
            logger.info(f"Creating LiveKit room: {room_name}")
            room = await lk_api.room.create_room(
                api.CreateRoomRequest(name=room_name)
            )
            logger.info(f"✅ Room created: {room.name}")

            # Step 2: Create SIP participant (initiates the call)
            logger.info(f"Creating SIP participant (calling {to_number})")

            participant_identity = f"agent-{agent_id[:8]}-{str(uuid.uuid4())[:8]}"
            participant_name = f"Agent Call"

            request = CreateSIPParticipantRequest(
                sip_trunk_id=self.sip_trunk_id,
                sip_call_to=to_number,
                sip_number=from_number,
                room_name=room_name,
                participant_identity=participant_identity,
                participant_name=participant_name
            )

            participant = await lk_api.sip.create_sip_participant(request)

            logger.info(f"✅ SIP call initiated!")
            logger.info(f"   SIP Call ID: {participant.sip_call_id}")
            logger.info(f"   Participant ID: {participant.participant_id}")
            logger.info(f"   Room: {participant.room_name}")

            return {
                "room_name": room_name,
                "sip_call_id": participant.sip_call_id,
                "participant_id": participant.participant_id,
                "to_number": to_number,
                "from_number": from_number,
                "agent_id": agent_id,
                "execution_id": execution_id,
                "node_id": node_id
            }

        except Exception as e:
            logger.error(f"❌ Failed to initiate call: {e}", exc_info=True)
            raise

        finally:
            await lk_api.aclose()

    def initiate_call(
        self,
        agent_id: str,
        to_number: str,
        from_number: Optional[str] = None,
        execution_id: Optional[str] = None,
        node_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Synchronous wrapper for initiate_call_async

        Args:
            agent_id: Agent configuration ID
            to_number: Phone number to call
            from_number: Optional caller ID number
            execution_id: Optional funnel execution ID
            node_id: Optional funnel node ID

        Returns:
            Dict with call details
        """
        return asyncio.run(
            self.initiate_call_async(
                agent_id=agent_id,
                to_number=to_number,
                from_number=from_number,
                execution_id=execution_id,
                node_id=node_id
            )
        )
