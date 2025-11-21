"""
Rate Limit Storage Backend

In-memory token bucket implementation with automatic cleanup.
For production, consider Redis for distributed rate limiting across multiple servers.

Features:
- Token bucket algorithm for smooth rate limiting
- Automatic cleanup of expired entries
- Multi-tenant isolation via userId
- Thread-safe operations
"""

import time
import threading
from typing import Dict, Tuple
from collections import defaultdict


class RateLimitStorage:
    """
    In-memory storage for rate limit tracking using token bucket algorithm.

    Token Bucket Algorithm:
    - Each user gets a bucket with max_tokens capacity
    - Tokens refill at rate_per_second
    - Each request consumes 1 token
    - Request rejected if bucket is empty
    """

    def __init__(self, cleanup_interval: int = 300):
        """
        Initialize rate limit storage.

        Args:
            cleanup_interval: Seconds between automatic cleanup runs
        """
        self._buckets: Dict[str, Dict[str, Tuple[float, float]]] = defaultdict(dict)
        # Structure: {endpoint: {user_id: (tokens, last_update_time)}}

        self._lock = threading.Lock()
        self._cleanup_interval = cleanup_interval
        self._last_cleanup = time.time()

    def check_rate_limit(
        self,
        user_id: str,
        endpoint: str,
        max_tokens: int,
        refill_rate: float
    ) -> Tuple[bool, Dict[str, any]]:
        """
        Check if request is allowed under rate limit.

        Args:
            user_id: User identifier
            endpoint: API endpoint path
            max_tokens: Maximum bucket capacity
            refill_rate: Tokens per second refill rate

        Returns:
            Tuple of (allowed: bool, info: dict)
            info contains: remaining, reset_time, limit
        """
        with self._lock:
            current_time = time.time()

            # Get or initialize bucket
            if user_id not in self._buckets[endpoint]:
                self._buckets[endpoint][user_id] = (max_tokens - 1, current_time)
                return True, {
                    'limit': max_tokens,
                    'remaining': max_tokens - 1,
                    'reset': int(current_time + (1 / refill_rate))
                }

            tokens, last_update = self._buckets[endpoint][user_id]

            # Calculate token refill
            time_passed = current_time - last_update
            refilled_tokens = time_passed * refill_rate
            tokens = min(max_tokens, tokens + refilled_tokens)

            # Check if request can be processed
            if tokens >= 1:
                # Allow request, consume token
                new_tokens = tokens - 1
                self._buckets[endpoint][user_id] = (new_tokens, current_time)

                # Calculate reset time (when bucket will be full again)
                tokens_to_fill = max_tokens - new_tokens
                reset_time = current_time + (tokens_to_fill / refill_rate)

                # Periodic cleanup
                if current_time - self._last_cleanup > self._cleanup_interval:
                    self._cleanup_old_entries(current_time)

                return True, {
                    'limit': max_tokens,
                    'remaining': int(new_tokens),
                    'reset': int(reset_time)
                }
            else:
                # Rate limit exceeded
                # Calculate when next token will be available
                tokens_needed = 1 - tokens
                wait_time = tokens_needed / refill_rate
                reset_time = current_time + wait_time

                # Update bucket state (don't consume token)
                self._buckets[endpoint][user_id] = (tokens, current_time)

                return False, {
                    'limit': max_tokens,
                    'remaining': 0,
                    'reset': int(reset_time),
                    'retry_after': int(wait_time)
                }

    def _cleanup_old_entries(self, current_time: float):
        """
        Remove entries that have been inactive for >1 hour.

        Args:
            current_time: Current timestamp
        """
        max_idle_time = 3600  # 1 hour

        for endpoint in list(self._buckets.keys()):
            for user_id in list(self._buckets[endpoint].keys()):
                _, last_update = self._buckets[endpoint][user_id]

                if current_time - last_update > max_idle_time:
                    del self._buckets[endpoint][user_id]

            # Remove empty endpoint entries
            if not self._buckets[endpoint]:
                del self._buckets[endpoint]

        self._last_cleanup = current_time

    def reset_user_limits(self, user_id: str, endpoint: str = None):
        """
        Reset rate limits for a specific user.

        Args:
            user_id: User identifier
            endpoint: Specific endpoint to reset, or None for all endpoints
        """
        with self._lock:
            if endpoint:
                if endpoint in self._buckets and user_id in self._buckets[endpoint]:
                    del self._buckets[endpoint][user_id]
            else:
                # Reset across all endpoints
                for endpoint_buckets in self._buckets.values():
                    if user_id in endpoint_buckets:
                        del endpoint_buckets[user_id]

    def get_stats(self) -> Dict[str, any]:
        """
        Get storage statistics.

        Returns:
            Dict with storage metrics
        """
        with self._lock:
            total_users = sum(len(buckets) for buckets in self._buckets.values())

            return {
                'total_endpoints': len(self._buckets),
                'total_tracked_users': total_users,
                'endpoints': {
                    endpoint: len(buckets)
                    for endpoint, buckets in self._buckets.items()
                }
            }
