"""
Funnel Engine Queue Utilities

Enqueue funnel stages for background processing.
COPIED FROM webhook_worker/enqueue.py PATTERN
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from .models import (
    FunnelStageQueue,
    FunnelExecution,
    FunnelNode,
    Funnel,
    QueueStatus,
)


def enqueue_funnel_stage(
    db: Session,
    execution_id: str,
    node_id: str,
    user_id: str,
    funnel_id: str,
    payload: Optional[Dict[str, Any]] = None,
    max_attempts: int = 3,
    execute_at: Optional[datetime] = None,
) -> FunnelStageQueue:
    """
    Enqueue a funnel stage for background processing

    COPIED FROM webhook_worker/enqueue.py:enqueue_webhook()

    Args:
        db: Database session
        execution_id: Funnel execution ID
        node_id: Node/stage to process
        user_id: User ID (multi-tenant isolation)
        funnel_id: Funnel ID
        payload: Optional stage execution data
        max_attempts: Maximum retry attempts
        execute_at: Optional future execution time (for DELAY nodes)

    Returns:
        FunnelStageQueue entry
    """
    import uuid

    queue_entry = FunnelStageQueue(
        id=str(uuid.uuid4()),  # Generate CUID-like ID
        execution_id=execution_id,
        user_id=user_id,
        funnel_id=funnel_id,
        node_id=node_id,
        status=QueueStatus.PENDING,
        attempt_count=0,
        max_attempts=max_attempts,
        next_retry_at=execute_at or datetime.utcnow(),  # Support delayed execution
        payload=payload or {},
    )

    db.add(queue_entry)
    db.commit()
    db.refresh(queue_entry)

    return queue_entry


def enqueue_next_stage(
    db: Session,
    execution_id: str,
    current_node_id: str,
    outcome: str,
    user_id: str,
    funnel_id: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Optional[FunnelStageQueue]:
    """
    Enqueue the next stage based on current node outcome

    Finds the appropriate edge based on outcome and enqueues target node

    Args:
        db: Database session
        execution_id: Funnel execution ID
        current_node_id: Current node ID
        outcome: Node outcome (e.g., "answered", "voicemail", "completed")
        user_id: User ID (multi-tenant isolation)
        funnel_id: Funnel ID
        payload: Optional stage execution data

    Returns:
        FunnelStageQueue entry if next stage found, None if end of funnel
    """
    from .models import FunnelEdge

    # Find matching edge based on outcome
    edge = db.query(FunnelEdge).filter(
        FunnelEdge.source_node_id == current_node_id,
        FunnelEdge.condition == outcome,
    ).first()

    # If no specific edge found, try default edge (null condition)
    if not edge:
        edge = db.query(FunnelEdge).filter(
            FunnelEdge.source_node_id == current_node_id,
            FunnelEdge.condition.is_(None),
        ).first()

    # No next stage found (end of funnel)
    if not edge:
        return None

    # Enqueue target node
    return enqueue_funnel_stage(
        db=db,
        execution_id=execution_id,
        node_id=edge.target_node_id,
        user_id=user_id,
        funnel_id=funnel_id,
        payload=payload,
    )


def enqueue_for_execution(
    db: Session,
    execution_id: str,
    start_node_id: Optional[str] = None,
) -> Optional[FunnelStageQueue]:
    """
    Start a funnel execution by enqueuing the first stage

    Args:
        db: Database session
        execution_id: Funnel execution ID
        start_node_id: Optional start node (defaults to first node in graph)

    Returns:
        FunnelStageQueue entry
    """
    # Get execution
    execution = db.query(FunnelExecution).filter(
        FunnelExecution.id == execution_id
    ).first()

    if not execution:
        raise ValueError(f"Execution {execution_id} not found")

    # Get funnel
    funnel = db.query(Funnel).filter(
        Funnel.id == execution.funnel_id
    ).first()

    if not funnel:
        raise ValueError(f"Funnel {execution.funnel_id} not found")

    # Determine start node
    if not start_node_id:
        # Find first node in graph (node with no incoming edges)
        from .models import FunnelEdge

        # Get all nodes
        all_nodes = db.query(FunnelNode.id).filter(
            FunnelNode.funnel_id == funnel.id
        ).all()
        all_node_ids = {node.id for node in all_nodes}

        # Get all target nodes (nodes with incoming edges)
        target_nodes = db.query(FunnelEdge.target_node_id).filter(
            FunnelEdge.funnel_id == funnel.id
        ).all()
        target_node_ids = {edge.target_node_id for edge in target_nodes}

        # Start nodes = nodes with no incoming edges
        start_nodes = all_node_ids - target_node_ids

        if not start_nodes:
            raise ValueError(f"Funnel {funnel.id} has no start node")

        start_node_id = list(start_nodes)[0]

    # Enqueue start node
    return enqueue_funnel_stage(
        db=db,
        execution_id=execution_id,
        node_id=start_node_id,
        user_id=execution.user_id,
        funnel_id=execution.funnel_id,
        payload=execution.contact_data or {},
    )


def get_queue_stats(db: Session, user_id: Optional[str] = None) -> Dict[str, int]:
    """
    Get queue statistics

    COPIED FROM webhook_worker/enqueue.py:get_queue_stats()

    Args:
        db: Database session
        user_id: Optional user ID for filtered stats

    Returns:
        Dictionary with queue statistics
    """
    query = db.query(FunnelStageQueue)

    # Filter by user if provided (multi-tenant)
    if user_id:
        query = query.filter(FunnelStageQueue.user_id == user_id)

    # Count by status
    stats = {
        "total_pending": query.filter(FunnelStageQueue.status == QueueStatus.PENDING).count(),
        "total_processing": query.filter(FunnelStageQueue.status == QueueStatus.PROCESSING).count(),
        "total_completed": query.filter(FunnelStageQueue.status == QueueStatus.COMPLETED).count(),
        "total_failed": query.filter(FunnelStageQueue.status == QueueStatus.FAILED).count(),
    }

    # Average retry count for completed
    avg_retries = query.filter(
        FunnelStageQueue.status == QueueStatus.COMPLETED
    ).with_entities(
        func.avg(FunnelStageQueue.attempt_count)
    ).scalar()

    stats["avg_retry_count"] = float(avg_retries) if avg_retries else 0.0

    return stats


def get_execution_queue_entries(
    db: Session,
    execution_id: str,
    user_id: str,
) -> List[FunnelStageQueue]:
    """
    Get all queue entries for a funnel execution

    Args:
        db: Database session
        execution_id: Funnel execution ID
        user_id: User ID (multi-tenant check)

    Returns:
        List of queue entries
    """
    return db.query(FunnelStageQueue).filter(
        FunnelStageQueue.execution_id == execution_id,
        FunnelStageQueue.user_id == user_id,  # Multi-tenant isolation
    ).order_by(FunnelStageQueue.created_at).all()


def cleanup_completed_queue(
    db: Session,
    days_old: int = 30,
) -> int:
    """
    Clean up old completed queue entries

    Args:
        db: Database session
        days_old: Remove entries older than this many days

    Returns:
        Number of entries deleted
    """
    from datetime import timedelta

    cutoff_date = datetime.utcnow() - timedelta(days=days_old)

    deleted = db.query(FunnelStageQueue).filter(
        FunnelStageQueue.status == QueueStatus.COMPLETED,
        FunnelStageQueue.processed_at < cutoff_date,
    ).delete()

    db.commit()

    return deleted
