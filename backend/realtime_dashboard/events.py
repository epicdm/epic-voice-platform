"""
Real-time Event Broadcasting

Utility functions for broadcasting events to dashboard clients via Socket.IO.

Event Types:
- call_started: New call initiated
- call_ended: Call completed
- call_updated: Call state changed
- metrics_updated: Dashboard metrics refreshed
"""

import logging
from typing import Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


def emit_call_event(
    user_id: str,
    event_type: str,
    call_data: Dict[str, Any]
):
    """
    Broadcast call event to user's dashboard.

    Args:
        user_id: User identifier
        event_type: Event type (call_started, call_ended, call_updated)
        call_data: Call information dictionary
    """
    try:
        from .socketio_server import broadcast_to_user

        event_data = {
            'type': event_type,
            'call': call_data,
            'timestamp': datetime.utcnow().isoformat()
        }

        broadcast_to_user(user_id, 'call_event', event_data)

        logger.debug(f"Emitted {event_type} to user {user_id}")

    except Exception as e:
        logger.error(f"Error emitting call event: {e}", exc_info=True)


def emit_metrics_update(user_id: str, metrics: Dict[str, Any]):
    """
    Broadcast metrics update to user's dashboard.

    Args:
        user_id: User identifier
        metrics: Metrics dictionary
    """
    try:
        from .socketio_server import broadcast_to_stream

        event_data = {
            'metrics': metrics,
            'timestamp': datetime.utcnow().isoformat()
        }

        broadcast_to_stream('metrics', user_id, 'metrics_update', event_data)

        logger.debug(f"Emitted metrics update to user {user_id}")

    except Exception as e:
        logger.error(f"Error emitting metrics update: {e}", exc_info=True)


def emit_active_calls_update(user_id: str, active_calls: list):
    """
    Broadcast active calls list to user's dashboard.

    Args:
        user_id: User identifier
        active_calls: List of active call dictionaries
    """
    try:
        from .socketio_server import broadcast_to_stream

        event_data = {
            'active_calls': active_calls,
            'count': len(active_calls),
            'timestamp': datetime.utcnow().isoformat()
        }

        broadcast_to_stream('active_calls', user_id, 'active_calls_update', event_data)

        logger.debug(f"Emitted active calls update to user {user_id}: {len(active_calls)} calls")

    except Exception as e:
        logger.error(f"Error emitting active calls update: {e}", exc_info=True)


# Integration hooks for call outcome service
def on_call_started(user_id: str, call_id: str, call_data: Dict[str, Any]):
    """
    Hook called when a new call starts.

    Args:
        user_id: User identifier
        call_id: Call identifier
        call_data: Call information
    """
    emit_call_event(user_id, 'call_started', call_data)


def on_call_ended(user_id: str, call_id: str, call_data: Dict[str, Any]):
    """
    Hook called when a call ends.

    Args:
        user_id: User identifier
        call_id: Call identifier
        call_data: Call information with outcome
    """
    emit_call_event(user_id, 'call_ended', call_data)


def on_call_updated(user_id: str, call_id: str, call_data: Dict[str, Any]):
    """
    Hook called when call state changes.

    Args:
        user_id: User identifier
        call_id: Call identifier
        call_data: Updated call information
    """
    emit_call_event(user_id, 'call_updated', call_data)
