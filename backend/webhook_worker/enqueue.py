"""
Webhook enqueueing utility for integration with call_outcomes module.

Provides simple API for enqueueing webhooks from application code.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from models import WebhookDeliveryQueue, PartnerWebhook


def enqueue_webhook(
    db: Session,
    user_id: str,
    partner_id: Optional[str],
    url: str,
    secret: str,
    event_type: str,
    payload: Dict[str, Any],
    max_attempts: int = 5
) -> str:
    """
    Enqueue a webhook for delivery.

    Args:
        db: Database session
        user_id: User ID for tenant scoping
        partner_id: Partner webhook configuration ID (optional)
        url: Webhook destination URL
        secret: Webhook secret for HMAC signing
        event_type: Event type (e.g., "call.completed")
        payload: Webhook payload dictionary
        max_attempts: Maximum delivery attempts (default 5)

    Returns:
        Webhook queue entry ID

    Example:
        >>> from database import db
        >>> from enqueue import enqueue_webhook
        >>>
        >>> webhook_id = enqueue_webhook(
        ...     db=db,
        ...     user_id="user_123",
        ...     partner_id="partner_456",
        ...     url="https://partner.com/webhooks",
        ...     secret="partner_secret",
        ...     event_type="call.completed",
        ...     payload={
        ...         "id": "call_789",
        ...         "duration": 120,
        ...         "outcome": "completed"
        ...     }
        ... )
        >>> print(f"Enqueued webhook: {webhook_id}")
    """
    webhook = WebhookDeliveryQueue(
        id=str(uuid.uuid4()),
        userId=user_id,
        partnerId=partner_id,
        url=url,
        secret=secret,
        event_type=event_type,
        payload=payload,
        status='pending',
        attempt_count=0,
        max_attempts=max_attempts,
        next_retry_at=datetime.utcnow()  # Immediate delivery
    )

    db.add(webhook)
    db.commit()

    return webhook.id


def enqueue_for_partner(
    db: Session,
    user_id: str,
    partner_slug: str,
    event_type: str,
    payload: Dict[str, Any]
) -> Optional[str]:
    """
    Enqueue webhook using partner configuration.

    Args:
        db: Database session
        user_id: User ID for tenant scoping
        partner_slug: Partner slug identifier
        event_type: Event type (e.g., "call.completed")
        payload: Webhook payload dictionary

    Returns:
        Webhook queue entry ID, or None if partner not found/disabled

    Example:
        >>> from database import db
        >>> from enqueue import enqueue_for_partner
        >>>
        >>> webhook_id = enqueue_for_partner(
        ...     db=db,
        ...     user_id="user_123",
        ...     partner_slug="my-partner",
        ...     event_type="call.completed",
        ...     payload={"call_id": "call_789", "duration": 120}
        ... )
        >>> if webhook_id:
        ...     print(f"Enqueued webhook: {webhook_id}")
        ... else:
        ...     print("Partner not configured or disabled")
    """
    # Lookup partner configuration
    partner = db.query(PartnerWebhook).filter(
        PartnerWebhook.userId == user_id,
        PartnerWebhook.partner_slug == partner_slug,
        PartnerWebhook.enabled == True
    ).first()

    if not partner:
        return None

    # Check if partner subscribes to this event type
    if event_type not in partner.enabled_events:
        return None

    # Apply white-label custom fields
    if partner.custom_payload_fields:
        payload = {**payload, **partner.custom_payload_fields}

    # Enqueue webhook
    return enqueue_webhook(
        db=db,
        user_id=user_id,
        partner_id=partner.id,
        url=partner.url,
        secret=partner.secret,
        event_type=event_type,
        payload=payload
    )


def enqueue_for_all_partners(
    db: Session,
    user_id: str,
    event_type: str,
    payload: Dict[str, Any]
) -> List[str]:
    """
    Enqueue webhook for all partners subscribed to event type.

    Args:
        db: Database session
        user_id: User ID for tenant scoping
        event_type: Event type (e.g., "call.completed")
        payload: Webhook payload dictionary

    Returns:
        List of webhook queue entry IDs

    Example:
        >>> from database import db
        >>> from enqueue import enqueue_for_all_partners
        >>>
        >>> # Notify all partners about call completion
        >>> webhook_ids = enqueue_for_all_partners(
        ...     db=db,
        ...     user_id="user_123",
        ...     event_type="call.completed",
        ...     payload={
        ...         "call_id": "call_789",
        ...         "duration": 120,
        ...         "outcome": "completed",
        ...         "timestamp": "2025-10-29T12:00:00Z"
        ...     }
        ... )
        >>> print(f"Enqueued {len(webhook_ids)} webhooks")
    """
    # Find all enabled partners subscribed to this event
    partners = db.query(PartnerWebhook).filter(
        PartnerWebhook.userId == user_id,
        PartnerWebhook.enabled == True,
        PartnerWebhook.enabled_events.contains([event_type])
    ).all()

    webhook_ids = []

    for partner in partners:
        # Apply white-label custom fields
        partner_payload = {**payload}
        if partner.custom_payload_fields:
            partner_payload.update(partner.custom_payload_fields)

        # Enqueue webhook
        webhook_id = enqueue_webhook(
            db=db,
            user_id=user_id,
            partner_id=partner.id,
            url=partner.url,
            secret=partner.secret,
            event_type=event_type,
            payload=partner_payload
        )
        webhook_ids.append(webhook_id)

    return webhook_ids


def get_queue_stats(db: Session, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get webhook queue statistics.

    Args:
        db: Database session
        user_id: Optional user ID to filter by tenant

    Returns:
        Dictionary with queue statistics

    Example:
        >>> from database import db
        >>> from enqueue import get_queue_stats
        >>>
        >>> stats = get_queue_stats(db, user_id="user_123")
        >>> print(f"Pending: {stats['pending']}, Delivered: {stats['delivered']}")
    """
    from sqlalchemy import func

    query = db.query(
        WebhookDeliveryQueue.status,
        func.count(WebhookDeliveryQueue.id).label('count')
    )

    if user_id:
        query = query.filter(WebhookDeliveryQueue.userId == user_id)

    results = query.group_by(WebhookDeliveryQueue.status).all()

    stats = {status: count for status, count in results}

    # Add computed metrics
    stats['total'] = sum(stats.values())
    stats['success_rate'] = (
        (stats.get('delivered', 0) / stats['total'] * 100)
        if stats['total'] > 0 else 0
    )

    return stats


