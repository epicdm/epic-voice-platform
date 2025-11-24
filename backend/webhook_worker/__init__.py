"""
Webhook Delivery Worker

Production-ready webhook delivery system with:
- Queue-based architecture using PostgreSQL
- Exponential backoff retry logic
- HMAC-SHA256 signature generation
- Multi-tenant isolation
- Horizontal scaling support
- Systemd integration

Main components:
- models.py: SQLAlchemy database models
- worker.py: Main worker process
- signer.py: HMAC-SHA256 signing
- retry.py: Exponential backoff strategy
- config.py: Configuration management
- enqueue.py: Enqueueing utilities

Usage:
    from webhook_worker.enqueue import enqueue_call_outcome_webhook

    webhook_ids = enqueue_call_outcome_webhook(
        db=db,
        user_id="user_123",
        call_id="call_789",
        outcome_data={...}
    )
"""

from .models import WebhookDeliveryQueue, PartnerWebhook, WebhookDeliveryLog
from .enqueue import (
    enqueue_webhook,
    enqueue_for_partner,
    enqueue_for_all_partners,
    enqueue_call_outcome_webhook,
    get_queue_stats
)
from .signer import WebhookSigner, verify_incoming_webhook
from .retry import RetryStrategy, DeadLetterPolicy
from .config import WorkerConfig

__all__ = [
    # Models
    'WebhookDeliveryQueue',
    'PartnerWebhook',
    'WebhookDeliveryLog',

    # Enqueueing
    'enqueue_webhook',
    'enqueue_for_partner',
    'enqueue_for_all_partners',
    'enqueue_call_outcome_webhook',
    'get_queue_stats',

    # Signing
    'WebhookSigner',
    'verify_incoming_webhook',

    # Retry
    'RetryStrategy',
    'DeadLetterPolicy',

    # Config
    'WorkerConfig',
]

__version__ = '1.0.0'
