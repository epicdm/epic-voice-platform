"""
Funnel Engine Module

Provides multi-stage funnel orchestration for AI voice agent campaigns.
Based on the webhook_worker pattern with PostgreSQL SKIP LOCKED queue.

Author: LiveKit SaaS Development Team
Version: 1.0.0
"""

from .models import (
    Funnel,
    FunnelNode,
    FunnelEdge,
    FunnelExecution,
    FunnelExecutionEvent,
    FunnelStageQueue,
)
from .executor import FunnelExecutor
from .enqueue import (
    enqueue_funnel_stage,
    enqueue_next_stage,
    get_queue_stats,
)

__version__ = "1.0.0"
__all__ = [
    # Models
    "Funnel",
    "FunnelNode",
    "FunnelEdge",
    "FunnelExecution",
    "FunnelExecutionEvent",
    "FunnelStageQueue",
    # Executor
    "FunnelExecutor",
    # Queue utilities
    "enqueue_funnel_stage",
    "enqueue_next_stage",
    "get_queue_stats",
]
