#!/usr/bin/env python3
"""
Quick test: Verify n8n connections are working
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import uuid
from backend.n8n_integration.client import N8nClient
from backend.n8n_integration.sync import sync_funnel
from backend.funnel_engine.models import Funnel, FunnelNode, FunnelEdge, FunnelStatus, NodeType
from database import SessionLocal, User

N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'

os.environ['N8N_URL'] = N8N_URL
os.environ['N8N_API_KEY'] = N8N_API_KEY

db = SessionLocal()
n8n_client = N8nClient(N8N_URL, N8N_API_KEY)

try:
    print("🧪 Testing n8n Connection Fix")
    print("=" * 50)

    # Get user
    user = db.query(User).first()

    # Create simple 3-node funnel
    funnel_id = str(uuid.uuid4())
    funnel = Funnel(
        id=funnel_id,
        user_id=str(user.id),
        name="Connection Test Funnel",
        description="Testing node connections",
        status=FunnelStatus.DRAFT,
        settings={}
    )
    db.add(funnel)
    db.commit()

    # Create 3 nodes
    node1_id = str(uuid.uuid4())
    node1 = FunnelNode(
        id=node1_id,
        funnel_id=funnel_id,
        user_id=str(user.id),
        node_type=NodeType.CALL,
        label="Call Node",
        config={"agent_config_id": "test"},
        position_x=100,
        position_y=100
    )

    node2_id = str(uuid.uuid4())
    node2 = FunnelNode(
        id=node2_id,
        funnel_id=funnel_id,
        user_id=str(user.id),
        node_type=NodeType.DELAY,
        label="Wait Node",
        config={"duration": 60},
        position_x=100,
        position_y=250
    )

    node3_id = str(uuid.uuid4())
    node3 = FunnelNode(
        id=node3_id,
        funnel_id=funnel_id,
        user_id=str(user.id),
        node_type=NodeType.END,
        label="End Node",
        config={},
        position_x=100,
        position_y=400
    )

    db.add_all([node1, node2, node3])
    db.commit()

    # Create 2 edges
    edge1 = FunnelEdge(
        id=str(uuid.uuid4()),
        funnel_id=funnel_id,
        user_id=str(user.id),
        source_node_id=node1_id,
        target_node_id=node2_id,
        label="Edge 1"
    )

    edge2 = FunnelEdge(
        id=str(uuid.uuid4()),
        funnel_id=funnel_id,
        user_id=str(user.id),
        source_node_id=node2_id,
        target_node_id=node3_id,
        label="Edge 2"
    )

    db.add_all([edge1, edge2])
    db.commit()

    print(f"✅ Created funnel with 3 nodes and 2 edges")

    # Sync to n8n
    print(f"🔄 Syncing to n8n...")
    n8n_workflow_id = sync_funnel(db, funnel_id)

    if not n8n_workflow_id:
        print("❌ Sync failed!")
        sys.exit(1)

    print(f"✅ Synced to n8n: {n8n_workflow_id}")

    # Fetch and check connections
    import json
    workflow = n8n_client.get_workflow(n8n_workflow_id)

    print(f"\n📊 Workflow Details:")
    print(f"   Name: {workflow['name']}")
    print(f"   Nodes: {len(workflow['nodes'])}")
    print(f"   Connections: {json.dumps(workflow.get('connections', {}), indent=4)}")

    if workflow.get('connections'):
        print(f"\n✅ SUCCESS! Connections are present!")
        print(f"   Number of source nodes with connections: {len(workflow['connections'])}")
    else:
        print(f"\n❌ FAILED! No connections found!")

    # Cleanup
    print(f"\n🧹 Cleaning up...")
    n8n_client.delete_workflow(n8n_workflow_id)
    db.delete(funnel)
    db.commit()
    print(f"✅ Cleanup complete")

finally:
    db.close()
