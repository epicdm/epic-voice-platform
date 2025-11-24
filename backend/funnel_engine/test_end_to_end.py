#!/usr/bin/env python3
"""
End-to-End Test: Funnel Engine
Creates a minimal funnel and tests complete execution flow
"""

import sys
import os
import time
import uuid
from datetime import datetime

# Add paths for imports
sys.path.insert(0, '/opt/livekit1')
sys.path.insert(0, '/opt/livekit1/backend')

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import SessionLocal
from funnel_engine.models import (
    Funnel,
    FunnelNode,
    FunnelEdge,
    FunnelExecution,
    FunnelExecutionEvent,
    FunnelStageQueue,
)
from funnel_engine.enqueue import enqueue_for_execution

print("=" * 80)
print("FUNNEL ENGINE - END-TO-END TEST")
print("=" * 80)
print()

# Test data
LEAD_ID = "7bf248f4-7c4f-4416-a61b-cc174a0f2e0c"
USER_ID = "b50cec05-fa5b-4bb4-aaaa-21358c699c45"
PHONE_NUMBER = "+15555551234"

print(f"Test Lead ID: {LEAD_ID}")
print(f"Test User ID: {USER_ID}")
print(f"Phone Number: {PHONE_NUMBER}")
print()

# Connect to database
db = SessionLocal()

