"""
Webhook Management API Endpoints
Provides REST API for webhook configuration, management, and delivery tracking
"""

import os
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
from flask import jsonify, request
from sqlalchemy import text
from database import SessionLocal
from webhook_events import trigger_webhook_event

def setup_webhook_endpoints(app):
    """Set up webhook management API endpoints"""

    @app.route('/api/webhooks', methods=['GET'])
    def get_webhooks():
        """Get all webhooks for current user"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()
        try:
            result = db.execute(text("""
                SELECT
                    id, url, events, active, description,
                    created_at, updated_at,
                    headers, retry_config
                FROM partner_webhooks
                WHERE user_id = :user_id
                ORDER BY created_at DESC
            """), {'user_id': user_id})

            webhooks = []
            for row in result:
                webhooks.append({
                    'id': row[0],
                    'url': row[1],
                    'events': row[2],
                    'active': row[3],
                    'description': row[4],
                    'created_at': row[5].isoformat() if row[5] else None,
                    'updated_at': row[6].isoformat() if row[6] else None,
                    'headers': row[7] or {},
                    'retry_config': row[8] or {
                        'max_retries': 3,
                        'backoff_multiplier': 2,
                        'initial_delay_seconds': 5
                    }
                })

            return jsonify({
                'success': True,
                'webhooks': webhooks
            }), 200

        except Exception as e:
            print(f"❌ Error fetching webhooks: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks', methods=['POST'])
    def create_webhook():
        """Create new webhook"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.json

        # Validate required fields
        if not data.get('url'):
            return jsonify({'error': 'URL is required'}), 400

        if not data.get('events') or len(data.get('events', [])) == 0:
            return jsonify({'error': 'At least one event must be selected'}), 400

        # Validate URL format
        url = data['url'].strip()
        if not url.startswith('http://') and not url.startswith('https://'):
            return jsonify({'error': 'URL must start with http:// or https://'}), 400

        # Validate events
        from webhook_events import WEBHOOK_EVENTS
        events = data['events']
        for event in events:
            if event not in WEBHOOK_EVENTS:
                return jsonify({'error': f'Invalid event type: {event}'}), 400

        db = SessionLocal()
        try:
            # Generate webhook secret
            secret = data.get('secret') or generate_webhook_secret()

            # Insert webhook
            webhook_id = str(uuid.uuid4())

            db.execute(text("""
                INSERT INTO partner_webhooks (
                    id, user_id, url, secret, events, active,
                    description, headers, retry_config,
                    created_at, updated_at
                ) VALUES (
                    :id, :user_id, :url, :secret, :events, true,
                    :description, :headers, :retry_config,
                    :created_at, :updated_at
                )
            """), {
                'id': webhook_id,
                'user_id': user_id,
                'url': url,
                'secret': secret,
                'events': events,
                'description': data.get('description', ''),
                'headers': data.get('headers', {}),
                'retry_config': data.get('retry_config', {
                    'max_retries': 3,
                    'backoff_multiplier': 2,
                    'initial_delay_seconds': 5
                }),
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc)
            })
            db.commit()

            return jsonify({
                'success': True,
                'webhook': {
                    'id': webhook_id,
                    'url': url,
                    'secret': secret,
                    'events': events,
                    'active': True,
                    'description': data.get('description', '')
                }
            }), 201

        except Exception as e:
            db.rollback()
            print(f"❌ Error creating webhook: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks/<webhook_id>', methods=['PUT'])
    def update_webhook(webhook_id):
        """Update existing webhook"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.json

        db = SessionLocal()
        try:
            # Check webhook exists and belongs to user
            result = db.execute(text("""
                SELECT id FROM partner_webhooks
                WHERE id = :id AND user_id = :user_id
            """), {'id': webhook_id, 'user_id': user_id})

            if not result.fetchone():
                return jsonify({'error': 'Webhook not found'}), 404

            # Build update fields
            update_fields = []
            params = {'id': webhook_id, 'updated_at': datetime.now(timezone.utc)}

            if 'url' in data:
                update_fields.append('url = :url')
                params['url'] = data['url']

            if 'events' in data:
                # Validate events
                from webhook_events import WEBHOOK_EVENTS
                for event in data['events']:
                    if event not in WEBHOOK_EVENTS:
                        return jsonify({'error': f'Invalid event type: {event}'}), 400
                update_fields.append('events = :events')
                params['events'] = data['events']

            if 'active' in data:
                update_fields.append('active = :active')
                params['active'] = data['active']

            if 'description' in data:
                update_fields.append('description = :description')
                params['description'] = data['description']

            if 'headers' in data:
                update_fields.append('headers = :headers')
                params['headers'] = data['headers']

            if 'retry_config' in data:
                update_fields.append('retry_config = :retry_config')
                params['retry_config'] = data['retry_config']

            # Always update updated_at
            update_fields.append('updated_at = :updated_at')

            if update_fields:
                query = f"""
                    UPDATE partner_webhooks
                    SET {', '.join(update_fields)}
                    WHERE id = :id
                """
                db.execute(text(query), params)
                db.commit()

            return jsonify({
                'success': True,
                'message': 'Webhook updated successfully'
            }), 200

        except Exception as e:
            db.rollback()
            print(f"❌ Error updating webhook: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks/<webhook_id>', methods=['DELETE'])
    def delete_webhook(webhook_id):
        """Delete webhook"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()
        try:
            # Check webhook exists and belongs to user
            result = db.execute(text("""
                DELETE FROM partner_webhooks
                WHERE id = :id AND user_id = :user_id
                RETURNING id
            """), {'id': webhook_id, 'user_id': user_id})

            deleted = result.fetchone()
            db.commit()

            if not deleted:
                return jsonify({'error': 'Webhook not found'}), 404

            return jsonify({
                'success': True,
                'message': 'Webhook deleted successfully'
            }), 200

        except Exception as e:
            db.rollback()
            print(f"❌ Error deleting webhook: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks/<webhook_id>/deliveries', methods=['GET'])
    def get_webhook_deliveries(webhook_id):
        """Get delivery logs for webhook"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # Get query parameters for pagination and filtering
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 50))
        status_filter = request.args.get('status')  # 'delivered', 'failed', 'pending'

        offset = (page - 1) * limit

        db = SessionLocal()
        try:
            # Verify webhook belongs to user
            result = db.execute(text("""
                SELECT id FROM partner_webhooks
                WHERE id = :id AND user_id = :user_id
            """), {'id': webhook_id, 'user_id': user_id})

            if not result.fetchone():
                return jsonify({'error': 'Webhook not found'}), 404

            # Build query with optional status filter
            where_clause = "WHERE webhook_id = :webhook_id"
            params = {'webhook_id': webhook_id, 'limit': limit, 'offset': offset}

            if status_filter:
                where_clause += " AND status = :status"
                params['status'] = status_filter

            # Get total count
            count_result = db.execute(text(f"""
                SELECT COUNT(*) FROM webhook_deliveries
                {where_clause}
            """), params)
            total_count = count_result.fetchone()[0]

            # Get deliveries (match actual schema: success, response_status, response_body)
            result = db.execute(text(f"""
                SELECT
                    id, event_type, success, response_status,
                    delivered_at, response_body, duration_ms,
                    retry_number, payload
                FROM webhook_deliveries
                {where_clause}
                ORDER BY delivered_at DESC
                LIMIT :limit OFFSET :offset
            """), params)

            deliveries = []
            for row in result:
                # Map database fields to API response format
                deliveries.append({
                    'id': row[0],
                    'event_type': row[1],
                    'event_id': row[8].get('event_id') if row[8] else None,  # Extract from payload
                    'status': 'delivered' if row[2] else 'failed',  # Convert boolean to status string
                    'status_code': row[3],  # response_status
                    'delivered_at': row[4].isoformat() if row[4] else None,
                    'error_message': row[5] if not row[2] else None,  # response_body only on failure
                    'duration_ms': row[6],
                    'retry_number': row[7],
                    'created_at': row[4].isoformat() if row[4] else None,  # Use delivered_at as created_at
                    'payload': row[8]
                })

            return jsonify({
                'success': True,
                'deliveries': deliveries,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total_count,
                    'pages': (total_count + limit - 1) // limit
                }
            }), 200

        except Exception as e:
            print(f"❌ Error fetching deliveries: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks/<webhook_id>/test', methods=['POST'])
    async def test_webhook(webhook_id):
        """Send test webhook event"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()
        try:
            # Verify webhook belongs to user and is active
            result = db.execute(text("""
                SELECT url, events FROM partner_webhooks
                WHERE id = :id AND user_id = :user_id AND active = true
            """), {'id': webhook_id, 'user_id': user_id})

            webhook = result.fetchone()
            if not webhook:
                return jsonify({'error': 'Webhook not found or inactive'}), 404

            # Trigger test event (use first subscribed event type)
            event_type = webhook[1][0] if webhook[1] else 'call.started'

            # Generate test payload
            test_payload = {
                'test': True,
                'webhook_id': webhook_id,
                'message': 'This is a test webhook delivery',
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

            # If it's a call event, add call-like data
            if event_type.startswith('call.'):
                test_payload.update({
                    'call_id': str(uuid.uuid4()),
                    'phone_number': '+15555551234',
                    'agent_id': str(uuid.uuid4()),
                })

            # If it's a campaign event, add campaign-like data
            elif event_type.startswith('campaign.'):
                test_payload.update({
                    'campaign_id': str(uuid.uuid4()),
                    'name': 'Test Campaign'
                })

            # Trigger the test event
            success = await trigger_webhook_event(event_type, test_payload, user_id)

            if success:
                return jsonify({
                    'success': True,
                    'message': 'Test webhook queued for delivery',
                    'event_type': event_type
                }), 200
            else:
                return jsonify({
                    'error': 'Failed to queue test webhook'
                }), 500

        except Exception as e:
            print(f"❌ Error sending test webhook: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    @app.route('/api/webhooks/events', methods=['GET'])
    def get_available_events():
        """Get list of all available webhook event types"""
        from webhook_events import WEBHOOK_EVENTS

        # Group events by category
        events_by_category = {
            'Call Events': [],
            'Lead Events': [],
            'Campaign Events': [],
            'Appointment Events': []
        }

        for event_type, description in WEBHOOK_EVENTS.items():
            if event_type.startswith('call.'):
                events_by_category['Call Events'].append({
                    'type': event_type,
                    'description': description
                })
            elif event_type.startswith('lead.'):
                events_by_category['Lead Events'].append({
                    'type': event_type,
                    'description': description
                })
            elif event_type.startswith('campaign.'):
                events_by_category['Campaign Events'].append({
                    'type': event_type,
                    'description': description
                })
            elif event_type.startswith('appointment.'):
                events_by_category['Appointment Events'].append({
                    'type': event_type,
                    'description': description
                })

        return jsonify({
            'success': True,
            'events': events_by_category
        }), 200

    @app.route('/api/webhooks/stats', methods=['GET'])
    def get_webhook_stats():
        """Get webhook delivery statistics for current user"""
        user_id = app.get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = SessionLocal()
        try:
            # Get overall stats
            result = db.execute(text("""
                SELECT
                    COUNT(*) as total_deliveries,
                    COUNT(*) FILTER (WHERE success = true) as successful,
                    COUNT(*) FILTER (WHERE success = false) as failed,
                    0 as pending,
                    AVG(duration_ms) FILTER (WHERE success = true) as avg_duration
                FROM webhook_deliveries wd
                JOIN partner_webhooks pw ON wd.webhook_id = pw.id
                WHERE pw.user_id = :user_id
            """), {'user_id': user_id})

            stats = result.fetchone()

            return jsonify({
                'success': True,
                'stats': {
                    'total_deliveries': stats[0] or 0,
                    'successful': stats[1] or 0,
                    'failed': stats[2] or 0,
                    'pending': stats[3] or 0,
                    'avg_duration_ms': round(stats[4], 2) if stats[4] else 0,
                    'success_rate': round((stats[1] / stats[0] * 100), 2) if stats[0] > 0 else 0
                }
            }), 200

        except Exception as e:
            print(f"❌ Error fetching webhook stats: {e}")
            return jsonify({'error': str(e)}), 500
        finally:
            db.close()

    print("✅ Webhook API endpoints registered")
    return app


def generate_webhook_secret():
    """Generate a secure random webhook secret"""
    return hmac.new(
        os.urandom(32),
        msg=str(uuid.uuid4()).encode('utf-8'),
        digestmod=hashlib.sha256
    ).hexdigest()
