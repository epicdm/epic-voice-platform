#!/usr/bin/env python3
"""
Test Funnel Live Run (Auto - No Prompts)
Activates funnel and triggers a live test execution automatically
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import uuid
import requests
import json
from backend.n8n_integration.client import N8nClient
from backend.n8n_integration.sync import activate_workflow
from backend.funnel_engine.models import Funnel, FunnelStatus
from database import SessionLocal, User

# Configuration
N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'
FUNNEL_NAME = "4444444444"  # Your test funnel
DRY_RUN = True  # Set to False to actually trigger execution

os.environ['N8N_URL'] = N8N_URL
os.environ['N8N_API_KEY'] = N8N_API_KEY

db = SessionLocal()
n8n_client = N8nClient(N8N_URL, N8N_API_KEY)

try:
    print("🧪 Funnel Live Run Test (Automatic)")
    print("=" * 60)
    print(f"⚙️  DRY RUN MODE: {DRY_RUN}")
    print("=" * 60)

    # 1. Get the funnel
    funnel = db.query(Funnel).filter(Funnel.name == FUNNEL_NAME).first()
    if not funnel:
        print(f"❌ Funnel '{FUNNEL_NAME}' not found")
        sys.exit(1)

    print(f"\n📋 Funnel: {funnel.name}")
    print(f"   ID: {funnel.id}")
    print(f"   Current Status: {funnel.status.value}")
    print(f"   n8n Workflow ID: {funnel.n8n_workflow_id}")

    # 2. Get current workflow state from n8n
    if funnel.n8n_workflow_id:
        print(f"\n🔍 Checking n8n workflow...")
        workflow = n8n_client.get_workflow(funnel.n8n_workflow_id)
        if workflow:
            print(f"   Name: {workflow.get('name')}")
            print(f"   Active: {workflow.get('active', False)}")
            print(f"   Nodes: {len(workflow.get('nodes', []))}")
            print(f"   Connections: {len(workflow.get('connections', {}))}")

            # Try to activate workflow directly via n8n API
            if not workflow.get('active'):
                print(f"\n🟢 Manually activating workflow in n8n...")
                try:
                    # Update workflow with active=True
                    activate_response = requests.patch(
                        f"{N8N_URL}/api/v1/workflows/{funnel.n8n_workflow_id}",
                        headers={
                            "X-N8N-API-KEY": N8N_API_KEY,
                            "Content-Type": "application/json"
                        },
                        json={"active": True},
                        timeout=10
                    )

                    if activate_response.status_code == 200:
                        print(f"✅ Workflow activated successfully")
                    else:
                        print(f"⚠️  Activation response: {activate_response.status_code}")
                        print(f"   {activate_response.text}")
                except Exception as e:
                    print(f"⚠️  Error activating workflow: {e}")
            else:
                print(f"✅ Workflow already active")
        else:
            print(f"❌ Could not fetch workflow from n8n")
            sys.exit(1)
    else:
        print(f"\n❌ No n8n workflow ID found")
        sys.exit(1)

    # 3. Activate the funnel in our database if not active
    if funnel.status != FunnelStatus.ACTIVE:
        print(f"\n🟢 Activating funnel in database...")
        funnel.status = FunnelStatus.ACTIVE
        db.commit()
        print(f"✅ Funnel activated")
    else:
        print(f"\n✅ Funnel already active in database")

    # 4. Prepare test contact data
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

    if DRY_RUN:
        print(f"\n🔒 DRY RUN - Skipping actual execution")
        print(f"\n✅ Funnel is ready for live execution!")
        print(f"\nTo trigger a real execution:")
        print(f"1. Set DRY_RUN = False in this script")
        print(f"2. Update test_contact with real contact data")
        print(f"3. Run the script again")
        print(f"\nOr use the API directly:")
        print(f"POST http://localhost:5001/api/funnels/{funnel.id}/start")
        print(f"Body: {json.dumps({'contact_data': test_contact}, indent=2)}")
    else:
        # 5. Trigger funnel execution
        print(f"\n🚀 Starting LIVE funnel execution...")
        print(f"   ⚠️  This will make actual API calls!")

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
    print(f"🎉 Test completed!")
    print(f"\nNext steps:")
    print(f"1. Check n8n UI: {N8N_URL}")
    print(f"2. Verify workflow is active")
    print(f"3. Test execution manually if needed")

except Exception as e:
    print(f"\n❌ Error during live run test:")
    print(f"   {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    db.close()