try:
    # ========================================================================
    # STEP 1: Create Funnel
    # ========================================================================
    print("=" * 80)
    print("STEP 1: Creating Test Funnel")
    print("=" * 80)

    funnel_id = str(uuid.uuid4())
    funnel = Funnel(
        id=funnel_id,
        user_id=USER_ID,
        name="End-to-End Test Funnel",
        description="Minimal test: Entry → Wait(5s) → End",
        status="active",  # Must be active to start execution
        graph={},
        settings={},
    )
    db.add(funnel)
    db.commit()

    print(f"✅ Funnel created: {funnel_id}")
    print(f"   Name: {funnel.name}")
    print(f"   Status: {funnel.status}")
    print()

    # ========================================================================
    # STEP 2: Create Nodes
    # ========================================================================
    print("=" * 80)
    print("STEP 2: Creating Nodes")
    print("=" * 80)

    # Node 1: Entry node (we'll start execution here)
    node1_id = str(uuid.uuid4())
    node1 = FunnelNode(
        id=node1_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        node_type="delay",  # Start with a simple delay
        label="Entry Delay",
        config={"delay_seconds": 0},  # No delay, immediate
        position_x=100,
        position_y=100,
    )
    db.add(node1)

    # Node 2: Wait node
    node2_id = str(uuid.uuid4())
    node2 = FunnelNode(
        id=node2_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        node_type="delay",
        label="Wait 5 Seconds",
        config={"delay_seconds": 5},
        position_x=300,
        position_y=100,
    )
    db.add(node2)

    # Node 3: End node
    node3_id = str(uuid.uuid4())
    node3 = FunnelNode(
        id=node3_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        node_type="end",
        label="End",
        config={},
        position_x=500,
        position_y=100,
    )
    db.add(node3)

    db.commit()

    print(f"✅ Node 1 (Entry): {node1_id} - {node1.label}")
    print(f"✅ Node 2 (Wait):  {node2_id} - {node2.label}")
    print(f"✅ Node 3 (End):   {node3_id} - {node3.label}")
    print()

    # ========================================================================
    # STEP 3: Create Edges
    # ========================================================================
    print("=" * 80)
    print("STEP 3: Creating Edges")
    print("=" * 80)

    # Edge 1: Entry → Wait
    edge1_id = str(uuid.uuid4())
    edge1 = FunnelEdge(
        id=edge1_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        source_node_id=node1_id,
        target_node_id=node2_id,
        condition="completed",
        label="After Entry",
    )
    db.add(edge1)

    # Edge 2: Wait → End
    edge2_id = str(uuid.uuid4())
    edge2 = FunnelEdge(
        id=edge2_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        source_node_id=node2_id,
        target_node_id=node3_id,
        condition="completed",
        label="After Wait",
    )
    db.add(edge2)

    db.commit()

    print(f"✅ Edge 1: {node1.label} → {node2.label} (condition: completed)")
    print(f"✅ Edge 2: {node2.label} → {node3.label} (condition: completed)")
    print()

    # ========================================================================
    # STEP 4: Create Execution
    # ========================================================================
    print("=" * 80)
    print("STEP 4: Creating Funnel Execution")
    print("=" * 80)

    execution_id = str(uuid.uuid4())
    execution = FunnelExecution(
        id=execution_id,
        funnel_id=funnel_id,
        user_id=USER_ID,
        lead_id=LEAD_ID,
        contact_data={
            "phone": PHONE_NUMBER,
            "name": "Test Lead",
            "lead_id": LEAD_ID,
        },
        context={
            "test": True,
            "created_by": "end_to_end_test",
        },
        status="active",
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    print(f"✅ Execution created: {execution_id}")
    print(f"   Funnel: {funnel_id}")
    print(f"   Lead: {LEAD_ID}")
    print(f"   Status: {execution.status}")
    print(f"   Started: {execution.started_at}")
    print()

    # ========================================================================
    # STEP 5: Enqueue First Stage
    # ========================================================================
    print("=" * 80)
    print("STEP 5: Enqueueing First Stage")
    print("=" * 80)

    # Enqueue the first node (entry)
    queue_entry = FunnelStageQueue(
        id=str(uuid.uuid4()),
        execution_id=execution_id,
        user_id=USER_ID,
        funnel_id=funnel_id,
        node_id=node1_id,
        status="pending",
        attempt_count=0,
        max_attempts=3,
        next_retry_at=datetime.utcnow(),
        payload=execution.contact_data,
    )
    db.add(queue_entry)
    db.commit()
    db.refresh(queue_entry)

    print(f"✅ Stage enqueued: {queue_entry.id}")
    print(f"   Node: {node1.label}")
    print(f"   Status: {queue_entry.status}")
    print(f"   Attempt: {queue_entry.attempt_count}/{queue_entry.max_attempts}")
    print()

    # ========================================================================
    # STEP 6: Monitor Worker Processing
    # ========================================================================
    print("=" * 80)
    print("STEP 6: Monitoring Worker Processing")
    print("=" * 80)
    print("Waiting for workers to process stages (max 60 seconds)...")
    print()

    max_wait = 60
    check_interval = 2
    elapsed = 0

    while elapsed < max_wait:
        # Refresh execution
        db.refresh(execution)

        # Get queue entries
        queue_entries = db.query(FunnelStageQueue).filter(
            FunnelStageQueue.execution_id == execution_id
        ).all()

        # Get events
        events = db.query(FunnelExecutionEvent).filter(
            FunnelExecutionEvent.execution_id == execution_id
        ).order_by(FunnelExecutionEvent.created_at).all()

        print(f"[{elapsed}s] Execution Status: {execution.status}")
        print(f"       Queue Entries: {len(queue_entries)}")
        print(f"       Events: {len(events)}")

        # Show queue status
        for qe in queue_entries:
            print(f"         - Queue {qe.id[:8]}... Node: {qe.node_id[:8]}... Status: {qe.status}")

        # Check if completed
        if execution.status == "completed":
            print()
            print("✅ EXECUTION COMPLETED!")
            break

        # Check if failed
        if execution.status == "failed":
            print()
            print("❌ EXECUTION FAILED!")
            break

        time.sleep(check_interval)
        elapsed += check_interval

    if elapsed >= max_wait:
        print()
        print("⚠️  Timeout waiting for execution to complete")

    print()

    # ========================================================================
    # STEP 7: Print Results
    # ========================================================================
    print("=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    print()

    # Refresh execution one more time
    db.refresh(execution)

    print("EXECUTION:")
    print(f"  ID: {execution.id}")
    print(f"  Funnel ID: {execution.funnel_id}")
    print(f"  Lead ID: {execution.lead_id}")
    print(f"  Status: {execution.status}")
    print(f"  Current Node: {execution.current_node_id}")
    print(f"  Last Outcome: {execution.last_outcome}")
    print(f"  Started: {execution.started_at}")
    print(f"  Completed: {execution.completed_at}")
    print(f"  Contact Data: {execution.contact_data}")
    print(f"  Context: {execution.context}")
    print()

    # Get all queue entries
    queue_entries = db.query(FunnelStageQueue).filter(
        FunnelStageQueue.execution_id == execution_id
    ).order_by(FunnelStageQueue.created_at).all()

    print("QUEUE HISTORY:")
    for i, qe in enumerate(queue_entries, 1):
        node = db.query(FunnelNode).filter(FunnelNode.id == qe.node_id).first()
        print(f"  {i}. Queue Entry {qe.id}")
        print(f"     Node: {node.label if node else 'Unknown'} ({qe.node_id})")
        print(f"     Status: {qe.status}")
        print(f"     Attempts: {qe.attempt_count}/{qe.max_attempts}")
        print(f"     Created: {qe.created_at}")
        print(f"     Processed: {qe.processed_at}")
        if qe.last_error:
            print(f"     Error: {qe.last_error}")
        print()

    # Get all events
    events = db.query(FunnelExecutionEvent).filter(
        FunnelExecutionEvent.execution_id == execution_id
    ).order_by(FunnelExecutionEvent.created_at).all()

    print("EVENTS:")
    for i, event in enumerate(events, 1):
        node = db.query(FunnelNode).filter(FunnelNode.id == event.node_id).first() if event.node_id else None
        print(f"  {i}. Event {event.id}")
        print(f"     Type: {event.event_type}")
        print(f"     Node: {node.label if node else 'N/A'} ({event.node_id})")
        print(f"     Outcome: {event.outcome}")
        print(f"     Metadata: {event.event_metadata}")
        if event.error_message:
            print(f"     Error: {event.error_message}")
        print(f"     Created: {event.created_at}")
        print()

    # ========================================================================
    # SUMMARY
    # ========================================================================
    print("=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print()

    success = execution.status == "completed"

    if success:
        print("✅ TEST PASSED!")
        print()
        print("Verified:")
        print("  ✅ Funnel created")
        print("  ✅ Nodes created (3)")
        print("  ✅ Edges created (2)")
        print("  ✅ Execution created")
        print("  ✅ Stage enqueued")
        print("  ✅ Worker processed stages")
        print(f"  ✅ Execution completed ({len(events)} events, {len(queue_entries)} queue entries)")
        print()
        print("🚀 FUNNEL ENGINE IS LIVE!")
    else:
        print("❌ TEST FAILED!")
        print()
        print(f"Execution Status: {execution.status}")
        print(f"Events: {len(events)}")
        print(f"Queue Entries: {len(queue_entries)}")
        print()
        print("Check worker logs:")
        print("  sudo journalctl -u funnel-worker@1 -n 50")

    print()
    print("=" * 80)

finally:
    db.close()
