#!/usr/bin/env python3
"""
Test Funnel Live Run
Activates funnel and triggers a live test execution
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import uuid
import requests
from backend.n8n_integration.client import N8nClient
from backend.n8n_integration.sync import activate_workflow
from backend.funnel_engine.models import Funnel, FunnelStatus
from database import SessionLocal, User

# Configuration
N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'
FUNNEL_NAME = "4444444444"  # Your test funnel

os.environ['N8N_URL'] = N8N_URL
os.environ['N8N_API_KEY'] = N8N_API_KEY

db = SessionLocal()
n8n_client = N8nClient(N8N_URL, N8N_API_KEY)

try:
    print("🧪 Funnel Live Run Test")
    print("=" * 60)

    # 1. Get the funnel
    funnel = db.query(Funnel).filter(Funnel.name == FUNNEL_NAME).first()
    if not funnel:
        print(f"❌ Funnel '{FUNNEL_NAME}' not found")
        sys.exit(1)

    print(f"📋 Funnel: {funnel.name}")
    print(f"   ID: {funnel.id}")
    print(f"   Current Status: {funnel.status.value}")
    print(f"   n8n Workflow ID: {funnel.n8n_workflow_id}")

    # 2. Activate the funnel if not active
    if funnel.status != FunnelStatus.ACTIVE:
        print(f"\n🟢 Activating funnel...")
        funnel.status = FunnelStatus.ACTIVE
        db.commit()
        print(f"✅ Funnel activated")
    else:
        print(f"\n✅ Funnel already active")

    # 3. Activate the n8n workflow
    if funnel.n8n_workflow_id:
        print(f"\n🟢 Activating n8n workflow...")
        success = activate_workflow(db, funnel.id)
        if success:
            print(f"✅ n8n workflow activated")
        else:
            print(f"⚠️  Failed to activate n8n workflow (might already be active)")
    else:
        print(f"\n❌ No n8n workflow ID found - funnel not synced to n8n")
        sys.exit(1)

    # 4. Get workflow details to verify activation
    workflow = n8n_client.get_workflow(funnel.n8n_workflow_id)
    if workflow:
        print(f"\n📊 n8n Workflow Status:")
        print(f"   Name: {workflow.get('name')}")
        print(f"   Active: {workflow.get('active', False)}")
        print(f"   Nodes: {len(workflow.get('nodes', []))}")
        print(f"   Connections: {len(workflow.get('connections', {}))}")

    # 5. Prepare test contact data
    test_contact = {
        "phone_number": "+15555551234",  # Test phone number
        "email": "test@example.com",
        "name": "Test User",
        "source": "live_test"
    }

    print(f"\n📞 Test Contact Data:")
    print(f"   Phone: {test_contact['phone_number']}")
    print(f"   Email: {test_contact['email']}")
    print(f"   Name: {test_contact['name']}")

    # 6. Ask user for confirmation
    print(f"\n⚠️  This will trigger a LIVE funnel execution!")
    print(f"   The funnel will execute in n8n and may:")
    print(f"   - Make actual phone calls")
    print(f"   - Send emails/SMS")
    print(f"   - Trigger webhooks")
    print(f"   - Incur costs")

    response = input(f"\nDo you want to proceed? (yes/no): ")
    if response.lower() not in ['yes', 'y']:
        print(f"\n❌ Test cancelled by user")
        sys.exit(0)

    # 7. Trigger funnel execution
    print(f"\n🚀 Starting funnel execution...")

    # Get user for authentication
    user = db.query(User).first()

    # Make request to Flask backend
    api_response = requests.post(
        f"http://localhost:5001/api/funnels/{funnel.id}/start",
        json={
            "contact_data": test_contact,
            "context": {
                "test_run": True,
                "triggered_by": "live_test_script"
            }
        },
        headers={
            "Content-Type": "application/json",
            "X-User-Email": user.email
        },
        timeout=10
    )

    if api_response.status_code == 201:
        result = api_response.json()
        print(f"\n✅ Funnel execution started!")
        print(f"   Execution ID: {result['execution_id']}")
        print(f"   Status: {result['status']}")
        print(f"   Started At: {result['started_at']}")
        print(f"   Queued: {result['queued']}")

        print(f"\n📊 Monitor the execution:")
        print(f"   - n8n UI: {N8N_URL}/workflow/{funnel.n8n_workflow_id}")
        print(f"   - Execution ID: {result['execution_id']}")

    else:
        print(f"\n❌ Failed to start execution!")
        print(f"   Status Code: {api_response.status_code}")
        print(f"   Response: {api_response.text}")
        sys.exit(1)

    print(f"\n{'=' * 60}")
    print(f"🎉 Live run test completed successfully!")
    print(f"\nNext steps:")
    print(f"1. Check n8n UI: {N8N_URL}")
    print(f"2. Monitor execution progress")
    print(f"3. Verify each node executes correctly")
    print(f"4. Check for any errors in n8n logs")

except Exception as e:
    print(f"\n❌ Error during live run test:")
    print(f"   {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    db.close()
