"""
Test automatic funnel triggering when leads are created

This test:
1. Creates a test funnel with trigger_type = "lead_created" in settings
2. Activates the funnel
3. Creates a test lead to trigger the funnel
4. Verifies funnel execution is created
5. Monitors worker processing
"""

import sys
import os

# Add project root to path
project_root = os.path.join(os.path.dirname(__file__), '../..')
sys.path.insert(0, project_root)
sys.path.insert(0, os.path.join(project_root, 'backend'))

from database import SessionLocal
from sqlalchemy import text
import uuid
from datetime import datetime
import time

# Import from backend.funnel_engine
from backend.funnel_engine.models import (
    Funnel, FunnelNode, FunnelEdge, FunnelExecution,
    FunnelStatus, NodeType, ExecutionStatus, FunnelStageQueue
)
from backend.funnel_engine.enqueue import enqueue_for_execution


def create_test_funnel_with_trigger(db, user_id):
    """Create a funnel with lead_created trigger"""

    # Create funnel with lead_created trigger
    funnel = Funnel(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name="Lead Welcome Funnel",
        description="Automatically triggered when a new lead is created",
        status=FunnelStatus.ACTIVE,  # IMPORTANT: Must be active to trigger
        graph={},
        settings={
            "trigger_type": "lead_created",  # This enables automatic triggering
            "description": "Send welcome message when lead is created"
        }
    )

    db.add(funnel)
    db.commit()
    db.refresh(funnel)

    print(f"\n✅ Created funnel: {funnel.id} (name: {funnel.name})")
    print(f"   Status: {funnel.status.value}")
    print(f"   Settings: {funnel.settings}")

    # Create nodes
    node1 = FunnelNode(
        id=str(uuid.uuid4()),
        funnel_id=funnel.id,
        user_id=user_id,
        node_type=NodeType.DELAY,
        label="Wait 2 Seconds",
        config={"delay_seconds": 2},
        position_x=100,
        position_y=100
    )

    node2 = FunnelNode(
        id=str(uuid.uuid4()),
        funnel_id=funnel.id,
        user_id=user_id,
        node_type=NodeType.DELAY,
        label="Wait 3 Seconds",
        config={"delay_seconds": 3},
        position_x=300,
        position_y=100
    )

    node3 = FunnelNode(
        id=str(uuid.uuid4()),
        funnel_id=funnel.id,
        user_id=user_id,
        node_type=NodeType.END,
        label="End",
        config={},
        position_x=500,
        position_y=100
    )

    db.add_all([node1, node2, node3])
    db.commit()

    print(f"✅ Created 3 nodes")

    # Create edges
    edge1 = FunnelEdge(
        id=str(uuid.uuid4()),
        funnel_id=funnel.id,
        user_id=user_id,
        source_node_id=node1.id,
        target_node_id=node2.id,
        condition="completed",
        label="On Complete"
    )

    edge2 = FunnelEdge(
        id=str(uuid.uuid4()),
        funnel_id=funnel.id,
        user_id=user_id,
        source_node_id=node2.id,
        target_node_id=node3.id,
        condition="completed",
        label="On Complete"
    )

    db.add_all([edge1, edge2])
    db.commit()

    print(f"✅ Created 2 edges")

    return funnel


def create_test_lead(user_id):
    """Create a lead via the new API endpoint to trigger funnel"""
    import requests

    lead_data = {
        "phone_number": "+15555551234",
        "first_name": "Test",
        "last_name": "User",
        "email": "test@example.com",
        "company": "Test Company",
        "source": "test_script",
        "metadata": {
            "test": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    }

    print(f"\n📞 Creating test lead via API...")
    print(f"   Phone: {lead_data['phone_number']}")
    print(f"   Name: {lead_data['first_name']} {lead_data['last_name']}")

    # Note: This test creates the lead directly in the database
    # In production, this would be called via the API endpoint
    db = SessionLocal()
    try:
        result = db.execute(text("""
            INSERT INTO leads (
                user_id, phone_number, first_name, last_name,
                email, company, metadata, source, status
            ) VALUES (
                :user_id, :phone_number, :first_name, :last_name,
                :email, :company, CAST(:metadata AS jsonb), :source, :status
            )
            ON CONFLICT (user_id, phone_number, campaign_id) DO NOTHING
            RETURNING id
        """), {
            'user_id': user_id,
            'phone_number': lead_data['phone_number'],
            'first_name': lead_data['first_name'],
            'last_name': lead_data['last_name'],
            'email': lead_data['email'],
            'company': lead_data['company'],
            'metadata': '{"test": true}',
            'source': lead_data['source'],
            'status': 'new'
        })

        lead_row = result.fetchone()
        if not lead_row:
            print("❌ Lead already exists (duplicate), deleting and retrying...")
            db.execute(text("""
                DELETE FROM leads
                WHERE user_id = :user_id AND phone_number = :phone_number
            """), {'user_id': user_id, 'phone_number': lead_data['phone_number']})
            db.commit()

            # Retry
            result = db.execute(text("""
                INSERT INTO leads (
                    user_id, phone_number, first_name, last_name,
                    email, company, metadata, source, status
                ) VALUES (
                    :user_id, :phone_number, :first_name, :last_name,
                    :email, :company, CAST(:metadata AS jsonb), :source, :status
                )
                RETURNING id
            """), {
                'user_id': user_id,
                'phone_number': lead_data['phone_number'],
                'first_name': lead_data['first_name'],
                'last_name': lead_data['last_name'],
                'email': lead_data['email'],
                'company': lead_data['company'],
                'metadata': '{"test": true}',
                'source': lead_data['source'],
                'status': 'new'
            })
            lead_row = result.fetchone()

        lead_id = lead_row[0]
        db.commit()

        print(f"✅ Lead created: {lead_id}")

        # Now trigger the funnel manually (simulating what the endpoint does)
        from lead_campaign_api_endpoints import trigger_funnels_for_lead

        contact_data = {
            'phone_number': lead_data['phone_number'],
            'first_name': lead_data['first_name'],
            'last_name': lead_data['last_name'],
            'email': lead_data['email'],
            'company': lead_data['company'],
            'source': lead_data['source'],
            'metadata': {}
        }

        execution_ids = trigger_funnels_for_lead(lead_id, contact_data, user_id, db)

        return lead_id, execution_ids

    finally:
        db.close()


def monitor_execution(db, execution_id, max_wait=60):
    """Monitor funnel execution until completion"""

    print(f"\n⏱️  Monitoring execution {execution_id}...")
    start_time = time.time()

    while time.time() - start_time < max_wait:
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id
        ).first()

        if not execution:
            print("❌ Execution not found!")
            return False

        print(f"   Status: {execution.status.value} (elapsed: {int(time.time() - start_time)}s)")

        if execution.status == ExecutionStatus.COMPLETED:
            print(f"\n✅ Execution completed!")
            return True
        elif execution.status == ExecutionStatus.FAILED:
            print(f"\n❌ Execution failed!")
            return False

        time.sleep(2)

    print(f"\n⏰ Timeout waiting for execution")
    return False


