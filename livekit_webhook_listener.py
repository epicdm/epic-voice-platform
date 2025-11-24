#!/usr/bin/env python3
"""
LiveKit Webhook Listener
Receives and validates webhook events from LiveKit Cloud for call outcome tracking
"""

import json
import logging
from typing import Dict, Any, Optional
from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from livekit import api

logger = logging.getLogger(__name__)

class LiveKitWebhookListener:
    """
    Validates and routes LiveKit webhook events using LiveKit SDK

    Handles:
    - JWT token validation (using LiveKit API key/secret)
    - Event parsing and normalization
    - Event routing to processor
    """

    def __init__(self, api_key: str, api_secret: str):
        """
        Initialize webhook listener

        Args:
            api_key: LiveKit API key
            api_secret: LiveKit API secret
        """
        self.api_key = api_key
        self.api_secret = api_secret
        # Create token verifier and webhook receiver for proper webhook validation
        token_verifier = api.TokenVerifier(api_key, api_secret)
        self.webhook_receiver = api.WebhookReceiver(token_verifier)
        logger.info("LiveKit webhook listener initialized with SDK WebhookReceiver")

    def validate_and_parse(self, body: str, auth_header: str) -> Optional[Dict[str, Any]]:
        """
        Validate JWT token and parse webhook payload using LiveKit SDK

        Args:
            body: Raw request body string
            auth_header: Authorization header value (Bearer <token>)

        Returns:
            Parsed webhook event dict or None if validation fails
        """
        if not auth_header:
            logger.warning("Missing Authorization header")
            return None

        try:
            # Extract token - handle both "Bearer <token>" and raw token formats
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove "Bearer " prefix
            elif auth_header and not auth_header.startswith('Bearer'):
                # LiveKit Cloud might send raw token without "Bearer " prefix
                token = auth_header
                logger.info("Received webhook token without 'Bearer ' prefix")
            else:
                logger.warning("Invalid Authorization header format")
                return None

            # Use WebhookReceiver to validate and parse the webhook
            # This handles JWT verification AND payload validation
            try:
                webhook_event = self.webhook_receiver.receive(body, token)
            except Exception as verify_error:
                logger.error(f"❌ Webhook signature verification failed")
                logger.error(f"Token preview: {token[:50]}..." if len(token) > 50 else f"Token: {token}")
                logger.error(f"Using API Key: {self.api_key}")
                logger.error(f"Error: {verify_error}")
                raise

            # Convert webhook event to dict
            # The WebhookEvent object has the event type and data
            event_data = json.loads(body)  # Parse the original body for complete data

            logger.info(f"✅ Webhook validated successfully for event: {event_data.get('event')}")
            return event_data

        except Exception as e:
            # Handle JWT validation failures and other errors
            logger.warning(f"Webhook validation failed: {e}")
            return None

    def parse_event(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Parse and normalize LiveKit event payload

        Args:
            payload: Raw webhook payload from LiveKit

        Returns:
            Normalized event dict or None if not processable
        """
        try:
            event_type = payload.get('event')

            # We only care about call-ending events
            processable_events = [
                'participant_left',      # Participant disconnected
                'room_finished',         # Room closed
                'egress_ended'           # Recording finished
            ]

            if event_type not in processable_events:
                logger.debug(f"Ignoring event type: {event_type}")
                return None

            # Extract core event data
            event_id = payload.get('id')
            created_at = payload.get('createdAt')  # ISO 8601 timestamp

            # Room information
            room = payload.get('room', {})
            room_name = room.get('name')

            # Participant information (if applicable)
            participant = payload.get('participant', {})
            participant_sid = participant.get('sid')
            participant_identity = participant.get('identity')
            disconnect_reason = participant.get('disconnectReason', '')

            # Egress information (if applicable)
            egress_info = payload.get('egressInfo', {})
            recording_url = egress_info.get('fileResults', [{}])[0].get('download_url')

            if not event_id or not room_name:
                logger.error("Missing required fields in webhook payload")
                return None

            # Build normalized event
            normalized = {
                'event_id': event_id,
                'event_type': event_type,
                'room_name': room_name,
                'participant_sid': participant_sid,
                'participant_identity': participant_identity,
                'disconnect_reason': disconnect_reason,
                'recording_url': recording_url,
                'created_at': created_at,
                'raw_payload': payload  # Store full payload for debugging
            }

            logger.info(f"Parsed event {event_id} for room {room_name}")
            return normalized

        except Exception as e:
            logger.error(f"Error parsing webhook payload: {e}", exc_info=True)
            return None


def create_webhook_endpoint(app, processor, api_key: str, api_secret: str):
    """
    Register LiveKit webhook endpoint with Flask app

    Args:
        app: Flask application instance
        processor: CallOutcomeProcessor instance
        api_key: LiveKit API key for JWT validation
        api_secret: LiveKit API secret for JWT validation
    """

    listener = LiveKitWebhookListener(api_key, api_secret)

    @app.route('/api/webhooks/livekit', methods=['POST'])
    def handle_livekit_webhook():
        """
        POST /api/webhooks/livekit

        Receive LiveKit webhook events

        Headers:
        - Authorization: Bearer <JWT token signed with API secret>

        Response:
        - 200: Event accepted and processed
        - 401: Invalid token
        - 400: Invalid payload
        - 500: Processing error
        """
        try:
            # Get Authorization header and raw body
            auth_header = request.headers.get('Authorization', '')
            body = request.data.decode('utf-8')

            # DEBUG: Log what we received
            logger.info(f"🔍 Webhook received")
            logger.info(f"🔍 Auth header preview: {auth_header[:50] if auth_header else 'None'}...")
            logger.info(f"🔍 Body preview: {body[:100] if body else 'None'}...")
            logger.info(f"🔍 Content-Type: {request.headers.get('Content-Type')}")

            # Validate JWT token and parse payload
            payload = listener.validate_and_parse(body, auth_header)

            if not payload:
                logger.warning(f"Invalid webhook token from {request.remote_addr}")
                return jsonify({'error': 'Invalid authorization'}), 401

            # Parse and normalize event
            event = listener.parse_event(payload)

            if not event:
                # Event type we don't process (e.g., track_published)
                logger.debug(f"Ignoring event type: {payload.get('event')}")
                return jsonify({'status': 'ignored'}), 200

            # Process event asynchronously
            # Note: In production, this should use a task queue (Celery, Redis Queue, etc.)
            # For now, we process synchronously since it's fast (<100ms)
            try:
                success = processor.process_call_outcome(event)

                if success:
                    logger.info(f"✅ Processed event {event['event_id']} for room {event['room_name']}")
                    return jsonify({
                        'status': 'processed',
                        'event_id': event['event_id']
                    }), 200
                else:
                    logger.warning(f"Failed to process event {event['event_id']}")
                    return jsonify({
                        'status': 'failed',
                        'event_id': event['event_id']
                    }), 200  # Return 200 to prevent retries

            except Exception as e:
                logger.error(f"Error processing event: {e}", exc_info=True)
                return jsonify({'error': 'Processing error'}), 500

        except Exception as e:
            logger.error(f"Unexpected error in webhook handler: {e}", exc_info=True)
            return jsonify({'error': 'Internal error'}), 500

    logger.info("LiveKit webhook endpoint registered at /api/webhooks/livekit")
    return app


def validate_webhook_config(api_key: str, api_secret: str) -> bool:
    """
    Validate that webhook configuration is properly set

    Args:
        api_key: LiveKit API key
        api_secret: LiveKit API secret

    Returns:
        True if configuration is valid
    """
    if not api_key or not api_secret:
        logger.error("LIVEKIT_API_KEY or LIVEKIT_API_SECRET not configured")
        return False

    if len(api_secret) < 20:
        logger.warning("LIVEKIT_API_SECRET seems too short")
        return False

    logger.info("✅ LiveKit webhook configuration validated")
    return True


# Example usage for testing
if __name__ == '__main__':
    # Test signature validation
    import os
    from dotenv import load_dotenv

    load_dotenv()

    secret = os.getenv('LIVEKIT_WEBHOOK_SECRET', 'test-secret-key')
    listener = LiveKitWebhookListener(secret)

    # Test payload
    test_payload = json.dumps({
        'id': 'evt_test123',
        'event': 'participant_left',
        'room': {'name': 'test-room'},
        'participant': {'sid': 'PA_123'},
        'createdAt': datetime.now(timezone.utc).isoformat()
    }).encode()

    # Compute test signature
    test_signature = hmac.new(
        secret.encode(),
        test_payload,
        hashlib.sha256
    ).hexdigest()

    # Validate
    is_valid = listener.validate_signature(test_payload, test_signature)
    print(f"Signature validation: {'✅ PASS' if is_valid else '❌ FAIL'}")

    # Parse event
    event = listener.parse_event(json.loads(test_payload))
    print(f"Event parsing: {'✅ PASS' if event else '❌ FAIL'}")

    if event:
        print(f"Parsed event: {json.dumps(event, indent=2, default=str)}")
