"""
Admin Settings API Routes
Admin-only endpoints for managing system-wide settings
"""

import logging
from flask import Blueprint, request, jsonify
from flask_cors import cross_origin
from database import SessionLocal
from backend.admin_settings.models import SystemSetting
from backend.admin_settings.service import SystemSettingsService, AdminDashboardService

logger = logging.getLogger(__name__)

admin_settings_api = Blueprint('admin_settings_api', __name__, url_prefix='/api/admin/settings')
admin_dashboard_api = Blueprint('admin_dashboard_api', __name__, url_prefix='/api/admin')
service = SystemSettingsService()
dashboard_service = AdminDashboardService()


def is_admin():
    """
    Check if current user is admin.
    For now, simple check. Can be enhanced with proper admin role system.
    """
    from flask import session
    # TODO: Implement proper admin role check
    # For now, any authenticated user is admin (ISP/owner)
    return 'user_id' in session or request.headers.get('X-Admin-Auth') == 'true'


@admin_settings_api.route('', methods=['GET'])
@cross_origin()
def list_settings():
    """
    List all system settings.

    GET /api/admin/settings
    Query params:
        - category: Filter by category (optional)
        - include_secrets: Include secret values (default: false)

    Returns:
        {
            "success": true,
            "data": [
                {
                    "id": "uuid",
                    "category": "sip",
                    "key": "sip_domain",
                    "value": "voice.epic.dm",
                    "description": "...",
                    "is_secret": false,
                    ...
                }
            ],
            "count": 22
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        category = request.args.get('category')
        include_secrets = request.args.get('include_secrets', 'false').lower() == 'true'

        settings = service.list_settings(db, category=category)

        return jsonify({
            'success': True,
            'data': [s.to_dict(include_secret=include_secrets) for s in settings],
            'count': len(settings)
        })

    except Exception as e:
        logger.error(f"Error listing settings: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to list settings', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/categories', methods=['GET'])
@cross_origin()
def list_categories():
    """
    Get list of setting categories.

    GET /api/admin/settings/categories

    Returns:
        {
            "success": true,
            "data": [
                {"category": "sip", "count": 5},
                {"category": "email", "count": 6},
                ...
            ]
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        categories = service.get_categories(db)

        return jsonify({
            'success': True,
            'data': categories
        })

    except Exception as e:
        logger.error(f"Error listing categories: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to list categories', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/<setting_id>', methods=['GET'])
@cross_origin()
def get_setting(setting_id: str):
    """
    Get a specific setting.

    GET /api/admin/settings/{id}
    Query params:
        - include_secret: Include secret value (default: false)

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        include_secret = request.args.get('include_secret', 'false').lower() == 'true'
        setting = service.get_setting(db, setting_id)

        if not setting:
            return jsonify({
                'success': False,
                'error': {'message': 'Setting not found', 'code': 'NOT_FOUND'}
            }), 404

        return jsonify({
            'success': True,
            'data': setting.to_dict(include_secret=include_secret)
        })

    except Exception as e:
        logger.error(f"Error getting setting: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to get setting', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/by-key/<key>', methods=['GET'])
@cross_origin()
def get_setting_by_key(key: str):
    """
    Get a setting by its key.

    GET /api/admin/settings/by-key/{key}

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        include_secret = request.args.get('include_secret', 'false').lower() == 'true'
        setting = service.get_setting_by_key(db, key)

        if not setting:
            return jsonify({
                'success': False,
                'error': {'message': 'Setting not found', 'code': 'NOT_FOUND'}
            }), 404

        return jsonify({
            'success': True,
            'data': setting.to_dict(include_secret=include_secret)
        })

    except Exception as e:
        logger.error(f"Error getting setting by key: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to get setting', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/<setting_id>', methods=['PUT', 'PATCH'])
@cross_origin()
def update_setting(setting_id: str):
    """
    Update a setting value.

    PUT/PATCH /api/admin/settings/{id}
    Body:
        {
            "value": "new-value"
        }

    Returns:
        {
            "success": true,
            "data": {...}
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    data = request.json
    if not data or 'value' not in data:
        return jsonify({
            'success': False,
            'error': {'message': 'Value is required', 'code': 'MISSING_VALUE'}
        }), 400

    db = SessionLocal()
    try:
        # Get admin user ID from session (for audit trail)
        from flask import session
        admin_user_id = session.get('user_id', 'admin')

        setting = service.update_setting(
            db,
            setting_id,
            value=data['value'],
            updated_by=admin_user_id
        )

        if not setting:
            return jsonify({
                'success': False,
                'error': {'message': 'Setting not found', 'code': 'NOT_FOUND'}
            }), 404

        logger.info(f"Admin {admin_user_id} updated setting {setting.key} = {setting.value if not setting.is_secret else '***'}")

        return jsonify({
            'success': True,
            'data': setting.to_dict(include_secret=False)
        })

    except ValueError as ve:
        return jsonify({
            'success': False,
            'error': {'message': str(ve), 'code': 'VALIDATION_ERROR'}
        }), 400
    except Exception as e:
        logger.error(f"Error updating setting: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to update setting', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/bulk-update', methods=['POST'])
@cross_origin()
def bulk_update_settings():
    """
    Update multiple settings at once.

    POST /api/admin/settings/bulk-update
    Body:
        {
            "updates": [
                {"id": "uuid", "value": "new-value"},
                {"key": "sip_domain", "value": "new-sip.example.com"},
                ...
            ]
        }

    Returns:
        {
            "success": true,
            "updated": 5,
            "failed": 0,
            "errors": []
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    data = request.json
    if not data or 'updates' not in data:
        return jsonify({
            'success': False,
            'error': {'message': 'Updates array is required', 'code': 'MISSING_UPDATES'}
        }), 400

    db = SessionLocal()
    try:
        from flask import session
        admin_user_id = session.get('user_id', 'admin')

        result = service.bulk_update_settings(
            db,
            updates=data['updates'],
            updated_by=admin_user_id
        )

        return jsonify({
            'success': True,
            **result
        })

    except Exception as e:
        logger.error(f"Error bulk updating settings: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to bulk update settings', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()


@admin_settings_api.route('/test-connection', methods=['POST'])
@cross_origin()
def test_connection():
    """
    Test connection to a service (SMTP, SIP, SMS, etc.).

    POST /api/admin/settings/test-connection
    Body:
        {
            "service": "smtp" | "sip" | "sms",
            "settings": {
                "smtp_host": "...",
                "smtp_port": "...",
                ...
            }
        }

    Returns:
        {
            "success": true,
            "result": {
                "status": "success" | "failed",
                "message": "...",
                "details": {...}
            }
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    data = request.json
    if not data or 'service' not in data:
        return jsonify({
            'success': False,
            'error': {'message': 'Service type is required', 'code': 'MISSING_SERVICE'}
        }), 400

    db = SessionLocal()
    try:
        result = service.test_connection(
            db,
            service_type=data['service'],
            settings=data.get('settings', {})
        )

        return jsonify({
            'success': True,
            'result': result
        })

    except Exception as e:
        logger.error(f"Error testing connection: {e}")
        return jsonify({
            'success': False,
            'error': {'message': f'Failed to test connection: {str(e)}', 'code': 'TEST_FAILED'}
        }), 500
    finally:
        db.close()


@admin_dashboard_api.route('/dashboard', methods=['GET'])
@cross_origin()
def get_dashboard_metrics():
    """
    Get admin dashboard metrics.

    GET /api/admin/dashboard

    Returns:
        {
            "success": true,
            "data": {
                "metrics": {
                    "totalUsers": 1247,
                    "activeUsers": 892,
                    "callsToday": 3456,
                    "callsThisMonth": 89234,
                    "apiRequests": 234567,
                    "errorRate": 0.3,
                    "avgLatency": 145,
                    "callsInProgress": 23
                },
                "systemHealth": [...],
                "recentAlerts": [...]
            }
        }
    """
    if not is_admin():
        return jsonify({
            'success': False,
            'error': {'message': 'Admin access required', 'code': 'UNAUTHORIZED'}
        }), 401

    db = SessionLocal()
    try:
        metrics = dashboard_service.get_dashboard_metrics(db)

        return jsonify({
            'success': True,
            'data': metrics
        })

    except Exception as e:
        logger.error(f"Error getting dashboard metrics: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Failed to get dashboard metrics', 'code': 'SERVER_ERROR'}
        }), 500
    finally:
        db.close()
