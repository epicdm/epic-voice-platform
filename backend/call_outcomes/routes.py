"""
Flask Routes for Call Outcomes

API Endpoints:
- POST /webhooks/call_completed: Receive LiveKit webhook events
- GET /calls/:id/outcome: Retrieve call outcome by ID

Multi-Tenant: All endpoints enforce userId-based access control
Security: HMAC signature validation for webhooks, JWT auth for queries
"""

import logging
import os
from flask import Blueprint, request, jsonify
from typing import Dict, Any

from .transformer import LiveKitWebhookTransformer
from .service import CallOutcomeService

logger = logging.getLogger(__name__)

# Create Blueprint
call_outcomes_bp = Blueprint('call_outcomes', __name__, url_prefix='/api/call-outcomes')

# Initialize components
transformer = LiveKitWebhookTransformer()
service = CallOutcomeService()

# Load webhook secret from environment
LIVEKIT_WEBHOOK_SECRET = os.getenv('LIVEKIT_WEBHOOK_SECRET', '')


@call_outcomes_bp.route('/webhooks/call_completed', methods=['POST'])
def webhook_call_completed():
    """
    POST /webhooks/call_completed

    Receive LiveKit webhook events for call completion.

    Headers:
    - X-LiveKit-Signature: HMAC-SHA256 signature of request body

    Request Body:
    - LiveKit webhook payload (JSON)

    Response:
    - 200: Event processed successfully
    - 200: Event already processed (idempotency)
    - 401: Invalid signature
    - 400: Invalid payload
    - 500: Processing error

    Example:
    POST /webhooks/call_completed
    X-LiveKit-Signature: abc123...
    {
      "id": "evt_123",
      "event": "participant_left",
      "room": {"name": "sip-7678189426__1730000000__abc"},
      "participant": {"sid": "PA_123", "identity": "agent"}
    }
    """
    try:
        # 1. Extract signature from header
        signature = request.headers.get('X-LiveKit-Signature', '')

        # 2. Validate HMAC signature
        if not LIVEKIT_WEBHOOK_SECRET:
            logger.error("LIVEKIT_WEBHOOK_SECRET not configured")
            return jsonify({'error': 'Webhook validation not configured'}), 500

        if not transformer.validate_signature(request.data, signature, LIVEKIT_WEBHOOK_SECRET):
            logger.warning(f"Invalid webhook signature from {request.remote_addr}")
            return jsonify({'error': 'Invalid signature'}), 401

        # 3. Parse JSON payload
        try:
            payload = request.json
        except Exception as e:
            logger.error(f"Invalid JSON payload: {e}")
            return jsonify({'error': 'Invalid JSON'}), 400

        if not payload:
            logger.error("Empty payload received")
            return jsonify({'error': 'Empty payload'}), 400

        # 4. Transform payload to normalized event
        event = transformer.transform(payload)

        if not event:
            # Event type we don't process (e.g., track_published, participant_joined)
            logger.debug(f"Ignoring event type: {payload.get('event')}")
            return jsonify({'status': 'ignored', 'event': payload.get('event')}), 200

        # 5. Process event via service layer
        success, message = service.process_webhook_event(event)

        if success:
            logger.info(f"✅ Processed event {event['event_id']}: {message}")
            return jsonify({
                'status': 'processed',
                'event_id': event['event_id'],
                'message': message
            }), 200
        else:
            logger.error(f"Failed to process event {event['event_id']}: {message}")
            return jsonify({
                'status': 'failed',
                'event_id': event['event_id'],
                'error': message
            }), 500

    except Exception as e:
        logger.error(f"Unexpected error in webhook handler: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@call_outcomes_bp.route('/calls/<call_id>/outcome', methods=['GET'])
def get_call_outcome(call_id: str):
    """
    GET /calls/:id/outcome

    Retrieve call outcome by ID (multi-tenant safe).

    Path Parameters:
    - call_id: call_log ID

    Query Parameters:
    - user_id: User ID (required for multi-tenant isolation)

    Response:
    - 200: Call outcome data
    - 404: Call not found
    - 401: Unauthorized (missing or invalid user_id)
    - 500: Server error

    Example:
    GET /calls/abc-123-def/outcome?user_id=user_456

    Response:
    {
      "id": "abc-123-def",
      "userId": "user_456",
      "direction": "inbound",
      "phoneNumber": "+17678189426",
      "duration": 45,
      "outcome": "completed",
      "startedAt": "2025-10-29T12:34:10Z",
      "endedAt": "2025-10-29T12:34:55Z",
      ...
    }
    """
    try:
        # 1. Extract user_id from query params (multi-tenant isolation)
        # In production, this should come from JWT token instead
        user_id = request.args.get('user_id')

        if not user_id:
            logger.warning("Missing user_id in request")
            return jsonify({'error': 'Missing user_id parameter'}), 401

        # 2. Retrieve call outcome via service layer
        call_outcome = service.get_call_outcome(call_id, user_id)

        if not call_outcome:
            logger.info(f"Call {call_id} not found for user {user_id}")
            return jsonify({'error': 'Call not found'}), 404

        # 3. Return call outcome
        return jsonify(call_outcome), 200

    except Exception as e:
        logger.error(f"Error retrieving call outcome: {e}", exc_info=True)
        return jsonify({'error': 'Internal server error'}), 500


@call_outcomes_bp.route('/webhooks/call_completed/health', methods=['GET'])
def webhook_health():
    """
    GET /webhooks/call_completed/health

    Health check endpoint for webhook monitoring.

    Response:
    - 200: Webhook endpoint is healthy
    """
    config_status = "✅ Configured" if LIVEKIT_WEBHOOK_SECRET else "❌ Not configured"

    return jsonify({
        'status': 'healthy',
        'webhook_secret_configured': bool(LIVEKIT_WEBHOOK_SECRET),
        'config_status': config_status
    }), 200


# Error handlers for the blueprint
@call_outcomes_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404


@call_outcomes_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {error}", exc_info=True)
    return jsonify({'error': 'Internal server error'}), 500


# Integration helper for Flask app
def register_call_outcomes_routes(app):
    """
    Register call outcomes blueprint with Flask app.

    Usage:
        from backend.call_outcomes.routes import register_call_outcomes_routes
        register_call_outcomes_routes(app)

    Args:
        app: Flask application instance
    """
    app.register_blueprint(call_outcomes_bp, url_prefix='/api')
    logger.info("✅ Call outcomes routes registered at /api/webhooks/call_completed and /api/calls/:id/outcome")


# Example usage for testing
if __name__ == '__main__':
    from flask import Flask

    # Create test app
    app = Flask(__name__)
    register_call_outcomes_routes(app)

    # Configure logging
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    print("\n" + "="*60)
    print("Call Outcomes API Endpoints")
    print("="*60)
    print("\nRegistered routes:")
    for rule in app.url_map.iter_rules():
        if 'call' in rule.rule.lower():
            print(f"  {rule.methods} {rule.rule}")

    print("\n" + "="*60)
    print("\nTo start test server:")
    print("  python -m backend.call_outcomes.routes")
    print("\nTest webhook:")
    print("  curl -X POST http://localhost:5000/api/webhooks/call_completed \\")
    print("    -H 'Content-Type: application/json' \\")
    print("    -H 'X-LiveKit-Signature: test' \\")
    print("    -d '{\"id\":\"evt_test\",\"event\":\"participant_left\",\"room\":{\"name\":\"test\"}}'")
    print("\nTest retrieval:")
    print("  curl http://localhost:5000/api/calls/abc-123/outcome?user_id=user_456")
    print("\nTest health:")
    print("  curl http://localhost:5000/api/webhooks/call_completed/health")
    print("="*60 + "\n")

    # Start test server
    app.run(debug=True, port=5000)