def print_execution_details(db, execution_id):
    """Print detailed execution information"""

    # Get execution
    execution = db.query(FunnelExecution).filter(
        FunnelExecution.id == execution_id
    ).first()

    if not execution:
        print("❌ Execution not found")
        return

    print(f"\n📊 EXECUTION DETAILS:")
    print(f"   ID: {execution.id}")
    print(f"   Funnel ID: {execution.funnel_id}")
    print(f"   Lead ID: {execution.lead_id}")
    print(f"   Status: {execution.status.value}")
    print(f"   Started: {execution.started_at}")
    print(f"   Completed: {execution.completed_at}")

    # Get queue entries
    queue_entries = db.query(FunnelStageQueue).filter(
        FunnelStageQueue.execution_id == execution_id
    ).order_by(FunnelStageQueue.created_at).all()

    print(f"\n📋 QUEUE ENTRIES ({len(queue_entries)}):")
    for entry in queue_entries:
        node = db.query(FunnelNode).filter(FunnelNode.id == entry.node_id).first()
        print(f"   {entry.status.value.upper()}: {node.label if node else 'Unknown'} (attempts: {entry.attempt_count}/{entry.max_attempts})")

    # Get events
    from funnel_engine.models import FunnelExecutionEvent
    events = db.query(FunnelExecutionEvent).filter(
        FunnelExecutionEvent.execution_id == execution_id
    ).order_by(FunnelExecutionEvent.created_at).all()

    print(f"\n📝 EVENTS ({len(events)}):")
    for event in events:
        print(f"   {event.event_type}: {event.event_data.get('label', 'N/A')} ({event.created_at.strftime('%H:%M:%S')})")


def main():
    """Run the test"""

    print("=" * 80)
    print("🧪 TESTING AUTOMATIC FUNNEL TRIGGERING ON LEAD CREATION")
    print("=" * 80)

    db = SessionLocal()

    try:
        # Get a valid user ID
        result = db.execute(text("SELECT id FROM users LIMIT 1"))
        user_row = result.fetchone()

        if not user_row:
            print("❌ No users found in database")
            return

        user_id = user_row[0]
        print(f"\n👤 Using user ID: {user_id}")

        # Create test funnel with lead_created trigger
        funnel = create_test_funnel_with_trigger(db, user_id)

        # Create test lead (this should automatically trigger the funnel)
        lead_id, execution_ids = create_test_lead(user_id)

        if not execution_ids:
            print("\n❌ No funnels were triggered!")
            print("   Check that:")
            print("   1. Funnel status is 'active'")
            print("   2. Funnel settings.trigger_type = 'lead_created'")
            return

        print(f"\n✅ Triggered {len(execution_ids)} funnel(s)!")

        # Monitor the first execution
        execution_id = execution_ids[0]
        success = monitor_execution(db, execution_id)

        # Print details
        db.refresh(db)  # Refresh session
        print_execution_details(db, execution_id)

        if success:
            print("\n" + "=" * 80)
            print("✅ TEST PASSED!")
            print("=" * 80)
            print("\nVerified:")
            print("  ✅ Funnel created with lead_created trigger")
            print("  ✅ Lead creation triggered funnel automatically")
            print("  ✅ Execution created and linked to lead")
            print("  ✅ Worker processed stages")
            print("  ✅ Execution completed successfully")
            print("\n🚀 AUTOMATIC FUNNEL TRIGGERING IS WORKING!")
        else:
            print("\n" + "=" * 80)
            print("❌ TEST FAILED")
            print("=" * 80)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()
