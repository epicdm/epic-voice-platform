#!/usr/bin/env python3
"""
Queue Monitor - Real-time webhook queue monitoring utility

Monitors webhook delivery queue and provides insights on:
- Queue depth and processing rates
- Dead letter queue alerts
- Worker health and throughput
- Partner delivery statistics

Usage:
    python queue_monitor.py                    # One-time snapshot
    python queue_monitor.py --watch            # Continuous monitoring
    python queue_monitor.py --watch --interval 5  # Custom interval
    python queue_monitor.py --user-id user_123    # Filter by user
    python queue_monitor.py --alerts-only         # Show only problems
"""

import argparse
import time
import sys
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from collections import defaultdict

from sqlalchemy import create_engine, func
from sqlalchemy.orm import sessionmaker

from models import WebhookDeliveryQueue, PartnerWebhook, WebhookDeliveryLog
from config import WorkerConfig


class QueueMonitor:
    """Real-time queue monitoring and statistics."""

    def __init__(self, user_id: Optional[str] = None):
        """
        Initialize queue monitor.

        Args:
            user_id: Optional user ID to filter monitoring
        """
        self.user_id = user_id

        # Database connection
        engine = create_engine(
            WorkerConfig.DATABASE_URL,
            pool_pre_ping=True
        )
        self.Session = sessionmaker(bind=engine)

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get current queue statistics."""
        db = self.Session()
        try:
            query = db.query(
                WebhookDeliveryQueue.status,
                func.count(WebhookDeliveryQueue.id).label('count'),
                func.min(WebhookDeliveryQueue.createdAt).label('oldest'),
                func.avg(WebhookDeliveryQueue.attempt_count).label('avg_attempts')
            )

            if self.user_id:
                query = query.filter(WebhookDeliveryQueue.userId == self.user_id)

            results = query.group_by(WebhookDeliveryQueue.status).all()

            stats = {}
            for row in results:
                stats[row.status] = {
                    'count': row.count,
                    'oldest': row.oldest,
                    'avg_attempts': float(row.avg_attempts) if row.avg_attempts else 0
                }

            # Calculate totals
            total = sum(s['count'] for s in stats.values())
            delivered = stats.get('delivered', {}).get('count', 0)
            success_rate = (delivered / total * 100) if total > 0 else 0

            stats['_totals'] = {
                'total': total,
                'success_rate': success_rate
            }

            return stats

        finally:
            db.close()

    def get_pending_overdue(self, minutes: int = 10) -> int:
        """Get count of webhooks pending longer than threshold."""
        db = self.Session()
        try:
            threshold = datetime.utcnow() - timedelta(minutes=minutes)
            query = db.query(func.count(WebhookDeliveryQueue.id)).filter(
                WebhookDeliveryQueue.status == 'pending',
                WebhookDeliveryQueue.createdAt < threshold
            )

            if self.user_id:
                query = query.filter(WebhookDeliveryQueue.userId == self.user_id)

            return query.scalar()

        finally:
            db.close()

    def get_partner_stats(self) -> Dict[str, Any]:
        """Get per-partner delivery statistics."""
        db = self.Session()
        try:
            query = db.query(
                PartnerWebhook.partner_name,
                PartnerWebhook.partner_slug,
                WebhookDeliveryQueue.status,
                func.count(WebhookDeliveryQueue.id).label('count')
            ).join(
                WebhookDeliveryQueue,
                PartnerWebhook.id == WebhookDeliveryQueue.partnerId
            )

            if self.user_id:
                query = query.filter(PartnerWebhook.userId == self.user_id)

            results = query.group_by(
                PartnerWebhook.partner_name,
                PartnerWebhook.partner_slug,
                WebhookDeliveryQueue.status
            ).all()

            # Organize by partner
            partners = defaultdict(lambda: defaultdict(int))
            for row in results:
                partners[row.partner_slug][row.status] = row.count
                partners[row.partner_slug]['_name'] = row.partner_name

            return dict(partners)

        finally:
            db.close()

    def get_recent_failures(self, limit: int = 5) -> list:
        """Get recent failed webhook deliveries."""
        db = self.Session()
        try:
            query = db.query(WebhookDeliveryQueue).filter(
                WebhookDeliveryQueue.status.in_(['failed', 'dead_letter'])
            )

            if self.user_id:
                query = query.filter(WebhookDeliveryQueue.userId == self.user_id)

            failures = query.order_by(
                WebhookDeliveryQueue.updatedAt.desc()
            ).limit(limit).all()

            return [
                {
                    'id': f.id,
                    'url': f.url,
                    'event_type': f.event_type,
                    'status': f.status,
                    'attempts': f.attempt_count,
                    'last_error': f.last_error,
                    'last_status': f.last_response_status,
                    'updated': f.updatedAt
                }
                for f in failures
            ]

        finally:
            db.close()

    def display_stats(self, clear_screen: bool = False):
        """Display formatted queue statistics."""
        if clear_screen:
            print("\033[2J\033[H", end="")  # Clear screen

        print("=" * 80)
        print(f"Webhook Queue Monitor - {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        if self.user_id:
            print(f"Filtered by User: {self.user_id}")
        print("=" * 80)
        print()

        # Queue statistics
        stats = self.get_queue_stats()
        print("📊 Queue Statistics:")
        print(f"  Total Webhooks: {stats['_totals']['total']}")
        print(f"  Success Rate: {stats['_totals']['success_rate']:.1f}%")
        print()

        for status in ['pending', 'processing', 'delivered', 'failed', 'dead_letter']:
            if status in stats:
                s = stats[status]
                age = ""
                if s['oldest']:
                    age_seconds = (datetime.utcnow() - s['oldest']).total_seconds()
                    age = f" (oldest: {int(age_seconds/60)}m ago)"
                print(f"  {status.upper():12} {s['count']:6} {age}")
                if s['avg_attempts'] > 0:
                    print(f"               Avg attempts: {s['avg_attempts']:.1f}")

        # Overdue warnings
        print()
        overdue = self.get_pending_overdue(minutes=10)
        if overdue > 0:
            print(f"⚠️  Warning: {overdue} webhooks pending > 10 minutes")

        # Dead letter alerts
        if 'dead_letter' in stats and stats['dead_letter']['count'] > 0:
            print(f"🚨 Alert: {stats['dead_letter']['count']} webhooks in dead letter queue")

        # Partner statistics
        print()
        print("🤝 Partner Statistics:")
        partners = self.get_partner_stats()
        if partners:
            for slug, data in partners.items():
                name = data.pop('_name')
                total = sum(data.values())
                delivered = data.get('delivered', 0)
                rate = (delivered / total * 100) if total > 0 else 0
                print(f"  {name} ({slug}): {total} webhooks, {rate:.1f}% delivered")
        else:
            print("  No partner webhooks found")

        # Recent failures
        print()
        print("❌ Recent Failures:")
        failures = self.get_recent_failures(limit=5)
        if failures:
            for f in failures:
                print(f"  {f['id'][:8]}... {f['event_type']} -> {f['url'][:40]}...")
                print(f"    Status: {f['status']}, Attempts: {f['attempts']}, "
                      f"HTTP {f['last_status']}, Error: {f['last_error'][:50] if f['last_error'] else 'N/A'}")
        else:
            print("  No recent failures ✅")

        print()
        print("=" * 80)

    def watch(self, interval: int = 10, alerts_only: bool = False):
        """
        Continuously monitor queue.

        Args:
            interval: Refresh interval in seconds
            alerts_only: Only display when there are problems
        """
        print("Starting continuous monitoring... (Press Ctrl+C to stop)")
        print()

        try:
            while True:
                stats = self.get_queue_stats()
                overdue = self.get_pending_overdue(minutes=10)
                dead_letter = stats.get('dead_letter', {}).get('count', 0)

                has_problems = overdue > 0 or dead_letter > 0

                if not alerts_only or has_problems:
                    self.display_stats(clear_screen=not alerts_only)

                    if alerts_only and has_problems:
                        print(f"\n[Press Ctrl+C to stop] Next check in {interval}s...")

                time.sleep(interval)

        except KeyboardInterrupt:
            print("\n\nMonitoring stopped.")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Webhook Queue Monitor',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        '--watch',
        action='store_true',
        help='Continuously monitor queue'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=10,
        help='Refresh interval in seconds (default: 10)'
    )
    parser.add_argument(
        '--user-id',
        type=str,
        help='Filter by user ID'
    )
    parser.add_argument(
        '--alerts-only',
        action='store_true',
        help='Only display when problems detected'
    )
    args = parser.parse_args()

    # Validate configuration
    try:
        WorkerConfig.validate()
    except Exception as e:
        print(f"❌ Configuration error: {e}", file=sys.stderr)
        sys.exit(1)

    # Create monitor
    monitor = QueueMonitor(user_id=args.user_id)

    # Run monitoring
    if args.watch:
        monitor.watch(interval=args.interval, alerts_only=args.alerts_only)
    else:
        monitor.display_stats()


if __name__ == '__main__':
    main()
