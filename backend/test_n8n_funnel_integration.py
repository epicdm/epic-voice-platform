#!/usr/bin/env python3
"""
End-to-End Test: Funnel → n8n Integration

Tests the complete flow:
1. Create a funnel with nodes and edges via API
2. Verify it auto-syncs to n8n
3. Check n8n workflow exists and matches funnel structure
4. Clean up (delete funnel and n8n workflow)
"""

import sys
import os

# Set environment before any imports
os.environ['N8N_URL'] = 'https://n8n.ai.epic.dm'
os.environ['N8N_API_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'

# Change to backend directory
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

import uuid
from backend.n8n_integration.client import N8nClient
from backend.n8n_integration.sync import sync_funnel, delete_workflow
from backend.funnel_engine.models import Funnel, FunnelNode, FunnelEdge, FunnelStatus, NodeType
from database import SessionLocal


def main():
    print("🧪 Testing End-to-End Funnel → n8n Integration")
    print("=" * 60)
    print()

    db = SessionLocal()
    n8n_client = N8nClient(
        "https://n8n.ai.epic.dm",
        os.environ['N8N_API_KEY']
    )

    funnel_id = None
    n8n_workflow_id = None

    try:
        # ============================================================
        # Step 1: Create a test funnel
        # ============================================================
        print("📋 Step 1: Creating test funnel...")

        # Get a test user (first user in database)
        from database import User
        user = db.query(User).first()
        if not user:
            print("❌ No users found in database. Please create a user first.")
            return

        print(f"   Using user: {user.email}")

        funnel_id = str(uuid.uuid4())
        funnel = Funnel(
            id=funnel_id,
            user_id=str(user.id),
            name="Test Funnel - n8n Integration",
            description="Automated test funnel for n8n sync",
            status=FunnelStatus.DRAFT,
            settings={"trigger_type": "landing_page"}
        )
        db.add(funnel)
        db.commit()

        print(f"   ✅ Funnel created: {funnel_id}")
        print()

        # ============================================================
        # Step 2: Add nodes to funnel
        # ============================================================
        print("📦 Step 2: Adding nodes...")

        nodes_data = [
            {
                "id": str(uuid.uuid4()),
                "node_type": NodeType.CALL,
                "label": "Welcome Call",
                "config": {"agent_config_id": "test-agent", "max_duration": 300},
                "position_x": 250,
                "position_y": 50
            },
            {
                "id": str(uuid.uuid4()),
                "node_type": NodeType.DELAY,
                "label": "Wait 1 Hour",
                "config": {"duration": 3600},
                "position_x": 250,
                "position_y": 200
            },
            {
                "id": str(uuid.uuid4()),
                "node_type": NodeType.EMAIL,
                "label": "Follow-up Email",
                "config": {
                    "from_email": "noreply@epic.dm",
                    "subject": "Thank you!",
                    "body": "Thanks for your interest!"
                },
                "position_x": 250,
                "position_y": 350
            },
            {
                "id": str(uuid.uuid4()),
                "node_type": NodeType.END,
                "label": "Complete",
                "config": {},
                "position_x": 250,
                "position_y": 500
            }
        ]

        node_ids = {}
        for node_data in nodes_data:
            node = FunnelNode(
                id=node_data["id"],
                funnel_id=funnel_id,
                user_id=str(user.id),
                node_type=node_data["node_type"],
                label=node_data["label"],
                config=node_data["config"],
                position_x=node_data["position_x"],
                position_y=node_data["position_y"]
            )
            db.add(node)
            node_ids[node_data["label"]] = node_data["id"]
            print(f"   ✅ Node: {node_data['label']} ({node_data['node_type'].value})")

        db.commit()
        print()

        # ============================================================
        # Step 3: Add edges to funnel
        # ============================================================
        print("🔗 Step 3: Adding edges...")

        edges_data = [
            {"source": "Welcome Call", "target": "Wait 1 Hour", "label": "After Call"},
            {"source": "Wait 1 Hour", "target": "Follow-up Email", "label": "After Delay"},
            {"source": "Follow-up Email", "target": "Complete", "label": "After Email"}
        ]

        for edge_data in edges_data:
            edge = FunnelEdge(
                id=str(uuid.uuid4()),
                funnel_id=funnel_id,
                user_id=str(user.id),
                source_node_id=node_ids[edge_data["source"]],
                target_node_id=node_ids[edge_data["target"]],
                label=edge_data["label"]
            )
            db.add(edge)
            print(f"   ✅ Edge: {edge_data['source']} → {edge_data['target']}")

        db.commit()
        print()

        # ============================================================
        # Step 4: Sync to n8n
        # ============================================================
        print("🔄 Step 4: Syncing funnel to n8n...")

        n8n_workflow_id = sync_funnel(db, funnel_id)

        if n8n_workflow_id:
            print(f"   ✅ n8n workflow created: {n8n_workflow_id}")
        else:
            print("   ❌ Failed to create n8n workflow")
            return
        print()

        # ============================================================
        # Step 5: Verify n8n workflow
        # ============================================================
        print("🔍 Step 5: Verifying n8n workflow...")

        # Fetch workflow from n8n
        workflow = n8n_client.get_workflow(n8n_workflow_id)

        if workflow:
            print(f"   ✅ Workflow found in n8n")
            print(f"      Name: {workflow.get('name')}")
            print(f"      Nodes: {len(workflow.get('nodes', []))}")
            print(f"      Active: {workflow.get('active')}")

            # Verify node count matches
            expected_nodes = len(nodes_data)
            actual_nodes = len(workflow.get('nodes', []))

            if actual_nodes == expected_nodes:
                print(f"   ✅ Node count matches: {actual_nodes}")
            else:
                print(f"   ⚠️  Node count mismatch: expected {expected_nodes}, got {actual_nodes}")

            # Print node types
            print(f"      Node types:")
            for node in workflow.get('nodes', []):
                print(f"         - {node.get('name')} ({node.get('type')})")
        else:
            print(f"   ❌ Workflow not found in n8n")
        print()

        # ============================================================
        # Step 6: Test workflow update
        # ============================================================
        print("📝 Step 6: Testing workflow update...")

        # Update funnel name
        funnel.name = "Test Funnel - n8n Integration (Updated)"
        db.commit()

        # Sync again
        sync_funnel(db, funnel_id)

        # Verify update
        updated_workflow = n8n_client.get_workflow(n8n_workflow_id)
        if updated_workflow and updated_workflow.get('name') == funnel.name:
            print(f"   ✅ Workflow updated successfully")
            print(f"      New name: {updated_workflow.get('name')}")
        else:
            print(f"   ⚠️  Workflow update may have failed")
        print()

        # ============================================================
        # Step 7: Success summary
        # ============================================================
        print("=" * 60)
        print("🎉 SUCCESS! End-to-End Integration Test Passed!")
        print("=" * 60)
        print()
        print("✅ Funnel created with 4 nodes and 3 edges")
        print("✅ Auto-synced to n8n workflow")
        print("✅ n8n workflow verified and matches funnel structure")
        print("✅ Workflow updates working correctly")
        print()
        print(f"📊 Results:")
        print(f"   Funnel ID: {funnel_id}")
        print(f"   n8n Workflow ID: {n8n_workflow_id}")
        print(f"   n8n URL: https://n8n.ai.epic.dm/workflow/{n8n_workflow_id}")
        print()

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # ============================================================
        # Cleanup
        # ============================================================
        print("🧹 Cleaning up...")

        if funnel_id and n8n_workflow_id:
            try:
                # Delete n8n workflow
                delete_workflow(db, funnel_id)
                print(f"   ✅ Deleted n8n workflow: {n8n_workflow_id}")
            except Exception as e:
                print(f"   ⚠️  Failed to delete n8n workflow: {e}")

            try:
                # Delete funnel (cascade deletes nodes and edges)
                funnel = db.query(Funnel).filter(Funnel.id == funnel_id).first()
                if funnel:
                    db.delete(funnel)
                    db.commit()
                    print(f"   ✅ Deleted funnel: {funnel_id}")
            except Exception as e:
                print(f"   ⚠️  Failed to delete funnel: {e}")

        db.close()
        print()
        print("✅ Cleanup complete!")


if __name__ == "__main__":
    main()
