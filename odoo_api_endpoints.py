"""
Odoo CRM Integration API Endpoints
Provides endpoints for syncing contacts from Odoo to Epic Voice
"""
from flask import jsonify, request
import logging
from typing import Optional
from integrations.odoo_sync import OdooSyncService
from database import SessionLocal
from sqlalchemy import text
import threading

logger = logging.getLogger(__name__)

# Track ongoing sync operations per user
sync_status = {}
sync_lock = threading.Lock()


def setup_odoo_endpoints(app):
    """
    Register Odoo integration endpoints with Flask app

    Endpoints:
    - POST /api/odoo/test-connection - Test Odoo connection
    - POST /api/odoo/sync - Trigger contact sync
    - GET /api/odoo/sync/status - Get sync status
    - GET /api/odoo/config - Get Odoo configuration
    - POST /api/odoo/config - Save Odoo configuration
    """

    @app.route('/api/odoo/test-connection', methods=['POST'])
    def test_odoo_connection():
        """
        Test Odoo connection with provided credentials

        Request Body:
        {
            "odoo_url": "https://mycompany.odoo.com",
            "odoo_database": "mycompany_prod",
            "odoo_username": "integration@company.com",
            "odoo_api_key": "odoo_api_key_here"
        }

        Response:
        {
            "success": true,
            "contact_count": 150,
            "message": "Connection successful"
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.json

        # Validate required fields
        required = ['odoo_url', 'odoo_database', 'odoo_username']
        missing = [f for f in required if not data.get(f)]

        if missing:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400

        # At least one auth method required
        if not data.get('odoo_api_key') and not data.get('odoo_password'):
            return jsonify({
                'success': False,
                'error': 'Either odoo_api_key or odoo_password is required'
            }), 400

        try:
            # Create sync service
            sync_service = OdooSyncService(
                user_id=user_id,
                odoo_url=data['odoo_url'],
                odoo_database=data['odoo_database'],
                odoo_username=data['odoo_username'],
                odoo_api_key=data.get('odoo_api_key'),
                odoo_password=data.get('odoo_password')
            )

            # Test connection
            if sync_service.test_connection():
                # Get contact count
                contact_count = sync_service.odoo_client.count_contacts()

                return jsonify({
                    'success': True,
                    'contact_count': contact_count,
                    'message': f'Connection successful! Found {contact_count} contacts.'
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'Authentication failed. Please check your credentials.'
                }), 401

        except Exception as e:
            logger.error(f"Odoo connection test failed: {e}")
            return jsonify({
                'success': False,
                'error': f'Connection test failed: {str(e)}'
            }), 500

    @app.route('/api/odoo/sync', methods=['POST'])
    def trigger_odoo_sync():
        """
        Trigger Odoo contact sync

        Request Body:
        {
            "batch_size": 100,  // Optional, default 100
            "max_contacts": null  // Optional, null = all contacts
        }

        Response:
        {
            "success": true,
            "sync_id": "sync_123abc",
            "message": "Sync started"
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Check if sync already in progress
        with sync_lock:
            if user_id in sync_status and sync_status[user_id].get('status') == 'in_progress':
                return jsonify({
                    'success': False,
                    'error': 'Sync already in progress'
                }), 409

        # Get Odoo config from crm_connections table
        db = SessionLocal()

        try:
            config_row = db.execute(
                text("""
                    SELECT access_token, settings FROM crm_connections
                    WHERE user_id = :user_id AND provider = 'odoo' AND active = true
                    LIMIT 1
                """),
                {'user_id': user_id}
            ).fetchone()

            if not config_row:
                return jsonify({
                    'success': False,
                    'error': 'No Odoo configuration found. Please configure Odoo integration first.'
                }), 400

            api_key = config_row[0]
            settings = config_row[1] or {}

            # Validate config
            required = ['odoo_url', 'odoo_database', 'odoo_username']
            missing = [f for f in required if not settings.get(f)]

            if missing:
                return jsonify({
                    'success': False,
                    'error': f'Invalid Odoo configuration: missing {", ".join(missing)}'
                }), 400

            # Build config dict
            odoo_config = {
                'odoo_url': settings['odoo_url'],
                'odoo_database': settings['odoo_database'],
                'odoo_username': settings['odoo_username'],
                'odoo_api_key': api_key,
                'odoo_password': settings.get('odoo_password')
            }

        finally:
            db.close()

        # Get sync parameters
        data = request.json or {}
        batch_size = data.get('batch_size', 100)
        max_contacts = data.get('max_contacts')

        # Start sync in background thread
        sync_id = f"sync_{user_id}_{int(__import__('time').time())}"

        def run_sync():
            """Background sync task"""
            with sync_lock:
                sync_status[user_id] = {
                    'sync_id': sync_id,
                    'status': 'in_progress',
                    'started_at': __import__('datetime').datetime.now().isoformat()
                }

            try:
                # Create sync service
                sync_service = OdooSyncService(
                    user_id=user_id,
                    odoo_url=odoo_config['odoo_url'],
                    odoo_database=odoo_config['odoo_database'],
                    odoo_username=odoo_config['odoo_username'],
                    odoo_api_key=odoo_config.get('odoo_api_key'),
                    odoo_password=odoo_config.get('odoo_password')
                )

                # Run sync
                results = sync_service.sync_contacts(
                    batch_size=batch_size,
                    max_contacts=max_contacts
                )

                # Update status
                with sync_lock:
                    sync_status[user_id] = {
                        'sync_id': sync_id,
                        'status': 'completed',
                        'started_at': sync_status[user_id]['started_at'],
                        'completed_at': __import__('datetime').datetime.now().isoformat(),
                        'results': results
                    }

            except Exception as e:
                logger.error(f"Sync failed for user {user_id}: {e}")
                with sync_lock:
                    sync_status[user_id] = {
                        'sync_id': sync_id,
                        'status': 'failed',
                        'started_at': sync_status[user_id]['started_at'],
                        'error': str(e)
                    }

        # Start background thread
        thread = threading.Thread(target=run_sync, daemon=True)
        thread.start()

        return jsonify({
            'success': True,
            'sync_id': sync_id,
            'message': 'Sync started in background'
        })

    @app.route('/api/odoo/sync/status', methods=['GET'])
    def get_sync_status():
        """
        Get current sync status

        Response:
        {
            "sync_id": "sync_123abc",
            "status": "in_progress",  // in_progress, completed, failed
            "started_at": "2025-10-30T12:00:00",
            "results": {...}  // Only present when completed
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        with sync_lock:
            status = sync_status.get(user_id)

        if not status:
            return jsonify({
                'status': 'idle',
                'message': 'No sync has been run yet'
            })

        return jsonify(status)

    @app.route('/api/odoo/config', methods=['GET'])
    def get_odoo_config():
        """
        Get Odoo configuration (without sensitive fields)

        Response:
        {
            "configured": true,
            "odoo_url": "https://mycompany.odoo.com",
            "odoo_database": "mycompany_prod",
            "odoo_username": "integration@company.com",
            "last_synced_at": "2025-10-30T12:00:00"
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()

        try:
            config_row = db.execute(
                text("""
                    SELECT settings, active, last_synced_at, access_token FROM crm_connections
                    WHERE user_id = :user_id AND provider = 'odoo'
                    LIMIT 1
                """),
                {'user_id': user_id}
            ).fetchone()

            if not config_row:
                return jsonify({'configured': False})

            settings = config_row[0] or {}
            active = config_row[1]
            last_synced_at = config_row[2]
            has_api_key = bool(config_row[3])

            # Return config without sensitive fields
            return jsonify({
                'configured': True,
                'active': active,
                'odoo_url': settings.get('odoo_url'),
                'odoo_database': settings.get('odoo_database'),
                'odoo_username': settings.get('odoo_username'),
                'has_api_key': has_api_key,
                'has_password': bool(settings.get('odoo_password')),
                'last_synced_at': last_synced_at.isoformat() if last_synced_at else None
            })

        finally:
            db.close()

    @app.route('/api/odoo/config', methods=['POST'])
    def save_odoo_config():
        """
        Save Odoo configuration

        Request Body:
        {
            "odoo_url": "https://mycompany.odoo.com",
            "odoo_database": "mycompany_prod",
            "odoo_username": "integration@company.com",
            "odoo_api_key": "odoo_api_key_here",  // Optional
            "odoo_password": "password_here"  // Optional
        }

        Response:
        {
            "success": true,
            "message": "Configuration saved successfully"
        }
        """
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.json

        # Validate required fields
        required = ['odoo_url', 'odoo_database', 'odoo_username']
        missing = [f for f in required if not data.get(f)]

        if missing:
            return jsonify({
                'success': False,
                'error': f'Missing required fields: {", ".join(missing)}'
            }), 400

        # At least one auth method required
        if not data.get('odoo_api_key') and not data.get('odoo_password'):
            return jsonify({
                'success': False,
                'error': 'Either odoo_api_key or odoo_password is required'
            }), 400

        db = SessionLocal()

        try:
            # Build settings dict
            settings = {
                'odoo_url': data['odoo_url'],
                'odoo_database': data['odoo_database'],
                'odoo_username': data['odoo_username']
            }

            # Store password in settings if provided (API key goes in access_token)
            if data.get('odoo_password'):
                settings['odoo_password'] = data['odoo_password']

            # Upsert crm_connection record
            db.execute(
                text("""
                    INSERT INTO crm_connections (
                        user_id, provider, access_token, settings, active
                    ) VALUES (
                        :user_id, 'odoo', :access_token, :settings::jsonb, true
                    )
                    ON CONFLICT (user_id, provider)
                    DO UPDATE SET
                        access_token = EXCLUDED.access_token,
                        settings = EXCLUDED.settings,
                        active = true,
                        updated_at = NOW()
                """),
                {
                    'user_id': user_id,
                    'access_token': data.get('odoo_api_key', ''),
                    'settings': settings
                }
            )
            db.commit()

            logger.info(f"✅ Saved Odoo config for user {user_id}")

            return jsonify({
                'success': True,
                'message': 'Configuration saved successfully'
            })

        except Exception as e:
            db.rollback()
            logger.error(f"Error saving Odoo config: {e}")
            return jsonify({
                'success': False,
                'error': f'Failed to save configuration: {str(e)}'
            }), 500

        finally:
            db.close()

    logger.info("✅ Odoo integration endpoints registered")
    return app
