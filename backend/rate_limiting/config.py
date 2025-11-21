"""
Rate Limit Configuration

Centralized configuration for rate limits across different endpoint types.

Tier Structure:
- Public endpoints: 20 requests/minute (unauthenticated)
- Authenticated endpoints: 100 requests/minute (standard users)
- Heavy operations: 10 requests/minute (exports, webhooks)
- Admin endpoints: 200 requests/minute (admin users)
"""

from dataclasses import dataclass
from typing import Dict


@dataclass
class RateLimitConfig:
    """Rate limit configuration for an endpoint."""
    max_requests: int
    window_seconds: int

    @property
    def requests_per_second(self) -> float:
        """Calculate requests per second."""
        return self.max_requests / self.window_seconds

    def __str__(self) -> str:
        """Human-readable rate limit description."""
        if self.window_seconds == 60:
            return f"{self.max_requests} requests/minute"
        elif self.window_seconds == 3600:
            return f"{self.max_requests} requests/hour"
        else:
            return f"{self.max_requests} requests/{self.window_seconds}s"


# Predefined rate limit tiers
class RateLimitTiers:
    """Predefined rate limit configurations."""

    # Public endpoints (unauthenticated)
    PUBLIC = RateLimitConfig(max_requests=20, window_seconds=60)

    # Standard authenticated endpoints
    AUTHENTICATED = RateLimitConfig(max_requests=100, window_seconds=60)

    # Heavy operations (exports, large queries)
    HEAVY = RateLimitConfig(max_requests=10, window_seconds=60)

    # Admin operations
    ADMIN = RateLimitConfig(max_requests=200, window_seconds=60)

    # Webhooks (external callbacks)
    WEBHOOK = RateLimitConfig(max_requests=30, window_seconds=60)

    # Agent operations (LiveKit agents)
    AGENT = RateLimitConfig(max_requests=500, window_seconds=60)


# Endpoint-specific rate limits
ENDPOINT_LIMITS: Dict[str, RateLimitConfig] = {
    # Public endpoints
    '/api/health': RateLimitTiers.PUBLIC,
    '/api/status': RateLimitTiers.PUBLIC,

    # Authentication
    '/api/login': RateLimitConfig(max_requests=5, window_seconds=60),
    '/api/register': RateLimitConfig(max_requests=3, window_seconds=60),

    # Standard API endpoints
    '/api/agents': RateLimitTiers.AUTHENTICATED,
    '/api/agent-configs': RateLimitTiers.AUTHENTICATED,
    '/api/phone-numbers': RateLimitTiers.AUTHENTICATED,
    '/api/call-logs': RateLimitTiers.AUTHENTICATED,

    # Heavy operations
    '/api/exports/calls': RateLimitTiers.HEAVY,
    '/api/exports/leads': RateLimitTiers.HEAVY,
    '/api/exports/campaigns': RateLimitTiers.HEAVY,

    # Webhooks (incoming)
    '/api/webhooks/livekit': RateLimitTiers.WEBHOOK,
    '/api/webhooks/partner': RateLimitTiers.WEBHOOK,

    # Agent operations
    '/api/sip/create-call': RateLimitTiers.AGENT,
    '/api/sip/dispatch': RateLimitTiers.AGENT,

    # Call outcomes
    '/api/call-outcomes': RateLimitTiers.AUTHENTICATED,

    # Campaign operations
    '/api/campaigns': RateLimitTiers.AUTHENTICATED,
    '/api/leads': RateLimitTiers.AUTHENTICATED,
}


def get_rate_limit_for_endpoint(endpoint: str) -> RateLimitConfig:
    """
    Get rate limit configuration for an endpoint.

    Args:
        endpoint: API endpoint path

    Returns:
        RateLimitConfig for the endpoint
    """
    # Check exact match
    if endpoint in ENDPOINT_LIMITS:
        return ENDPOINT_LIMITS[endpoint]

    # Check prefix match
    for path, config in ENDPOINT_LIMITS.items():
        if endpoint.startswith(path):
            return config

    # Default to authenticated tier
    return RateLimitTiers.AUTHENTICATED


def format_rate_limits() -> Dict[str, str]:
    """
    Format all rate limits for display.

    Returns:
        Dict mapping endpoints to human-readable limits
    """
    return {
        endpoint: str(config)
        for endpoint, config in ENDPOINT_LIMITS.items()
    }
