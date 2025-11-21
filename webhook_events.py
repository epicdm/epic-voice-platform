#!/usr/bin/env python3
"""
Webhook Event System
Triggers and queues webhook events for async delivery to configured endpoints
"""

import os
import uuid
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import text
from database import SessionLocal

logger = logging.getLogger(__name__)

# Define all supported webhook event types
WEBHOOK_EVENTS = {
    # Call Lifecycle Events
    'call.started': 'Call initiated and connected',
    'call.completed': 'Call ended successfully',
    'call.failed': 'Call failed to connect or errored',
    'call.no_answer': 'Call went unanswered',
    'call.busy': 'Called party was busy',

    # Lead Events (from campaigns)
    'lead.contacted': 'Lead successfully contacted',
    'lead.qualified': 'Lead marked as qualified',
    'lead.converted': 'Lead converted to customer',
    'lead.failed': 'Lead contact attempts exhausted',
    'lead.updated': 'Lead information updated',

    # Campaign Events
    'campaign.started': 'Campaign execution began',
    'campaign.completed': 'Campaign finished all calls',
    'campaign.paused': 'Campaign paused by user',
    'campaign.resumed': 'Campaign resumed',

    # Appointment Events (future)
    'appointment.requested': 'Agent requested appointment',
    'appointment.scheduled': 'Appointment booked in calendar',
    'appointment.cancelled': 'Appointment cancelled',
    'appointment.rescheduled': 'Appointment time changed'
}

class WebhookEventSystem:
    """
    Central webhook event system for Epic Voice platform

    Features:
    - Event validation and sanitization
    - Async event queuing
    - User subscription checking
    - Idempotency enforcement
    """

    def __init__(self):
        """Initialize webhook event system"""
        self.enabled = os.getenv('WEBHOOKS_ENABLED', 'true').lower() == 'true'
        logger.info(f"Webhook Event System initialized (enabled={self.enabled})")

    def validate_event_type(self, event_type: str) -> bool:
        """
        Validate that event type is supported

        Args:
            event_type: Event type to validate

        Returns:
            True if valid event type
        """
        return event_type in WEBHOOK_EVENTS

    def sanitize_payload(self, data: dict) -> dict:
        """
        Sanitize event payload to remove sensitive data

        Args:
            data: Raw event data

        Returns:
            Sanitized data safe for webhooks
        """
        # Create a copy to avoid mutating original
        sanitized = data.copy()

        # Remove sensitive fields if present
        sensitive_fields = [
            'password', 'secret', 'token', 'api_key',
            'access_token', 'refresh_token', 'private_key'
        ]

        for field in sensitive_fields:
            if field in sanitized:
                sanitized[field] = '[REDACTED]'

        return sanitized

    async def get_subscribed_webhooks(
        self,
        user_id: str,
        event_type: str
    ) -> List[Dict[str, Any]]:
        """
        Get all active webhook endpoints subscribed to this event type

        Args:
            user_id: User ID to check webhooks for
            event_type: Event type to filter by

        Returns:
            List of webhook configurations
        """
        db = SessionLocal()

        try:
            result = db.execute(text("""
                SELECT id, url, secret, events
                FROM partner_webhooks
                WHERE user_id = :user_id
                  AND active = true
                  AND :event_type = ANY(events)
            """), {
                'user_id': user_id,
                'event_type': event_type
            })

            webhooks = []
            for row in result.fetchall():
                webhooks.append({
                    'id': row[0],
                    'url': row[1],
                    'secret': row[2],
                    'events': row[3]
                })

            return webhooks

        except Exception as e:
            logger.error(f"Error getting subscribed webhooks: {e}")
            return []
        finally:
            db.close()

    async def queue_event(
        self,
        event_type: str,
        event_id: str,
        user_id: str,
        payload: dict
    ) -> bool:
        """
        Queue event for async delivery

        Args:
            event_type: Type of event (e.g., 'call.completed')
            event_id: Unique event identifier for idempotency
            user_id: User ID this event belongs to
            payload: Event payload data

        Returns:
            True if successfully queued
        """
        db = SessionLocal()

        try:
            # Check if event already queued (idempotency)
            existing = db.execute(text("""
                SELECT id FROM webhook_events_queue
                WHERE event_id = :event_id
            """), {'event_id': event_id}).fetchone()

            if existing:
                logger.debug(f"Event {event_id} already queued, skipping")
                return True

            # Insert into queue (convert payload to JSON string for JSONB column)
            db.execute(text("""
                INSERT INTO webhook_events_queue (
                    event_type, event_id, user_id, payload,
                    created_at, retry_count, max_retries
                ) VALUES (
                    :event_type, :event_id, :user_id, CAST(:payload AS jsonb),
                    :created_at, 0, 3
                )
            """), {
                'event_type': event_type,
                'event_id': event_id,
                'user_id': user_id,
                'payload': json.dumps(payload),
                'created_at': datetime.now(timezone.utc)
            })

            db.commit()
            logger.info(f"✅ Queued webhook event: {event_type} (id={event_id[:8]}...)")
            return True

        except Exception as e:
            db.rollback()
            logger.error(f"❌ Error queuing webhook event: {e}")
            return False
        finally:
            db.close()

    async def trigger_webhook_event(
        self,
        event_type: str,
        data: dict,
        user_id: Optional[str] = None
    ) -> bool:
        """
        Trigger a webhook event for delivery

        This is the main entry point for triggering webhooks from anywhere
        in the application.

        Args:
            event_type: Type of event (e.g., 'call.completed')
            data: Event payload data
            user_id: User ID (extracted from data if not provided)

        Returns:
            True if event was successfully queued

        Example:
            await trigger_webhook_event('call.completed', {
                'call_id': 'call_123',
                'phone_number': '+15551234567',
                'duration_seconds': 245,
                'outcome': 'qualified'
            }, user_id='user_abc')
        """
        if not self.enabled:
            logger.debug(f"Webhooks disabled, skipping event: {event_type}")
            return False

        # Validate event type
        if not self.validate_event_type(event_type):
            logger.error(f"Invalid event type: {event_type}")
            return False

        # Extract user_id from data if not provided
        if not user_id:
            user_id = data.get('user_id')
            if not user_id:
                logger.error(f"No user_id provided for event: {event_type}")
                return False

        # Check if any webhooks are subscribed to this event
        webhooks = await self.get_subscribed_webhooks(user_id, event_type)
        if not webhooks:
            logger.debug(f"No webhooks subscribed to {event_type} for user {user_id[:8]}")
            return True  # Not an error, just no subscribers

        # Generate unique event ID for idempotency
        event_id = f"evt_{uuid.uuid4().hex}"

        # Sanitize payload
        sanitized_data = self.sanitize_payload(data)

        # Build complete event payload
        payload = {
            'event_id': event_id,
            'event_type': event_type,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'user_id': user_id,
            'data': sanitized_data
        }

        # Queue for async delivery
        success = await self.queue_event(event_type, event_id, user_id, payload)

        if success:
            logger.info(f"📤 Webhook event triggered: {event_type} → {len(webhooks)} endpoint(s)")

        return success

