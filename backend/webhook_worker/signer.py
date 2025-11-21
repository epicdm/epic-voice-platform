"""
HMAC-SHA256 webhook signature generation and verification.

This module provides timing-attack safe webhook signing for partner webhook deliveries.
"""

import hmac
import hashlib
import time
from typing import Dict, Any
import json


class WebhookSigner:
    """HMAC-SHA256 webhook signature generator and verifier."""

    @staticmethod
    def generate_signature(payload: Dict[str, Any], secret: str, timestamp: int) -> str:
        """
        Generate HMAC-SHA256 signature for webhook payload.

        Args:
            payload: Webhook payload dictionary
            secret: Partner webhook secret
            timestamp: Unix timestamp for signature

        Returns:
            Hex-encoded HMAC-SHA256 signature

        Example:
            >>> signer = WebhookSigner()
            >>> payload = {"event": "call.completed", "data": {...}}
            >>> secret = "partner_secret_key"
            >>> timestamp = int(time.time())
            >>> signature = signer.generate_signature(payload, secret, timestamp)
            >>> print(signature)
            'a3f5e8d9...'
        """
        # Canonical payload representation
        payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))

        # Signature message: timestamp.payload
        message = f"{timestamp}.{payload_json}"

        # HMAC-SHA256 signature
        signature = hmac.new(
            key=secret.encode('utf-8'),
            msg=message.encode('utf-8'),
            digestmod=hashlib.sha256
        ).hexdigest()

        return signature

    @staticmethod
    def verify_signature(
        payload: Dict[str, Any],
        secret: str,
        provided_signature: str,
        provided_timestamp: int,
        tolerance_seconds: int = 300
    ) -> bool:
        """
        Verify HMAC-SHA256 webhook signature (timing-attack safe).

        Args:
            payload: Received webhook payload
            secret: Partner webhook secret
            provided_signature: Signature from X-Webhook-Signature header
            provided_timestamp: Timestamp from X-Webhook-Timestamp header
            tolerance_seconds: Maximum age of webhook (default 5 minutes)

        Returns:
            True if signature is valid and timestamp is within tolerance

        Example:
            >>> signer = WebhookSigner()
            >>> payload = {"event": "call.completed"}
            >>> secret = "partner_secret_key"
            >>> signature = "a3f5e8d9..."
            >>> timestamp = 1730000000
            >>> valid = signer.verify_signature(payload, secret, signature, timestamp)
            >>> print(valid)
            True
        """
        # Check timestamp tolerance (prevent replay attacks)
        current_timestamp = int(time.time())
        if abs(current_timestamp - provided_timestamp) > tolerance_seconds:
            return False

        # Generate expected signature
        expected_signature = WebhookSigner.generate_signature(
            payload=payload,
            secret=secret,
            timestamp=provided_timestamp
        )

        # Timing-attack safe comparison
        return hmac.compare_digest(
            expected_signature.encode('utf-8'),
            provided_signature.encode('utf-8')
        )

    @staticmethod
    def create_webhook_headers(payload: Dict[str, Any], secret: str) -> Dict[str, str]:
        """
        Create complete webhook headers with signature and timestamp.

        Args:
            payload: Webhook payload to sign
            secret: Partner webhook secret

        Returns:
            Dictionary of HTTP headers to include in webhook request

        Example:
            >>> signer = WebhookSigner()
            >>> payload = {"event": "call.completed", "data": {...}}
            >>> secret = "partner_secret_key"
            >>> headers = signer.create_webhook_headers(payload, secret)
            >>> print(headers)
            {
                'Content-Type': 'application/json',
                'X-Webhook-Signature': 'a3f5e8d9...',
                'X-Webhook-Timestamp': '1730000000'
            }
        """
        timestamp = int(time.time())
        signature = WebhookSigner.generate_signature(payload, secret, timestamp)

        return {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': str(timestamp),
            'User-Agent': 'LiveKit-Webhook-Worker/1.0'
        }


def verify_incoming_webhook(
    payload_str: str,
    signature: str,
    timestamp_str: str,
    secret: str,
    tolerance: int = 300
) -> bool:
    """
    Convenience function for verifying incoming webhooks from partners.

    Args:
        payload_str: Raw JSON payload string
        signature: X-Webhook-Signature header value
        timestamp_str: X-Webhook-Timestamp header value
        secret: Partner webhook secret
        tolerance: Maximum age in seconds (default 5 minutes)

    Returns:
        True if signature is valid

    Example:
        >>> from flask import request
        >>>
        >>> @app.route('/webhooks/partner', methods=['POST'])
        >>> def receive_partner_webhook():
        >>>     payload_str = request.get_data(as_text=True)
        >>>     signature = request.headers.get('X-Webhook-Signature')
        >>>     timestamp = request.headers.get('X-Webhook-Timestamp')
        >>>
        >>>     if not verify_incoming_webhook(payload_str, signature, timestamp, PARTNER_SECRET):
        >>>         return {'error': 'Invalid signature'}, 401
        >>>
        >>>     payload = json.loads(payload_str)
        >>>     # Process webhook...
        >>>     return {'status': 'success'}, 200
    """
    try:
        payload = json.loads(payload_str)
        timestamp = int(timestamp_str)

        return WebhookSigner.verify_signature(
            payload=payload,
            secret=secret,
            provided_signature=signature,
            provided_timestamp=timestamp,
            tolerance_seconds=tolerance
        )
    except (json.JSONDecodeError, ValueError, TypeError):
        return False
