"""
Call Outcomes Module

Provides call outcome recording, classification, and retrieval functionality
for the Epic Voice Suite multi-tenant platform.

Components:
- models: SQLAlchemy models for call_logs and livekit_call_events
- service: Business logic layer with idempotency handling
- transformer: LiveKit webhook payload transformation
- routes: Flask API endpoints for webhooks and retrieval

Multi-Tenant: All data scoped to userId for tenant isolation
"""

from .models import CallLog, LiveKitCallEvent
from .service import CallOutcomeService
from .transformer import LiveKitWebhookTransformer
from .routes import call_outcomes_bp

__all__ = [
    'CallLog',
    'LiveKitCallEvent',
    'CallOutcomeService',
    'LiveKitWebhookTransformer',
    'call_outcomes_bp'
]

__version__ = '1.0.0'
