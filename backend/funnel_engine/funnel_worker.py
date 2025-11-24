#!/usr/bin/env python3
"""
Funnel Worker

Background worker for processing funnel stages.
COPIED FROM webhook_worker/worker.py PATTERN

Uses PostgreSQL SKIP LOCKED for concurrent processing.
Exponential backoff retry strategy.
Graceful shutdown handling.
"""

import os
import sys
import time
import signal
import logging
from datetime import datetime
from typing import List, Optional

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from funnel_engine.models import FunnelStageQueue
from funnel_engine.executor import FunnelExecutor
from funnel_engine.retry import RetryStrategy

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Configuration (from environment)
DATABASE_URL = os.getenv("DATABASE_URL")
WORKER_POLL_INTERVAL = int(os.getenv("WORKER_POLL_INTERVAL", 5))  # seconds
WORKER_BATCH_SIZE = int(os.getenv("WORKER_BATCH_SIZE", 10))
WORKER_NAME = os.getenv("WORKER_NAME", "funnel-worker-1")

# Global flag for graceful shutdown (COPIED FROM webhook_worker)
running = True


def handle_shutdown(signum, frame):
    """
    Handle shutdown signals gracefully

    COPIED FROM webhook_worker/worker.py
    """
    global running
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    running = False


# Register signal handlers (COPIED FROM webhook_worker)
signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)


def poll_funnel_queue(db: Session) -> List[FunnelStageQueue]:
    """
    Poll funnel queue for pending/failed stages

    COPIED FROM webhook_worker/worker.py:poll_queue()
    Uses PostgreSQL SKIP LOCKED for concurrent processing

    Args:
        db: Database session

    Returns:
        List of queue entries to process
    """
    try:
        # CRITICAL: SKIP LOCKED pattern for concurrent workers
        # COPIED FROM webhook_worker/worker.py
        entries = db.query(FunnelStageQueue).filter(
            FunnelStageQueue.status.in_(["pending", "failed"]),  # Use string values for PostgreSQL enum
            FunnelStageQueue.next_retry_at <= datetime.utcnow(),
        ).limit(WORKER_BATCH_SIZE).with_for_update(
            skip_locked=True  # ⭐ CRITICAL: Allows multiple workers to process queue
        ).all()

        return entries

    except Exception as e:
        logger.error(f"Error polling queue: {e}", exc_info=True)
        return []


def process_funnel_entry(db: Session, entry: FunnelStageQueue) -> None:
    """
    Process a single funnel stage queue entry

    COPIED FROM webhook_worker/worker.py:process_webhook()

    Args:
        db: Database session
        entry: Queue entry to process
    """
    retry_strategy = RetryStrategy()

    try:
        logger.info(
            f"Processing funnel stage: execution={entry.execution_id}, "
            f"node={entry.node_id}, attempt={entry.attempt_count + 1}"
        )

        # Mark as processing (COPIED FROM webhook_worker)
        entry.status = "processing"
        entry.attempt_count += 1
        db.commit()

        # Execute stage
        executor = FunnelExecutor(db)
        outcome = executor.process_stage(
            execution_id=entry.execution_id,
            node_id=entry.node_id,
            payload=entry.payload,
        )

        # Check if stage is still pending/waiting (e.g., waiting for call completion or delay)
        if outcome in ("pending", "waiting"):
            logger.info(
                f"Stage {outcome} (async operation or delay): execution={entry.execution_id}, "
                f"node={entry.node_id}"
            )

            # Reset to pending status - next_retry_at already set by executor for delays
            entry.status = "pending"
            # Only calculate retry delay if not already set (for non-delay nodes)
            if outcome == "pending":
                entry.next_retry_at = retry_strategy.calculate_next_retry(entry.attempt_count)
            db.commit()
            return

        # Stage completed successfully
        logger.info(
            f"Stage completed: execution={entry.execution_id}, "
            f"node={entry.node_id}, outcome={outcome}"
        )

        entry.status = "completed"
        entry.processed_at = datetime.utcnow()
        entry.last_error = None
        db.commit()

    except Exception as e:
        logger.error(
            f"Error processing funnel stage: execution={entry.execution_id}, "
            f"node={entry.node_id}, error={e}",
            exc_info=True,
        )

        # Retry logic (COPIED FROM webhook_worker)
        entry.next_retry_at = retry_strategy.calculate_next_retry(entry.attempt_count)
        entry.last_error = str(e)

        if entry.attempt_count >= entry.max_attempts:
            # Dead letter - max retries exceeded
            logger.error(
                f"Stage failed permanently (max retries): execution={entry.execution_id}, "
                f"node={entry.node_id}, attempts={entry.attempt_count}"
            )
            entry.status = "failed"
        else:
            # Will retry
            logger.warning(
                f"Stage will retry: execution={entry.execution_id}, "
                f"node={entry.node_id}, attempt={entry.attempt_count}, "
                f"next_retry={entry.next_retry_at}"
            )
            entry.status = "failed"

        db.commit()


def main():
    """
    Main worker loop

    COPIED FROM webhook_worker/worker.py:main()
    """
    global running

    logger.info(f"Starting {WORKER_NAME}...")
    logger.info(f"Database: {DATABASE_URL[:20]}...")
    logger.info(f"Poll interval: {WORKER_POLL_INTERVAL}s")
    logger.info(f"Batch size: {WORKER_BATCH_SIZE}")

    # Create database engine and session
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    SessionLocal = sessionmaker(bind=engine)

    logger.info("Worker started successfully")

    # Main polling loop (COPIED FROM webhook_worker)
    while running:
        db = SessionLocal()

        try:
            # Poll queue for pending entries
            entries = poll_funnel_queue(db)

            if entries:
                logger.info(f"Processing {len(entries)} funnel stages...")

                for entry in entries:
                    if not running:
                        logger.info("Shutdown requested, stopping processing")
                        break

                    process_funnel_entry(db, entry)

            else:
                logger.debug("No pending funnel stages")

        except Exception as e:
            logger.error(f"Error in main loop: {e}", exc_info=True)

        finally:
            db.close()

        # Sleep before next poll (COPIED FROM webhook_worker)
        if running:
            time.sleep(WORKER_POLL_INTERVAL)

    logger.info("Worker shutdown complete")


if __name__ == "__main__":
    if not DATABASE_URL:
        logger.error("DATABASE_URL environment variable not set")
        sys.exit(1)

    main()
