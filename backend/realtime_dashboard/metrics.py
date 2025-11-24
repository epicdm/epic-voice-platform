"""
Dashboard Metrics Service

Calculates and provides real-time metrics for the dashboard:
- Active calls count
- Call outcomes distribution
- Average call duration
- Calls per hour/day
- Agent performance metrics

Features:
- Real-time calculation from database
- Caching for performance
- Multi-tenant data isolation
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy import func, and_, Integer
from database import SessionLocal, CallLog, LiveKitCallEvent

logger = logging.getLogger(__name__)


class DashboardMetrics:
    """
    Service for calculating dashboard metrics.

    Provides real-time statistics for active calls, outcomes, and performance.
    """

    def __init__(self):
        """Initialize metrics service."""
        self.cache = {}
        self.cache_ttl = 30  # seconds

    def get_dashboard_state(self, user_id: str) -> Dict[str, Any]:
        """
        Get complete dashboard state for a user.

        Args:
            user_id: User identifier

        Returns:
            Dict with all dashboard metrics
        """
        try:
            db = SessionLocal()

            state = {
                'active_calls': self._get_active_calls(db, user_id),
                'metrics': self._get_call_metrics(db, user_id),
                'recent_calls': self._get_recent_calls(db, user_id, limit=10),
                'outcome_distribution': self._get_outcome_distribution(db, user_id),
                'timestamp': datetime.utcnow().isoformat()
            }

            db.close()
            return state

        except Exception as e:
            logger.error(f"Error getting dashboard state: {e}", exc_info=True)
            return {
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    def _get_active_calls(self, db, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all active calls for a user.

        Args:
            db: Database session
            user_id: User identifier

        Returns:
            List of active call dictionaries
        """
        try:
            active_calls = db.query(CallLog).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.status == 'active'
                )
            ).order_by(CallLog.startedAt.desc()).all()

            return [
                {
                    'id': call.id,
                    'phoneNumber': call.phoneNumber,
                    'direction': call.direction,
                    'startedAt': call.startedAt.isoformat() if call.startedAt else None,
                    'duration': self._calculate_active_duration(call),
                    'livekitRoomName': call.livekitRoomName,
                    'agentConfigId': call.agentConfigId
                }
                for call in active_calls
            ]

        except Exception as e:
            logger.error(f"Error getting active calls: {e}", exc_info=True)
            return []

    def _calculate_active_duration(self, call: CallLog) -> int:
        """
        Calculate duration for an active call.

        Args:
            call: CallLog instance

        Returns:
            Duration in seconds
        """
        if not call.startedAt:
            return 0

        now = datetime.utcnow()
        delta = now - call.startedAt
        return int(delta.total_seconds())

    def _get_call_metrics(self, db, user_id: str, hours: int = 24) -> Dict[str, Any]:
        """
        Get aggregated call metrics for time period.

        Args:
            db: Database session
            user_id: User identifier
            hours: Time period in hours

        Returns:
            Dict with metric values
        """
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)

            # Total calls in period
            total_calls = db.query(func.count(CallLog.id)).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.startedAt >= cutoff
                )
            ).scalar() or 0

            # Active calls count
            active_count = db.query(func.count(CallLog.id)).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.status == 'active'
                )
            ).scalar() or 0

            # Completed calls
            completed_calls = db.query(CallLog).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.status == 'ended',
                    CallLog.startedAt >= cutoff
                )
            ).all()

            # Calculate average duration
            if completed_calls:
                total_duration = sum(
                    call.duration or 0 for call in completed_calls
                )
                avg_duration = total_duration / len(completed_calls)
            else:
                avg_duration = 0

            # Outcome counts
            outcome_counts = {}
            for call in completed_calls:
                outcome = call.outcome or 'unknown'
                outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1

            # Success rate (completed calls / total ended calls)
            completed_count = outcome_counts.get('completed', 0)
            ended_count = len(completed_calls)
            success_rate = (completed_count / ended_count * 100) if ended_count > 0 else 0

            return {
                'total_calls': total_calls,
                'active_calls': active_count,
                'completed_calls': len(completed_calls),
                'average_duration': round(avg_duration, 2),
                'success_rate': round(success_rate, 2),
                'outcome_counts': outcome_counts,
                'period_hours': hours
            }

        except Exception as e:
            logger.error(f"Error calculating metrics: {e}", exc_info=True)
            return {
                'total_calls': 0,
                'active_calls': 0,
                'completed_calls': 0,
                'average_duration': 0,
                'success_rate': 0,
                'outcome_counts': {},
                'period_hours': hours,
                'error': str(e)
            }

    def _get_recent_calls(
        self,
        db,
        user_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get most recent calls for a user.

        Args:
            db: Database session
            user_id: User identifier
            limit: Maximum number of calls to return

        Returns:
            List of recent call dictionaries
        """
        try:
            recent_calls = db.query(CallLog).filter(
                CallLog.userId == user_id
            ).order_by(
                CallLog.startedAt.desc()
            ).limit(limit).all()

            return [call.to_dict() for call in recent_calls]

        except Exception as e:
            logger.error(f"Error getting recent calls: {e}", exc_info=True)
            return []

    def _get_outcome_distribution(
        self,
        db,
        user_id: str,
        hours: int = 24
    ) -> Dict[str, int]:
        """
        Get outcome distribution for time period.

        Args:
            db: Database session
            user_id: User identifier
            hours: Time period in hours

        Returns:
            Dict mapping outcomes to counts
        """
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)

            # Query outcome distribution
            results = db.query(
                CallLog.outcome,
                func.count(CallLog.id)
            ).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.status == 'ended',
                    CallLog.startedAt >= cutoff,
                    CallLog.outcome.isnot(None)
                )
            ).group_by(CallLog.outcome).all()

            return {
                outcome: count
                for outcome, count in results
            }

        except Exception as e:
            logger.error(f"Error getting outcome distribution: {e}", exc_info=True)
            return {}

    def get_calls_per_hour(
        self,
        user_id: str,
        hours: int = 24
    ) -> Dict[str, int]:
        """
        Get calls per hour for the last N hours.

        Args:
            user_id: User identifier
            hours: Number of hours to analyze

        Returns:
            Dict mapping hour to call count
        """
        try:
            db = SessionLocal()
            cutoff = datetime.utcnow() - timedelta(hours=hours)

            calls = db.query(CallLog).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.startedAt >= cutoff
                )
            ).all()

            # Group by hour
            hourly_counts = {}
            for call in calls:
                if not call.startedAt:
                    continue

                hour_key = call.startedAt.strftime('%Y-%m-%d %H:00')
                hourly_counts[hour_key] = hourly_counts.get(hour_key, 0) + 1

            db.close()
            return hourly_counts

        except Exception as e:
            logger.error(f"Error calculating calls per hour: {e}", exc_info=True)
            return {}

    def get_agent_performance(
        self,
        user_id: str,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Get performance metrics per agent.

        Args:
            user_id: User identifier
            hours: Time period in hours

        Returns:
            List of agent performance dictionaries
        """
        try:
            db = SessionLocal()
            cutoff = datetime.utcnow() - timedelta(hours=hours)

            # Query calls grouped by agent
            results = db.query(
                CallLog.agentConfigId,
                func.count(CallLog.id).label('total_calls'),
                func.avg(CallLog.duration).label('avg_duration'),
                func.max(CallLog.startedAt).label('last_call_at'),
                func.sum(
                    func.cast(CallLog.outcome == 'completed', Integer)
                ).label('completed_count')
            ).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.startedAt >= cutoff,
                    CallLog.agentConfigId.isnot(None)
                )
            ).group_by(CallLog.agentConfigId).all()

            agent_metrics = []
            for result in results:
                total = result.total_calls or 0
                completed = result.completed_count or 0
                success_rate = (completed / total * 100) if total > 0 else 0

                agent_metrics.append({
                    'agentConfigId': result.agentConfigId,
                    'total_calls': total,
                    'average_duration': round(result.avg_duration or 0, 2),
                    'success_rate': round(success_rate, 2),
                    'completed_calls': completed,
                    'last_call_at': result.last_call_at.isoformat() if result.last_call_at else None
                })

            # Also get active calls count per agent
            active_calls_query = db.query(
                CallLog.agentConfigId,
                func.count(CallLog.id).label('active_count')
            ).filter(
                and_(
                    CallLog.userId == user_id,
                    CallLog.status == 'active'
                )
            ).group_by(CallLog.agentConfigId).all()

            # Create a map of agent_id -> active_count
            active_calls_map = {row.agentConfigId: row.active_count for row in active_calls_query}

            # Add active calls count to agent metrics
            for metric in agent_metrics:
                metric['active_calls'] = active_calls_map.get(metric['agentConfigId'], 0)

            db.close()
            return agent_metrics

        except Exception as e:
            logger.error(f"Error calculating agent performance: {e}", exc_info=True)
            return []
