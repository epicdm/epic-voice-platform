"""
Dashboard API Routes

REST endpoints for dashboard data (non-WebSocket).

Endpoints:
- GET /api/dashboard/metrics - Get current metrics
- GET /api/dashboard/active-calls - Get active calls
- GET /api/dashboard/recent-calls - Get recent calls
- GET /api/dashboard/agent-performance - Get agent stats
"""

import logging
from flask import Blueprint, jsonify, request, g
from .metrics import DashboardMetrics

logger = logging.getLogger(__name__)

# Create blueprint
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

# Initialize metrics service
metrics_service = DashboardMetrics()


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

    # Return default for unauthenticated (should be handled by auth middleware)
    return 'anonymous'


@dashboard_bp.route('/metrics', methods=['GET'])
def get_metrics():
    """
    GET /api/dashboard/metrics

    Get current dashboard metrics.

    Query Parameters:
    - hours (int, optional): Time period in hours (default: 24)

    Response:
    {
      "total_calls": 150,
      "active_calls": 3,
      "completed_calls": 120,
      "average_duration": 45.5,
      "success_rate": 85.2,
      "outcome_counts": {
        "completed": 120,
        "no_answer": 20,
        "failed": 10
      },
      "period_hours": 24
    }
    """
    try:
        user_id = get_user_id()
        hours = int(request.args.get('hours', 24))

        # Validate hours parameter
        if hours < 1 or hours > 168:  # Max 1 week
            return jsonify({
                'error': 'Invalid hours parameter',
                'message': 'Hours must be between 1 and 168'
            }), 400

        # Get metrics from service
        from database import SessionLocal
        db = SessionLocal()
        metrics = metrics_service._get_call_metrics(db, user_id, hours)
        db.close()

        return jsonify({
            'success': True,
            'metrics': metrics,
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error getting metrics: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@dashboard_bp.route('/active-calls', methods=['GET'])
def get_active_calls():
    """
    GET /api/dashboard/active-calls

    Get list of active calls.

    Response:
    {
      "success": true,
      "active_calls": [
        {
          "id": "call-123",
          "phoneNumber": "+12345678900",
          "direction": "inbound",
          "startedAt": "2025-10-30T12:34:56Z",
          "duration": 45,
          "livekitRoomName": "room-abc",
          "agentConfigId": "agent-xyz"
        }
      ],
      "count": 1
    }
    """
    try:
        user_id = get_user_id()

        # Get active calls from service
        from database import SessionLocal
        db = SessionLocal()
        active_calls = metrics_service._get_active_calls(db, user_id)
        db.close()

        return jsonify({
            'success': True,
            'active_calls': active_calls,
            'count': len(active_calls),
            'user_id': user_id
        }), 200

    except Exception as e:
        logger.error(f"Error getting active calls: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@dashboard_bp.route('/recent-calls', methods=['GET'])
def get_recent_calls():
    """
    GET /api/dashboard/recent-calls

    Get recent calls with pagination.

    Query Parameters:
    - limit (int, optional): Number of calls to return (default: 10, max: 100)

    Response:
    {
      "success": true,
      "calls": [...],
      "count": 10
    }
    """
    try:
        user_id = get_user_id()
        limit = int(request.args.get('limit', 10))

        # Validate limit parameter
        if limit < 1 or limit > 100:
            return jsonify({
                'error': 'Invalid limit parameter',
                'message': 'Limit must be between 1 and 100'
            }), 400

        # Get recent calls from service
        from database import SessionLocal
        db = SessionLocal()
        recent_calls = metrics_service._get_recent_calls(db, user_id, limit)
        db.close()

        return jsonify({
            'success': True,
            'calls': recent_calls,
            'count': len(recent_calls),
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error getting recent calls: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@dashboard_bp.route('/agent-performance', methods=['GET'])
def get_agent_performance():
    """
    GET /api/dashboard/agent-performance

    Get performance metrics per agent.

    Query Parameters:
    - hours (int, optional): Time period in hours (default: 24)

    Response:
    {
      "success": true,
      "agents": [
        {
          "agentConfigId": "agent-123",
          "total_calls": 50,
          "average_duration": 45.5,
          "success_rate": 85.2,
          "completed_calls": 42
        }
      ]
    }
    """
    try:
        user_id = get_user_id()
        hours = int(request.args.get('hours', 24))

        # Validate hours parameter
        if hours < 1 or hours > 168:
            return jsonify({
                'error': 'Invalid hours parameter',
                'message': 'Hours must be between 1 and 168'
            }), 400

        # Get agent performance from service
        agent_metrics = metrics_service.get_agent_performance(user_id, hours)

        return jsonify({
            'success': True,
            'agents': agent_metrics,
            'count': len(agent_metrics),
            'period_hours': hours,
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error getting agent performance: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@dashboard_bp.route('/calls-per-hour', methods=['GET'])
def get_calls_per_hour():
    """
    GET /api/dashboard/calls-per-hour

    Get calls per hour for time period.

    Query Parameters:
    - hours (int, optional): Time period in hours (default: 24)

    Response:
    {
      "success": true,
      "data": {
        "2025-10-30 12:00": 5,
        "2025-10-30 13:00": 8,
        ...
      },
      "period_hours": 24
    }
    """
    try:
        user_id = get_user_id()
        hours = int(request.args.get('hours', 24))

        # Validate hours parameter
        if hours < 1 or hours > 168:
            return jsonify({
                'error': 'Invalid hours parameter',
                'message': 'Hours must be between 1 and 168'
            }), 400

        # Get hourly data from service
        hourly_data = metrics_service.get_calls_per_hour(user_id, hours)

        return jsonify({
            'success': True,
            'data': hourly_data,
            'period_hours': hours,
            'user_id': user_id
        }), 200

    except ValueError as e:
        return jsonify({
            'error': 'Invalid parameter',
            'message': str(e)
        }), 400

    except Exception as e:
        logger.error(f"Error getting calls per hour: {e}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500


@dashboard_bp.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/dashboard/health

    Health check for dashboard API.

    Response:
    {
      "status": "healthy",
      "websocket_enabled": true
    }
    """
    try:
        from .socketio_server import socketio

        return jsonify({
            'status': 'healthy',
            'websocket_enabled': socketio is not None
        }), 200

    except Exception as e:
        logger.error(f"Error in health check: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500
