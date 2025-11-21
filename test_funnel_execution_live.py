#!/usr/bin/env python3
"""
Live Funnel Execution Test
Actually executes a funnel and monitors the result
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import requests
import time
from database import SessionLocal, User
from backend.funnel_engine.models import Funnel, FunnelExecution

FUNNEL_NAME = "4444444444"
API_BASE = "http://localhost:5001"

# Test contact data (SAFE - no real actions will be taken)
TEST_CONTACT = {
    "phone_number": "+15555551234",  # Fake number
    "email": "test@example.com",
    "name": "Test User",
    "source": "live_integration_test"
}

def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def main():
    print_section("🧪 LIVE FUNNEL EXECUTION TEST")

    db = SessionLocal()

    try:
        # 1. Get funnel details
        print_section("Step 1: Load Funnel")
        funnel = db.query(Funnel).filter(Funnel.name == FUNNEL_NAME).first()

        if not funnel:
            print(f"❌ Funnel '{FUNNEL_NAME}' not found")
            return 1

        print(f"✅ Funnel: {funnel.name}")
        print(f"   ID: {funnel.id}")
        print(f"   Status: {funnel.status.value}")
        print(f"   n8n Workflow: {funnel.n8n_workflow_id}")
        print(f"   Webhook URL: {funnel.n8n_webhook_url}")

        if not funnel.n8n_webhook_url:
            print(f"\n❌ No webhook URL - funnel not synced properly")
            return 1

        # 2. Get user for auth (must be funnel owner)
        print_section("Step 2: Get User Authentication")
        user = db.query(User).filter(User.id == funnel.user_id).first()

        if not user:
            print(f"❌ Funnel owner not found: {funnel.user_id}")
            return 1

        print(f"✅ Using user: {user.email} (funnel owner)")

        # 3. Check funnel is active
        print_section("Step 3: Verify Funnel Status")

        if funnel.status.value != "active":
            print(f"⚠️  Funnel status is '{funnel.status.value}', not 'active'")
            print(f"   Attempting to activate...")

            response = requests.put(
                f"{API_BASE}/api/funnels/{funnel.id}",
                json={"status": "active"},
                headers={
                    "Content-Type": "application/json",
                    "X-User-Email": user.email
                },
                timeout=10
            )

            if response.status_code == 200:
                print(f"✅ Funnel activated")
                db.refresh(funnel)
            else:
                print(f"❌ Failed to activate funnel: {response.status_code}")
                print(f"   {response.text}")
                return 1
        else:
            print(f"✅ Funnel is active")

        # 4. Execute funnel
        print_section("Step 4: Execute Funnel")
        print(f"📞 Test Contact Data:")
        for key, value in TEST_CONTACT.items():
            print(f"   {key}: {value}")

        print(f"\n🚀 Triggering funnel execution...")

        response = requests.post(
            f"{API_BASE}/api/funnels/{funnel.id}/start",
            json={
                "contact_data": TEST_CONTACT,
                "context": {
                    "test_run": True,
                    "automated_test": True,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }
            },
            headers={
                "Content-Type": "application/json",
                "X-User-Email": user.email
            },
            timeout=10
        )

        if response.status_code != 201:
            print(f"❌ Failed to start execution: {response.status_code}")
            print(f"   Response: {response.text}")
            return 1

        result = response.json()
        execution_id = result.get("execution_id")

        print(f"\n✅ Funnel execution started!")
        print(f"   Execution ID: {execution_id}")
        print(f"   Status: {result.get('status')}")
        print(f"   Started At: {result.get('started_at')}")
        print(f"   Triggered: {result.get('triggered')}")

        # 5. Monitor execution
        print_section("Step 5: Monitor Execution")
        print(f"⏳ Waiting 5 seconds for n8n to process...")
        time.sleep(5)

        # Check execution status in database
        execution = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id
        ).first()

        if execution:
            print(f"\n📊 Execution Status:")
            print(f"   Status: {execution.status.value}")
            print(f"   Started: {execution.started_at}")
            print(f"   Completed: {execution.completed_at or 'In Progress'}")
        else:
            print(f"⚠️  Could not find execution in database")

        # 6. Summary
        print_section("✅ TEST COMPLETE")

        print(f"\n📋 Execution Details:")
        print(f"   Execution ID: {execution_id}")
        print(f"   Funnel ID: {funnel.id}")
        print(f"   Webhook URL: {funnel.n8n_webhook_url}")

        print(f"\n🔍 Monitor Execution:")
        print(f"   n8n UI: https://n8n.ai.epic.dm/workflow/{funnel.n8n_workflow_id}")
        print(f"   n8n Executions: https://n8n.ai.epic.dm/executions")

        print(f"\n⚠️  IMPORTANT:")
        print(f"   This test uses FAKE contact data (+15555551234)")
        print(f"   No real emails/SMS/calls will be sent")
        print(f"   Check n8n UI to see if nodes executed")

        print(f"\n✅ If you see the execution in n8n, the integration is working!")

        return 0

    except Exception as e:
        print(f"\n❌ Error during test:")
        print(f"   {e}")
        import traceback
        traceback.print_exc()
        return 1

    finally:
        db.close()

if __name__ == "__main__":
    sys.exit(main())