# Global instance
_webhook_system = WebhookEventSystem()

# Convenience function for easy imports
async def trigger_webhook_event(
    event_type: str,
    data: dict,
    user_id: Optional[str] = None
) -> bool:
    """
    Convenience function to trigger webhook events

    Usage:
        from webhook_events import trigger_webhook_event

        await trigger_webhook_event('call.completed', {
            'call_id': call_id,
            'phone_number': phone,
            'duration_seconds': duration
        }, user_id)
    """
    return await _webhook_system.trigger_webhook_event(event_type, data, user_id)

async def get_webhook_stats(user_id: str) -> Dict[str, Any]:
    """
    Get webhook statistics for a user

    Args:
        user_id: User ID to get stats for

    Returns:
        Dictionary with webhook statistics
    """
    db = SessionLocal()

    try:
        # Get event counts by type
        result = db.execute(text("""
            SELECT
                event_type,
                COUNT(*) as total,
                COUNT(CASE WHEN processed_at IS NOT NULL THEN 1 END) as processed,
                COUNT(CASE WHEN processed_at IS NULL AND retry_count < max_retries THEN 1 END) as pending,
                COUNT(CASE WHEN retry_count >= max_retries THEN 1 END) as failed
            FROM webhook_events_queue
            WHERE user_id = :user_id
            GROUP BY event_type
            ORDER BY total DESC
        """), {'user_id': user_id})

        event_stats = {}
        for row in result.fetchall():
            event_stats[row[0]] = {
                'total': row[1],
                'processed': row[2],
                'pending': row[3],
                'failed': row[4]
            }

        # Get delivery statistics
        delivery_result = db.execute(text("""
            SELECT
                COUNT(*) as total_deliveries,
                COUNT(CASE WHEN success = true THEN 1 END) as successful,
                COUNT(CASE WHEN success = false THEN 1 END) as failed,
                AVG(duration_ms) as avg_duration_ms
            FROM webhook_deliveries wd
            JOIN partner_webhooks pw ON wd.webhook_id = pw.id
            WHERE pw.user_id = :user_id
        """), {'user_id': user_id}).fetchone()

        return {
            'event_stats': event_stats,
            'delivery_stats': {
                'total_deliveries': delivery_result[0] or 0,
                'successful': delivery_result[1] or 0,
                'failed': delivery_result[2] or 0,
                'avg_duration_ms': float(delivery_result[3]) if delivery_result[3] else 0
            }
        }

    except Exception as e:
        logger.error(f"Error getting webhook stats: {e}")
        return {
            'event_stats': {},
            'delivery_stats': {}
        }
    finally:
        db.close()

# Test function
async def test_webhook_event():
    """
    Test webhook event system

    Usage:
        python -c "import asyncio; from webhook_events import test_webhook_event; asyncio.run(test_webhook_event())"
    """
    test_user_id = "b50cec05-fa5b-4bb4-aaaa-21358c699c45"  # admin user

    logger.info("🧪 Testing webhook event system...")

    # Test event
    success = await trigger_webhook_event('call.completed', {
        'call_id': 'test_call_123',
        'phone_number': '+15551234567',
        'agent_id': 'agent_test',
        'duration_seconds': 120,
        'outcome': 'qualified',
        'transcript': 'Test call transcript...'
    }, test_user_id)

    if success:
        logger.info("✅ Test webhook event successfully queued!")
    else:
        logger.error("❌ Test webhook event failed!")

    # Get stats
    stats = await get_webhook_stats(test_user_id)
    logger.info(f"📊 Webhook stats: {stats}")

    return success

if __name__ == '__main__':
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Run test
    asyncio.run(test_webhook_event())