# Integration example for call_outcomes module
def enqueue_call_outcome_webhook(
    db: Session,
    user_id: str,
    call_id: str,
    outcome_data: Dict[str, Any]
) -> List[str]:
    """
    Enqueue call outcome webhooks for all subscribed partners.

    This is the primary integration point with the call_outcomes module.

    Args:
        db: Database session
        user_id: User ID for tenant scoping
        call_id: Call ID
        outcome_data: Normalized call outcome data

    Returns:
        List of webhook queue entry IDs

    Example:
        >>> from database import db
        >>> from enqueue import enqueue_call_outcome_webhook
        >>>
        >>> # From call_outcomes/webhook_handler.py:
        >>> outcome_data = {
        ...     "call_id": "call_789",
        ...     "room_name": "sip-room-abc",
        ...     "event_type": "call.completed",
        ...     "timestamp": "2025-10-29T12:00:00Z",
        ...     "duration": 120,
        ...     "status": "completed"
        ... }
        >>>
        >>> webhook_ids = enqueue_call_outcome_webhook(
        ...     db=db,
        ...     user_id="user_123",
        ...     call_id="call_789",
        ...     outcome_data=outcome_data
        ... )
        >>> print(f"Enqueued {len(webhook_ids)} partner webhooks")
    """
    return enqueue_for_all_partners(
        db=db,
        user_id=user_id,
        event_type='call.completed',
        payload=outcome_data
    )
