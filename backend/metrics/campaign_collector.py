"""
Campaign Engine Metrics Collector

Helper module for instrumenting the campaign engine with Prometheus metrics.

Usage in campaign_engine.py:
    from backend.metrics.campaign_collector import CampaignMetricsCollector

    collector = CampaignMetricsCollector()

    # Record call initiation
    collector.record_call_initiated(campaign_id, user_id)

    # Record call completion
    collector.record_call_completed(campaign_id, user_id, outcome, duration)

    # Update active campaigns gauge
    collector.update_active_campaigns(user_id, active_count)
"""

import time
import logging
from typing import Optional, Dict, Any
from contextlib import contextmanager
from datetime import datetime

from backend.metrics.registry import campaign_metrics

logger = logging.getLogger(__name__)


class CampaignMetricsCollector:
    """
    Wrapper for campaign metrics with convenience methods.

    Provides:
    - Simple API for campaign engine integration
    - Context managers for timing operations
    - Error handling and logging
    - Batch metric updates
    """

    def __init__(self):
        self.metrics = campaign_metrics
        logger.info("Campaign metrics collector initialized")

    def record_call_initiated(self, campaign_id: str, user_id: str):
        """
        Record a campaign call initiation.

        Args:
            campaign_id: Campaign identifier
            user_id: User identifier
        """
        try:
            self.metrics.record_call_initiated(campaign_id, user_id)
            logger.debug(f"Recorded call initiated: campaign={campaign_id}, user={user_id}")
        except Exception as e:
            logger.error(f"Failed to record call initiated metric: {e}")

    def record_call_completed(
        self,
        campaign_id: str,
        user_id: str,
        outcome: str,
        duration: float,
        cost: Optional[float] = None
    ):
        """
        Record a campaign call completion.

        Args:
            campaign_id: Campaign identifier
            user_id: User identifier
            outcome: Call outcome (success, no_answer, busy, failed, etc.)
            duration: Call duration in seconds
            cost: Optional call cost in dollars
        """
        try:
            self.metrics.record_call_completed(campaign_id, user_id, outcome, duration)

            if cost is not None:
                self.metrics.cost_total.labels(
                    campaign_id=campaign_id,
                    user_id=user_id
                ).inc(cost)

            logger.debug(
                f"Recorded call completed: campaign={campaign_id}, "
                f"outcome={outcome}, duration={duration:.2f}s"
            )
        except Exception as e:
            logger.error(f"Failed to record call completed metric: {e}")

    def record_call_failed(self, campaign_id: str, user_id: str, error_type: str):
        """
        Record a campaign call failure.

        Args:
            campaign_id: Campaign identifier
            user_id: User identifier
            error_type: Error classification (sip_error, timeout, agent_error, etc.)
        """
        try:
            self.metrics.record_call_failed(campaign_id, user_id, error_type)
            logger.debug(f"Recorded call failed: campaign={campaign_id}, error={error_type}")
        except Exception as e:
            logger.error(f"Failed to record call failed metric: {e}")

    @contextmanager
    def time_processing(self, campaign_id: str):
        """
        Context manager for timing call processing latency.

        Usage:
            with collector.time_processing(campaign_id):
                # ... process and initiate call
                pass

        Args:
            campaign_id: Campaign identifier
        """
        start_time = time.time()
        try:
            yield
        finally:
            latency = time.time() - start_time
            try:
                self.metrics.record_processing_latency(campaign_id, latency)
                logger.debug(f"Recorded processing latency: {latency:.3f}s for campaign={campaign_id}")
            except Exception as e:
                logger.error(f"Failed to record processing latency: {e}")

    @contextmanager
    def time_poll_cycle(self):
        """
        Context manager for timing campaign engine poll cycle.

        Usage:
            with collector.time_poll_cycle():
                # ... poll and process campaigns
                pass
        """
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            try:
                self.metrics.poll_cycle_duration_seconds.observe(duration)
                logger.debug(f"Recorded poll cycle duration: {duration:.3f}s")
            except Exception as e:
                logger.error(f"Failed to record poll cycle duration: {e}")

    def update_active_campaigns(self, user_id: str, count: int):
        """
        Update the number of active campaigns for a user.

        Args:
            user_id: User identifier
            count: Number of active campaigns
        """
        try:
            self.metrics.set_active_campaigns(user_id, count)
        except Exception as e:
            logger.error(f"Failed to update active campaigns gauge: {e}")

    def update_pending_leads(self, campaign_id: str, count: int):
        """
        Update the number of pending leads for a campaign.

        Args:
            campaign_id: Campaign identifier
            count: Number of pending leads
        """
        try:
            self.metrics.set_pending_leads(campaign_id, count)
        except Exception as e:
            logger.error(f"Failed to update pending leads gauge: {e}")

    def update_concurrent_calls(self, count: int):
        """
        Update the number of concurrent active calls.

        Args:
            count: Number of concurrent calls
        """
        try:
            self.metrics.set_concurrent_calls(count)
        except Exception as e:
            logger.error(f"Failed to update concurrent calls gauge: {e}")

    def update_success_rate(self, campaign_id: str, success_rate: float):
        """
        Update campaign success rate.

        Args:
            campaign_id: Campaign identifier
            success_rate: Success rate (0.0 to 1.0)
        """
        try:
            self.metrics.success_rate.labels(campaign_id=campaign_id).set(success_rate)
        except Exception as e:
            logger.error(f"Failed to update success rate: {e}")

    def batch_update(self, updates: Dict[str, Any]):
        """
        Perform batch metric updates.

        Useful for periodic gauge updates from database queries.

        Args:
            updates: Dictionary of metric updates
                {
                    'active_campaigns': {user_id: count},
                    'pending_leads': {campaign_id: count},
                    'concurrent_calls': count
                }
        """
        try:
            # Update active campaigns
            if 'active_campaigns' in updates:
                for user_id, count in updates['active_campaigns'].items():
                    self.update_active_campaigns(user_id, count)

            # Update pending leads
            if 'pending_leads' in updates:
                for campaign_id, count in updates['pending_leads'].items():
                    self.update_pending_leads(campaign_id, count)

            # Update concurrent calls
            if 'concurrent_calls' in updates:
                self.update_concurrent_calls(updates['concurrent_calls'])

            logger.debug(f"Batch metrics update completed: {len(updates)} types updated")
        except Exception as e:
            logger.error(f"Failed to perform batch update: {e}")


# Singleton instance for easy import
collector = CampaignMetricsCollector()
