"""
Live Listen Service

Provides functionality for admins to monitor active calls.
"""

import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from livekit import api
import aiohttp

logger = logging.getLogger(__name__)


class LiveListenService:
    """
    Service for monitoring active LiveKit rooms (calls).

    Features:
    - List active rooms with participant info
    - Generate observer access tokens for admins
    - Track room metadata and statistics
    """

    def __init__(self, livekit_url: str, api_key: str, api_secret: str):
        """
        Initialize Live Listen service.

        Args:
            livekit_url: LiveKit server WebSocket URL
            api_key: LiveKit API key
            api_secret: LiveKit API secret
        """
        self.livekit_url = livekit_url
        self.api_key = api_key
        self.api_secret = api_secret

        # HTTP URL for API calls (convert wss:// to https://)
        self.http_url = livekit_url.replace('wss://', 'https://').replace('ws://', 'http://')

        # Create aiohttp session for API calls
        self._session = None

        logger.info("Live Listen Service initialized")

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()
        return self._session

    async def _get_room_service(self) -> api.room_service.RoomService:
        """Get RoomService instance with active session."""
        session = await self._get_session()
        return api.room_service.RoomService(
            session=session,
            url=self.http_url,
            api_key=self.api_key,
            api_secret=self.api_secret
        )

    async def list_active_rooms(self) -> List[Dict[str, Any]]:
        """
        Get list of all active rooms.

        Returns:
            List of room dictionaries with metadata
        """
        try:
            # Get room service and list all active rooms
            from livekit.protocol import room as room_proto

            room_service = await self._get_room_service()
            request = room_proto.ListRoomsRequest()
            response = await room_service.list_rooms(request)
            rooms = response.rooms

            result = []
            for room in rooms:
                room_info = {
                    'room_name': room.name,
                    'room_sid': room.sid,
                    'num_participants': room.num_participants,
                    'num_publishers': room.num_publishers,
                    'creation_time': room.creation_time,
                    'max_participants': room.max_participants,
                    'metadata': room.metadata,
                    'active_recording': room.active_recording
                }

                # Parse room name to extract call info (format: sip-{phone}__)
                if room.name.startswith('sip-'):
                    parts = room.name.split('__')
                    if len(parts) >= 1:
                        phone_part = parts[0].replace('sip-', '')
                        room_info['phone_number'] = f"+{phone_part}"
                    if len(parts) >= 2:
                        room_info['caller_number'] = parts[1]

                result.append(room_info)

            logger.info(f"Found {len(result)} active rooms")
            return result

        except Exception as e:
            logger.error(f"Error listing rooms: {e}", exc_info=True)
            raise

    async def get_room_participants(self, room_name: str) -> List[Dict[str, Any]]:
        """
        Get list of participants in a specific room.

        Args:
            room_name: Name of the room

        Returns:
            List of participant dictionaries
        """
        try:
            from livekit.protocol import room as room_proto

            room_service = await self._get_room_service()
            request = room_proto.ListParticipantsRequest(room=room_name)
            response = await room_service.list_participants(request)
            participants = response.participants

            result = []
            for p in participants:
                participant_info = {
                    'identity': p.identity,
                    'sid': p.sid,
                    'state': p.state.name if hasattr(p.state, 'name') else str(p.state),
                    'joined_at': p.joined_at,
                    'is_publisher': p.is_publisher,
                    'metadata': p.metadata,
                    'tracks': []
                }

                # Add track information
                for track in p.tracks:
                    track_info = {
                        'sid': track.sid,
                        'type': track.type.name if hasattr(track.type, 'name') else str(track.type),
                        'source': track.source.name if hasattr(track.source, 'name') else str(track.source),
                        'muted': track.muted,
                        'width': track.width if hasattr(track, 'width') else None,
                        'height': track.height if hasattr(track, 'height') else None,
                    }
                    participant_info['tracks'].append(track_info)

                result.append(participant_info)

            logger.info(f"Found {len(result)} participants in room {room_name}")
            return result

        except Exception as e:
            logger.error(f"Error getting participants for room {room_name}: {e}", exc_info=True)
            raise

    def generate_observer_token(
        self,
        room_name: str,
        observer_identity: str,
        can_publish: bool = False,
        can_subscribe: bool = True
    ) -> str:
        """
        Generate access token for an observer to join a room.

        Args:
            room_name: Name of the room to join
            observer_identity: Identity for the observer (e.g., "admin-{user_id}")
            can_publish: Allow observer to publish audio/video (default: False)
            can_subscribe: Allow observer to receive audio/video (default: True)

        Returns:
            JWT access token for joining the room
        """
        try:
            # Create access token
            token = api.AccessToken(self.api_key, self.api_secret)

            # Set token identity
            token.identity = observer_identity
            token.name = f"Observer: {observer_identity}"

            # Create video grants for observer
            grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
                can_publish_data=False,  # Don't allow data messages
                hidden=True  # Hide observer from participant list
            )

            token.with_grants(grants)

            # Generate JWT token (valid for 1 hour)
            jwt_token = token.to_jwt()

            logger.info(f"Generated observer token for {observer_identity} in room {room_name}")
            return jwt_token

        except Exception as e:
            logger.error(f"Error generating observer token: {e}", exc_info=True)
            raise

    async def get_room_details(self, room_name: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific room.

        Args:
            room_name: Name of the room

        Returns:
            Room details dictionary or None if not found
        """
        try:
            rooms = await self.list_active_rooms()

            for room in rooms:
                if room['room_name'] == room_name:
                    # Add participant details
                    participants = await self.get_room_participants(room_name)
                    room['participants'] = participants
                    return room

            logger.warning(f"Room {room_name} not found")
            return None

        except Exception as e:
            logger.error(f"Error getting room details: {e}", exc_info=True)
            raise


def create_live_listen_service() -> LiveListenService:
    """
    Factory function to create LiveListenService from environment variables.

    Returns:
        Configured LiveListenService instance
    """
    livekit_url = os.getenv('LIVEKIT_URL', '')
    api_key = os.getenv('LIVEKIT_API_KEY', '')
    api_secret = os.getenv('LIVEKIT_API_SECRET', '')

    if not all([livekit_url, api_key, api_secret]):
        raise ValueError("Missing LiveKit credentials in environment variables")

    return LiveListenService(livekit_url, api_key, api_secret)
