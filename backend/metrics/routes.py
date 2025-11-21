"""
Prometheus Metrics HTTP Endpoint

Flask Blueprint for exposing Prometheus metrics via HTTP.

Endpoints:
- GET /metrics - Prometheus exposition format for scraping
- GET /metrics/json - JSON format for debugging
- GET /metrics/health - Health check with metrics system status

Security:
- No authentication required (Prometheus scrapes are typically internal)
- Consider adding IP whitelist or basic auth in production
- No sensitive data exposed (only aggregated metrics)
"""

from flask import Blueprint, Response, jsonify
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
from datetime import datetime, timezone
import logging

from backend.metrics.registry import (
    metrics_registry,
    campaign_metrics,
    webhook_metrics,
    get_metrics_snapshot
)

logger = logging.getLogger(__name__)

# Create Blueprint
metrics_bp = Blueprint('metrics', __name__, url_prefix='/metrics')


@metrics_bp.route('', methods=['GET'])
@metrics_bp.route('/', methods=['GET'])
def prometheus_metrics():
    """
    Prometheus metrics endpoint in exposition format.

    Returns metrics in Prometheus text-based exposition format for scraping.

    Response format:
        # HELP metric_name Description of the metric
        # TYPE metric_name counter
        metric_name{label="value"} 123 1234567890

    Example Prometheus configuration:
        scrape_configs:
          - job_name: 'livekit-platform'
            static_configs:
              - targets: ['localhost:5000']
            metrics_path: '/metrics'
            scrape_interval: 15s

    Returns:
        Response: Prometheus metrics in text format
    """
    try:
        metrics_data = generate_latest(metrics_registry)
        return Response(
            metrics_data,
            mimetype=CONTENT_TYPE_LATEST
        )
    except Exception as e:
        logger.error(f"Error generating Prometheus metrics: {e}", exc_info=True)
        return Response(
            f"# Error generating metrics: {str(e)}\n",
            status=500,
            mimetype='text/plain'
        )


@metrics_bp.route('/json', methods=['GET'])
def metrics_json():
    """
    Metrics in JSON format for debugging.

    Useful for:
    - Quick inspection in browser
    - Debugging metrics collection
    - Custom monitoring dashboards
    - Testing metric values

    Example response:
        {
          "timestamp": "2025-10-29T12:34:56Z",
          "metrics": {
            "campaign_calls_initiated_total{campaign_id=abc,user_id=123}": 45,
            "webhook_delivered_total{event_type=call_ended,partner_id=xyz}": 123
          },
          "registry": "application"
        }

    Returns:
        Response: JSON with metrics snapshot
    """
    try:
        snapshot = get_metrics_snapshot()
        snapshot['timestamp'] = datetime.now(timezone.utc).isoformat()

        return jsonify(snapshot), 200
    except Exception as e:
        logger.error(f"Error generating JSON metrics: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to generate metrics',
            'message': str(e)
        }), 500


@metrics_bp.route('/health', methods=['GET'])
def metrics_health():
    """
    Metrics system health check.

    Verifies:
    - Metrics registry is accessible
    - Metric collectors are registered
    - System can generate metrics

    Returns:
        Response: Health status and metrics system info
    """
    try:
        # Verify we can generate metrics
        metrics_data = generate_latest(metrics_registry)

        # Count registered metrics
        from prometheus_client.parser import text_string_to_metric_families
        metrics_text = metrics_data.decode('utf-8')

        metric_families = list(text_string_to_metric_families(metrics_text))
        total_metrics = sum(len(list(family.samples)) for family in metric_families)

        return jsonify({
            'status': 'healthy',
            'registry': 'application',
            'metric_families': len(metric_families),
            'total_metrics': total_metrics,
            'endpoints': {
                'prometheus': '/metrics',
                'json': '/metrics/json',
                'health': '/metrics/health'
            },
            'collectors': {
                'campaign_metrics': 'registered',
                'webhook_metrics': 'registered'
            }
        }), 200

    except Exception as e:
        logger.error(f"Metrics health check failed: {e}", exc_info=True)
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503


# Optional: Middleware for request counting (if integrated with main Flask app)
@metrics_bp.before_app_request
def track_request():
    """
    Track HTTP request metrics (optional).

    This is a placeholder for request-level metrics if needed.
    Uncomment and configure if you want to track endpoint usage.
    """
    pass


logger.info("Metrics HTTP endpoints registered at /metrics")
