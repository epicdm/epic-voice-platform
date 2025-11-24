"""
Prometheus Metrics Module for LiveKit Voice Agent Platform.

Provides metrics collection and export for:
- Campaign engine operations (calls, success rates, latency)
- Webhook delivery worker (throughput, retries, failures)
- System health and performance monitoring

Features:
- Thread-safe metric collection
- Custom business metrics for campaigns and webhooks
- Prometheus exposition format export
- Flask endpoint integration

Usage:
    from backend.metrics import metrics_registry, campaign_metrics, webhook_metrics

    # Increment campaign call counter
    campaign_metrics.calls_initiated.inc()

    # Record webhook delivery latency
    webhook_metrics.delivery_latency.observe(0.145)

    # Register with Flask app
    from backend.metrics.routes import metrics_bp
    app.register_blueprint(metrics_bp)
"""

from backend.metrics.registry import (
    metrics_registry,
    campaign_metrics,
    webhook_metrics
)
from backend.metrics.routes import metrics_bp

__all__ = [
    'metrics_registry',
    'campaign_metrics',
    'webhook_metrics',
    'metrics_bp'
]
__version__ = '1.0.0'
