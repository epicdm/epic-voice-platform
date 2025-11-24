"""
Rate Limiting Management API

Admin endpoints for viewing and managing rate limits.

Endpoints:
- GET /api/rate-limits - View current rate limit configuration
- GET /api/rate-limits/stats - View rate limiting statistics
- POST /api/rate-limits/reset - Reset rate limits for a user
"""

import logging
from flask import Blueprint, jsonify, request, g

from .middleware import get_rate_limiter
from .config import format_rate_limits

logger = logging.getLogger(__name__)

# Create blueprint
rate_limits_bp = Blueprint('rate_limits', __name__, url_prefix='/api/rate-limits')


@rate_limits_bp.route('/', methods=['GET'])
def get_rate_limits():
    """
    Get current rate limit configuration.

    Returns:
        JSON with all configured rate limits
    """
    try:
        limits = format_rate_limits()

        return jsonify({
            'success': True,
            'rate_limits': limits,
            'total_endpoints': len(limits)
        }), 200

    except Exception as e:
        logger.error(f"Error fetching rate limits: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to fetch rate limits'
        }), 500


@rate_limits_bp.route('/stats', methods=['GET'])
def get_rate_limit_stats():
    """
    Get rate limiting statistics.

    Returns:
        JSON with storage statistics
    """
    try:
        limiter = get_rate_limiter()
        stats = limiter.storage.get_stats()

        return jsonify({
            'success': True,
            'stats': stats
        }), 200

    except Exception as e:
        logger.error(f"Error fetching rate limit stats: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to fetch statistics'
        }), 500


@rate_limits_bp.route('/reset', methods=['POST'])
def reset_rate_limits():
    """
    Reset rate limits for a specific user.

    Request Body:
        {
            "user_id": "user-uuid",
            "endpoint": "/api/path"  # optional
        }

    Returns:
        JSON confirmation
    """
    try:
        data = request.get_json()

        if not data or 'user_id' not in data:
            return jsonify({
                'success': False,
                'error': 'user_id is required'
            }), 400

        user_id = data['user_id']
        endpoint = data.get('endpoint')

        limiter = get_rate_limiter()
        limiter.storage.reset_user_limits(user_id, endpoint)

        logger.info(f"Rate limits reset - User: {user_id}, Endpoint: {endpoint or 'all'}")

        return jsonify({
            'success': True,
            'message': f"Rate limits reset for user {user_id}",
            'endpoint': endpoint or 'all'
        }), 200

    except Exception as e:
        logger.error(f"Error resetting rate limits: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to reset rate limits'
        }), 500


@rate_limits_bp.route('/check', methods=['POST'])
def check_rate_limit():
    """
    Check rate limit status for a user/endpoint combination.

    Request Body:
        {
            "user_id": "user-uuid",
            "endpoint": "/api/path"
        }

    Returns:
        JSON with rate limit status
    """
    try:
        data = request.get_json()

        if not data or 'user_id' not in data or 'endpoint' not in data:
            return jsonify({
                'success': False,
                'error': 'user_id and endpoint are required'
            }), 400

        user_id = data['user_id']
        endpoint = data['endpoint']

        # This is a read-only check, doesn't consume tokens
        # We'll need to add a read-only method to storage
        limiter = get_rate_limiter()

        return jsonify({
            'success': True,
            'message': 'Rate limit check endpoint - implementation pending'
        }), 200

    except Exception as e:
        logger.error(f"Error checking rate limit: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Failed to check rate limit'
        }), 500
