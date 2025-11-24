"""
Real-time Call Dashboard Module

Provides WebSocket-based real-time updates for active calls, metrics, and events.

Features:
- WebSocket server for real-time communication
- Active call monitoring with live updates
- Real-time metrics (calls in progress, durations, outcomes)
- Event broadcasting for call state changes
- Multi-tenant isolation with user-scoped data
"""

from .socketio_server import socketio, init_socketio
from .metrics import DashboardMetrics
from .events import emit_call_event, emit_metrics_update

__all__ = ['socketio', 'init_socketio', 'DashboardMetrics', 'emit_call_event', 'emit_metrics_update']
