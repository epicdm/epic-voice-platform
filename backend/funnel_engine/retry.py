"""
Retry Strategy

REUSES webhook_worker retry logic.
Exponential backoff with jitter.
"""

from datetime import datetime, timedelta
import random
from typing import Optional


class RetryStrategy:
    """
    Exponential backoff retry strategy with jitter

    COPIED FROM webhook_worker/retry.py

    Retry schedule:
    - Attempt 1: 30s  delay (±3s jitter)
    - Attempt 2: 60s  delay (±6s jitter)
    - Attempt 3: 120s delay (±12s jitter)
    - Attempt 4: 240s delay (±24s jitter)
    - Attempt 5: 480s delay (±48s jitter)
    - Total: ~930 seconds (15.5 minutes)
    """

    BASE_DELAYS = [30, 60, 120, 240, 480]  # seconds
    JITTER_PERCENT = 10  # ±10% jitter

    def calculate_next_retry(self, attempt_count: int) -> Optional[datetime]:
        """
        Calculate next retry time with exponential backoff + jitter

        COPIED FROM webhook_worker/retry.py

        Args:
            attempt_count: Number of attempts already made (0-indexed)

        Returns:
            datetime for next retry, or None if max attempts exceeded
        """
        # Dead letter - no more retries
        if attempt_count >= len(self.BASE_DELAYS):
            return None

        # Get base delay for this attempt
        base_delay = self.BASE_DELAYS[attempt_count]

        # Add jitter (±10%) to prevent thundering herd
        jitter = random.uniform(
            -base_delay * self.JITTER_PERCENT / 100,
            base_delay * self.JITTER_PERCENT / 100,
        )

        actual_delay = base_delay + jitter

        # Calculate next retry time
        next_retry = datetime.utcnow() + timedelta(seconds=actual_delay)

        return next_retry

    def get_total_retry_time(self) -> int:
        """
        Get total retry time in seconds

        Returns:
            Total time for all retries
        """
        return sum(self.BASE_DELAYS)
