"""
Live Listen API Routes

REST endpoints for call monitoring functionality.

Endpoints:
- GET /api/live-listen/rooms - List active rooms
- GET /api/live-listen/rooms/{room_name} - Get room details
- POST /api/live-listen/rooms/{room_name}/join - Generate observer token
"""

import logging
from flask import Blueprint, jsonify, request, g
from .service import create_live_listen_service

logger = logging.getLogger(__name__)

# Create blueprint
live_listen_bp = Blueprint('live_listen', __name__, url_prefix='/api/live-listen')

# Initialize service
try:
    live_listen_service = create_live_listen_service()
except ValueError as e:
    logger.error(f"Failed to initialize Live Listen service: {e}")
    live_listen_service = None


def get_user_id() -> str:
    """
    Extract user ID from request context.

    Returns:
        User identifier
    """
    # Check Flask g context (set by auth middleware)
    if hasattr(g, 'user_id') and g.user_id:
        return str(g.user_id)

    # Check query parameter (for testing)
    user_id = request.args.get('user_id')
    if user_id:
        return str(user_id)

    # Check header
    user_id = request.headers.get('X-User-ID')
    if user_id:
        return str(user_id)

    return 'anonymous'


@live_listen_bp.route('/rooms', methods=['GET'])
def list_rooms():
    """
    GET /api/live-listen/rooms

    List all active rooms (calls).

    Response:
    {
      "success": true,
      "rooms": [
        {
          "room_name": "sip-17678189426__17678183742",
          "room_sid": "RM_abc123",
          "num_participants": 2,
          "phone_number": "+17678189426",
          "caller_number": "17678183742",
          "creation_time": 1698765132,
          "active_recording": false
        }
      ],
      "count": 1
    }
    """
    if not live_listen_service:
        return jsonify({
            'success': False,
            'error': 'Live Listen service not initialized'
        }), 500

    try:
        import asyncio
        user_id = get_user_id()

        # Get active rooms (run async in new event loop)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            rooms = loop.run_until_complete(live_listen_service.list_active_rooms())
        finally:
            loop.close()

        return jsonify({
            'success': True,
            'rooms': rooms,
            'count': len(rooms),
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error listing rooms: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@live_listen_bp.route('/rooms/<room_name>', methods=['GET'])
def get_room(room_name: str):
    """
    GET /api/live-listen/rooms/{room_name}

    Get detailed information about a specific room.

    Response:
    {
      "success": true,
      "room": {
        "room_name": "sip-17678189426__17678183742",
        "room_sid": "RM_abc123",
        "num_participants": 2,
        "participants": [
          {
            "identity": "sip-participant",
            "sid": "PA_123",
            "state": "ACTIVE",
            "is_publisher": true,
            "tracks": [...]
          }
        ],
        "phone_number": "+17678189426",
        "creation_time": 1698765132
      }
    }
    """
    if not live_listen_service:
        return jsonify({
            'success': False,
            'error': 'Live Listen service not initialized'
        }), 500

    try:
        import asyncio
        user_id = get_user_id()

        # Get room details (run async in new event loop)
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            room = loop.run_until_complete(live_listen_service.get_room_details(room_name))
        finally:
            loop.close()

        if not room:
            return jsonify({
                'success': False,
                'error': 'Room not found',
                'room_name': room_name
            }), 404

        return jsonify({
            'success': True,
            'room': room,
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error getting room {room_name}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@live_listen_bp.route('/rooms/<room_name>/join', methods=['POST'])
def join_room(room_name: str):
    """
    POST /api/live-listen/rooms/{room_name}/join

    Generate an access token for an admin to join a room as an observer.

    Request Body:
    {
      "observer_name": "Admin User",  // Optional
      "can_publish": false            // Optional, default false
    }

    Response:
    {
      "success": true,
      "token": "eyJhbGci...",
      "livekit_url": "wss://...",
      "room_name": "sip-17678189426__17678183742",
      "observer_identity": "observer-user123"
    }
    """
    if not live_listen_service:
        return jsonify({
            'success': False,
            'error': 'Live Listen service not initialized'
        }), 500

    try:
        user_id = get_user_id()

        # Get request body
        data = request.get_json() or {}
        observer_name = data.get('observer_name', f'Observer-{user_id}')
        can_publish = data.get('can_publish', False)

        # Generate observer identity
        observer_identity = f"observer-{user_id}"

        # Generate access token
        token = live_listen_service.generate_observer_token(
            room_name=room_name,
            observer_identity=observer_identity,
            can_publish=can_publish,
            can_subscribe=True
        )

        return jsonify({
            'success': True,
            'token': token,
            'livekit_url': live_listen_service.livekit_url,
            'room_name': room_name,
            'observer_identity': observer_identity,
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error generating observer token for room {room_name}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@live_listen_bp.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/live-listen/health

    Health check for Live Listen API.

    Response:
    {
      "status": "healthy",
      "service_initialized": true
    }
    """
    return jsonify({
        'status': 'healthy' if live_listen_service else 'unhealthy',
        'service_initialized': live_listen_service is not None
    }), 200 if live_listen_service else 500
