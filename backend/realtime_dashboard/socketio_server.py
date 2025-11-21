"""
Socket.IO Server for Real-time Dashboard

Provides WebSocket connections for real-time updates to dashboard clients.

Features:
- User authentication via session/JWT
- Room-based broadcasting (per-user channels)
- Connection management and cleanup
- Heartbeat/ping-pong for connection health
"""

import logging
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask import request, session
from typing import Optional

logger = logging.getLogger(__name__)

# Global SocketIO instance
socketio: Optional[SocketIO] = None


def init_socketio(app):
    """
    Initialize Socket.IO server with Flask app.

    Args:
        app: Flask application instance

    Returns:
        SocketIO instance
    """
    global socketio

    # Get allowed origins from environment or use defaults
    import os
    allowed_origins = os.getenv('SOCKETIO_ALLOWED_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000')
    origins_list = [origin.strip() for origin in allowed_origins.split(',')]

    socketio = SocketIO(
        app,
        cors_allowed_origins=origins_list,
        async_mode='threading',
        logger=True,
        engineio_logger=False,
        ping_timeout=60,
        ping_interval=25
    )

    logger.info("Socket.IO server initialized")

    # Register event handlers
    _register_events()

    return socketio


def _register_events():
    """Register Socket.IO event handlers."""

    @socketio.on('connect')
    def handle_connect(auth=None):
        """
        Handle client connection.

        Extracts user ID from session/auth and joins user-specific room.
        """
        try:
            # Extract user ID from auth or session
            user_id = None

            if auth and 'user_id' in auth:
                user_id = auth['user_id']
            elif session and 'user_id' in session:
                user_id = session['user_id']
            elif request.args.get('user_id'):
                user_id = request.args.get('user_id')

            if not user_id:
                logger.warning(f"WebSocket connection without user_id from {request.remote_addr}")
                # Allow connection but limit functionality
                user_id = f"anon:{request.sid}"

            # Join user-specific room for targeted broadcasting
            room = f"user:{user_id}"
            join_room(room)

            logger.info(f"WebSocket connected - User: {user_id}, SID: {request.sid}, Room: {room}")

            # Send connection confirmation
            emit('connected', {
                'user_id': user_id,
                'sid': request.sid,
                'timestamp': str(__import__('datetime').datetime.utcnow())
            })

            # Send initial dashboard state
            _send_initial_state(user_id)

        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}", exc_info=True)
            disconnect()

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection."""
        logger.info(f"WebSocket disconnected - SID: {request.sid}")

    @socketio.on('subscribe')
    def handle_subscribe(data):
        """
        Handle subscription to specific data streams.

        Args:
            data: {
                'streams': ['active_calls', 'metrics', 'events']
            }
        """
        try:
            streams = data.get('streams', [])
            user_id = data.get('user_id')

            if not user_id:
                logger.warning(f"Subscribe request without user_id from {request.sid}")
                return

            logger.info(f"User {user_id} subscribed to streams: {streams}")

            # Join stream-specific rooms
            for stream in streams:
                room = f"stream:{stream}:{user_id}"
                join_room(room)

            emit('subscribed', {
                'streams': streams,
                'timestamp': str(__import__('datetime').datetime.utcnow())
            })

        except Exception as e:
            logger.error(f"Error in subscribe: {e}", exc_info=True)

    @socketio.on('unsubscribe')
    def handle_unsubscribe(data):
        """
        Handle unsubscription from data streams.

        Args:
            data: {
                'streams': ['active_calls']
            }
        """
        try:
            streams = data.get('streams', [])
            user_id = data.get('user_id')

            if not user_id:
                return

            logger.info(f"User {user_id} unsubscribed from streams: {streams}")

            # Leave stream-specific rooms
            for stream in streams:
                room = f"stream:{stream}:{user_id}"
                leave_room(room)

            emit('unsubscribed', {
                'streams': streams,
                'timestamp': str(__import__('datetime').datetime.utcnow())
            })

        except Exception as e:
            logger.error(f"Error in unsubscribe: {e}", exc_info=True)

    @socketio.on('ping')
    def handle_ping():
        """Handle client ping for connection health check."""
        emit('pong', {
            'timestamp': str(__import__('datetime').datetime.utcnow())
        })


def _send_initial_state(user_id: str):
    """
    Send initial dashboard state to newly connected client.

    Args:
        user_id: User identifier
    """
    try:
        from .metrics import DashboardMetrics

        metrics = DashboardMetrics()
        state = metrics.get_dashboard_state(user_id)

        room = f"user:{user_id}"
        socketio.emit('initial_state', state, room=room)

        logger.debug(f"Sent initial state to user {user_id}")

    except Exception as e:
        logger.error(f"Error sending initial state: {e}", exc_info=True)


# Utility functions for broadcasting


def broadcast_to_user(user_id: str, event: str, data: dict):
    """
    Broadcast event to specific user.

    Args:
        user_id: User identifier
        event: Event name
        data: Event data
    """
    if not socketio:
        logger.warning("Socket.IO not initialized, cannot broadcast")
        return

    try:
        room = f"user:{user_id}"
        socketio.emit(event, data, room=room)
        logger.debug(f"Broadcast {event} to user {user_id}")

    except Exception as e:
        logger.error(f"Error broadcasting to user: {e}", exc_info=True)


def broadcast_to_stream(stream: str, user_id: str, event: str, data: dict):
    """
    Broadcast event to stream subscribers.

    Args:
        stream: Stream name (e.g., 'active_calls', 'metrics')
        user_id: User identifier
        event: Event name
        data: Event data
    """
    if not socketio:
        logger.warning("Socket.IO not initialized, cannot broadcast")
        return

    try:
        room = f"stream:{stream}:{user_id}"
        socketio.emit(event, data, room=room)
        logger.debug(f"Broadcast {event} to stream {stream} for user {user_id}")

    except Exception as e:
        logger.error(f"Error broadcasting to stream: {e}", exc_info=True)
