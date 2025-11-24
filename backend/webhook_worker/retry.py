"""
Exponential backoff retry strategy for webhook delivery.

Implements retry logic with:
- Exponential backoff: 30s → 60s → 120s → 240s → 480s
- Jitter (±10%) to prevent thundering herd
- Dead letter queue after max attempts
"""

from datetime import datetime, timedelta
import random
from typing import Optional


class RetryStrategy:
    """Exponential backoff retry strategy with jitter."""

    # Retry Configuration
    BASE_DELAY_SECONDS = 30
    MAX_DELAY_SECONDS = 3600  # 1 hour
    MAX_ATTEMPTS = 5
    JITTER_PERCENT = 0.1  # ±10%

    @classmethod
    def calculate_next_retry(cls, attempt_count: int) -> datetime:
        """
        Calculate next retry timestamp with exponential backoff and jitter.

        Formula: delay = min(BASE * 2^attempt, MAX_DELAY) ± jitter

        Args:
            attempt_count: Number of previous attempts (0-indexed)

        Returns:
            Next retry timestamp (UTC)

        Example:
            >>> from retry import RetryStrategy
            >>> # First retry: ~30 seconds
            >>> next_retry = RetryStrategy.calculate_next_retry(0)
            >>> # Second retry: ~60 seconds
            >>> next_retry = RetryStrategy.calculate_next_retry(1)
            >>> # Third retry: ~120 seconds
            >>> next_retry = RetryStrategy.calculate_next_retry(2)
        """
        # Exponential backoff: BASE * 2^attempt
        delay = cls.BASE_DELAY_SECONDS * (2 ** attempt_count)

        # Cap at maximum delay
        delay = min(delay, cls.MAX_DELAY_SECONDS)

        # Add jitter (±10%)
        jitter_amount = delay * cls.JITTER_PERCENT
        jitter = random.uniform(-jitter_amount, jitter_amount)
        delay += jitter

        # Return next retry timestamp
        return datetime.utcnow() + timedelta(seconds=delay)

    @classmethod
    def should_retry(cls, attempt_count: int, response_status: Optional[int]) -> bool:
        """
        Determine if webhook delivery should be retried.

        Retry criteria:
        - Attempt count < MAX_ATTEMPTS
        - Response status indicates retryable error

        Args:
            attempt_count: Number of attempts made
            response_status: HTTP response status code (None for network errors)

        Returns:
            True if should retry, False if should mark as dead letter

        Example:
            >>> # Network error - retry
            >>> RetryStrategy.should_retry(2, None)
            True
            >>> # 429 Rate Limit - retry
            >>> RetryStrategy.should_retry(2, 429)
            True
            >>> # 400 Bad Request - don't retry
            >>> RetryStrategy.should_retry(2, 400)
            False
            >>> # Max attempts reached - don't retry
            >>> RetryStrategy.should_retry(5, 500)
            False
        """
        # Check attempt limit
        if attempt_count >= cls.MAX_ATTEMPTS:
            return False

        # Network error - always retry (within attempt limit)
        if response_status is None:
            return True

        # Retryable HTTP status codes
        retryable_statuses = {
            408,  # Request Timeout
            429,  # Too Many Requests
            500,  # Internal Server Error
            502,  # Bad Gateway
            503,  # Service Unavailable
            504,  # Gateway Timeout
        }

        return response_status in retryable_statuses

    @classmethod
    def get_retry_schedule(cls) -> list:
        """
        Get complete retry schedule for documentation.

        Returns:
            List of (attempt_number, delay_seconds) tuples

        Example:
            >>> RetryStrategy.get_retry_schedule()
            [(1, 30), (2, 60), (3, 120), (4, 240), (5, 480)]
        """
        schedule = []
        for attempt in range(cls.MAX_ATTEMPTS):
            delay = cls.BASE_DELAY_SECONDS * (2 ** attempt)
            delay = min(delay, cls.MAX_DELAY_SECONDS)
            schedule.append((attempt + 1, delay))
        return schedule

    @classmethod
    def estimate_total_retry_time(cls) -> int:
        """
        Estimate total time spent on retries before dead letter.

        Returns:
            Total seconds across all retry attempts

        Example:
            >>> RetryStrategy.estimate_total_retry_time()
            930  # ~15.5 minutes total
        """
        total_seconds = 0
        for attempt in range(cls.MAX_ATTEMPTS):
            delay = cls.BASE_DELAY_SECONDS * (2 ** attempt)
            delay = min(delay, cls.MAX_DELAY_SECONDS)
            total_seconds += delay
        return total_seconds


class DeadLetterPolicy:
    """Policy for handling webhooks that exceed max retry attempts."""

    @staticmethod
    def should_alert(webhook_count: int, threshold: int = 10) -> bool:
        """
        Determine if dead letter queue size warrants alerting.

        Args:
            webhook_count: Current number of dead letter webhooks
            threshold: Alert threshold (default 10)

        Returns:
            True if should send alert notification

        Example:
            >>> DeadLetterPolicy.should_alert(15)
            True
            >>> DeadLetterPolicy.should_alert(5)
            False
        """
        return webhook_count >= threshold

    @staticmethod
    def get_notification_message(webhook_count: int, user_id: str) -> str:
        """
        Generate alert notification message for dead letter queue.

        Args:
            webhook_count: Number of dead letter webhooks
            user_id: User ID with failed webhooks

        Returns:
            Formatted notification message

        Example:
            >>> msg = DeadLetterPolicy.get_notification_message(15, "user_123")
            >>> print(msg)
            ⚠️ Dead Letter Queue Alert: 15 webhooks failed for user user_123
        """
        return (
            f"⚠️ Dead Letter Queue Alert: {webhook_count} webhooks failed for user {user_id}. "
            f"Partner endpoint may be down or webhook configuration invalid."
        )


# Retry schedule for reference
RETRY_SCHEDULE = RetryStrategy.get_retry_schedule()
TOTAL_RETRY_TIME = RetryStrategy.estimate_total_retry_time()
