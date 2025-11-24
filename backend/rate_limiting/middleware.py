"""
Rate Limiting Middleware for Flask

Provides decorator-based rate limiting with customizable limits per endpoint.

Usage:
    @app.route('/api/resource')
    @rate_limit(max_requests=100, window_seconds=60)
    def my_endpoint():
        return {'data': 'value'}

Features:
- Per-user rate limiting with multi-tenant isolation
- Customizable limits per endpoint
- Standard HTTP 429 responses with Retry-After header
- X-RateLimit-* headers for client visibility
"""

import logging
from functools import wraps
from flask import request, jsonify, g
from typing import Callable, Optional

from .storage import RateLimitStorage

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Flask rate limiting middleware using token bucket algorithm.

    Integrates with Flask's request context to extract user identity
    and apply rate limits per endpoint.
    """

    def __init__(self, storage: Optional[RateLimitStorage] = None):
        """
        Initialize rate limiter.

        Args:
            storage: Rate limit storage backend (default: in-memory)
        """
        self.storage = storage or RateLimitStorage()
        logger.info("Rate limiter initialized")

    def get_user_id(self) -> str:
        """
        Extract user ID from request context.

        Priority:
        1. Flask g.user_id (set by auth middleware)
        2. user_id query parameter
        3. X-User-ID header
        4. Remote IP address (fallback for unauthenticated)

        Returns:
            User identifier string
        """
        # Check Flask g context (set by auth middleware)
        if hasattr(g, 'user_id') and g.user_id:
            return str(g.user_id)

        # Check query parameter
        user_id = request.args.get('user_id')
        if user_id:
            return str(user_id)

        # Check header
        user_id = request.headers.get('X-User-ID')
        if user_id:
            return str(user_id)

        # Fallback: use IP address for unauthenticated requests
        return f"ip:{request.remote_addr}"

    def check_limit(
        self,
        max_requests: int,
        window_seconds: int,
        endpoint: Optional[str] = None
    ) -> tuple[bool, dict]:
        """
        Check if current request is within rate limit.

        Args:
            max_requests: Maximum requests allowed in window
            window_seconds: Time window in seconds
            endpoint: API endpoint identifier (default: request path)

        Returns:
            Tuple of (allowed: bool, rate_info: dict)
        """
        user_id = self.get_user_id()
        endpoint = endpoint or request.path

        # Calculate refill rate (tokens per second)
        refill_rate = max_requests / window_seconds

        allowed, info = self.storage.check_rate_limit(
            user_id=user_id,
            endpoint=endpoint,
            max_tokens=max_requests,
            refill_rate=refill_rate
        )

        if not allowed:
            logger.warning(
                f"Rate limit exceeded - User: {user_id}, Endpoint: {endpoint}, "
                f"Limit: {max_requests}/{window_seconds}s"
            )

        return allowed, info


# Global rate limiter instance
_rate_limiter = RateLimiter()


def rate_limit(
    max_requests: int = 60,
    window_seconds: int = 60,
    custom_response: Optional[Callable] = None
):
    """
    Decorator for applying rate limits to Flask endpoints.

    Args:
        max_requests: Maximum requests allowed in window
        window_seconds: Time window in seconds
        custom_response: Optional custom response function

    Returns:
        Decorated function with rate limiting

    Example:
        @app.route('/api/data')
        @rate_limit(max_requests=100, window_seconds=60)
        def get_data():
            return {'data': 'value'}
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            allowed, info = _rate_limiter.check_limit(max_requests, window_seconds)

            # Add rate limit headers to response
            @wraps(f)
            def add_headers(response):
                response.headers['X-RateLimit-Limit'] = str(info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(info['reset'])
                return response

            if not allowed:
                # Rate limit exceeded
                retry_after = info.get('retry_after', window_seconds)

                if custom_response:
                    return custom_response(info)

                response = jsonify({
                    'error': 'Rate limit exceeded',
                    'message': f'Too many requests. Limit: {max_requests} requests per {window_seconds} seconds.',
                    'limit': info['limit'],
                    'remaining': info['remaining'],
                    'reset': info['reset'],
                    'retry_after': retry_after
                })
                response.status_code = 429
                response.headers['Retry-After'] = str(retry_after)
                response.headers['X-RateLimit-Limit'] = str(info['limit'])
                response.headers['X-RateLimit-Remaining'] = str(info['remaining'])
                response.headers['X-RateLimit-Reset'] = str(info['reset'])

                return response

            # Request allowed - execute endpoint
            response = f(*args, **kwargs)

            # Add rate limit headers to successful response
            if hasattr(response, 'headers'):
                return add_headers(response)

            return response

        return wrapped
    return decorator


def get_rate_limiter() -> RateLimiter:
    """
    Get global rate limiter instance.

    Returns:
        RateLimiter instance
    """
    return _rate_limiter
