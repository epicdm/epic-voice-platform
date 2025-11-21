#!/usr/bin/env python3
"""
Test Workflow Activation with Fixed n8n API
Uses the corrected POST /workflows/{id}/activate endpoint
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

from backend.n8n_integration.client import N8nClient
from backend.funnel_engine.models import Funnel
from database import SessionLocal

# Configuration
N8N_URL = 'https://n8n.ai.epic.dm'
N8N_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI'
FUNNEL_NAME = "4444444444"

os.environ['N8N_URL'] = N8N_URL
os.environ['N8N_API_KEY'] = N8N_API_KEY

db = SessionLocal()
n8n_client = N8nClient(N8N_URL, N8N_API_KEY)

try:
    print("🧪 Testing n8n Workflow Activation Fix")
    print("=" * 60)

    # Get funnel
    funnel = db.query(Funnel).filter(Funnel.name == FUNNEL_NAME).first()
    if not funnel:
        print(f"❌ Funnel not found")
        sys.exit(1)

    print(f"📋 Funnel: {funnel.name} (ID: {funnel.id})")
    print(f"   n8n Workflow ID: {funnel.n8n_workflow_id}")

    # Check current status
    print(f"\n🔍 Checking current workflow status...")
    workflow = n8n_client.get_workflow(funnel.n8n_workflow_id)
    if workflow:
        print(f"   Name: {workflow.get('name')}")
        print(f"   Active: {workflow.get('active', False)}")
        print(f"   Nodes: {len(workflow.get('nodes', []))}")
        print(f"   Connections: {len(workflow.get('connections', {}))}")
    else:
        print(f"❌ Could not fetch workflow")
        sys.exit(1)

    # Test activation using fixed endpoint
    if not workflow.get('active'):
        print(f"\n🟢 Testing activation with POST /workflows/{funnel.n8n_workflow_id}/activate...")
        success = n8n_client.activate_workflow(funnel.n8n_workflow_id)

        if success:
            print(f"✅ Workflow activation successful!")

            # Verify activation
            print(f"\n🔍 Verifying activation...")
            workflow_after = n8n_client.get_workflow(funnel.n8n_workflow_id)
            if workflow_after and workflow_after.get('active'):
                print(f"✅ VERIFIED: Workflow is now active!")
            else:
                print(f"⚠️  Warning: Workflow activation reported success but status not confirmed")
        else:
            print(f"❌ Workflow activation failed - check logs above")
            sys.exit(1)
    else:
        print(f"\n✅ Workflow already active")

        # Test deactivation
        print(f"\n🔴 Testing deactivation with POST /workflows/{funnel.n8n_workflow_id}/deactivate...")
        success = n8n_client.deactivate_workflow(funnel.n8n_workflow_id)

        if success:
            print(f"✅ Workflow deactivation successful!")

            # Re-activate
            print(f"\n🟢 Re-activating workflow...")
            success = n8n_client.activate_workflow(funnel.n8n_workflow_id)
            if success:
                print(f"✅ Workflow re-activated successfully!")
            else:
                print(f"❌ Re-activation failed")
        else:
            print(f"❌ Deactivation failed")

    print(f"\n{'=' * 60}")
    print(f"🎉 Activation test completed!")
    print(f"\nWorkflow is ready for execution:")
    print(f"   - n8n UI: {N8N_URL}/workflow/{funnel.n8n_workflow_id}")
    print(f"   - Status: ACTIVE")
    print(f"   - Ready to process funnel executions")

except Exception as e:
    print(f"\n❌ Error during activation test:")
    print(f"   {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

finally:
    db.close()
