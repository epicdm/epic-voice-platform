#!/usr/bin/env python3
"""
Test Case 1: Simple Email-Only Funnel
Creates, activates, and executes a basic email funnel
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

import requests
import time
from database import SessionLocal, User

API_BASE = "http://localhost:5001"

def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def main():
    # Get user email from command line or use default
    if len(sys.argv) > 1:
        test_email = sys.argv[1]
    else:
        print("Usage: python3 test_case_1_email.py YOUR_EMAIL@example.com")
        print("\nUsing default test email: giraud.eric@gmail.com")
        test_email = "giraud.eric@gmail.com"

    print_section("🧪 TEST CASE 1: EMAIL-ONLY FUNNEL")
    print(f"\n📧 Test email: {test_email}")

    db = SessionLocal()

    try:
        # Get user for authentication
        user = db.query(User).first()
        if not user:
            print("❌ No users found")
            return 1

        print(f"✅ Authenticated as: {user.email}")

        headers = {
            "Content-Type": "application/json",
            "X-User-Email": user.email
        }

        # Step 1: Create funnel
        print_section("Step 1: Create Funnel")

        funnel_data = {
            "name": f"Email Test {int(time.time())}",
            "description": "Test Case 1: Simple email-only funnel"
        }

        response = requests.post(
            f"{API_BASE}/api/funnels",
            json=funnel_data,
            headers=headers,
            timeout=10
        )

        if response.status_code != 201:
            print(f"❌ Failed to create funnel: {response.status_code}")
            print(response.text)
            return 1

        funnel = response.json()
        funnel_id = funnel['id']
        print(f"✅ Funnel created: {funnel['name']}")
        print(f"   ID: {funnel_id}")

        # Step 2: Add EMAIL node
        print_section("Step 2: Add EMAIL Node")

        node_data = {
            "label": "Welcome Email",
            "node_type": "email",
            "config": {
                "from_email": "noreply@epic.dm",
                "subject": "🎉 Welcome to Epic Voice AI!",
                "body": f"Hi there!\n\nThis is a test email from your n8n integration.\n\nIf you received this, the EMAIL node is working perfectly!\n\n✅ Funnel: {funnel['name']}\n📧 Sent via n8n + Platform SMTP\n\nCheers,\nThe Epic Voice Team",
                "html_body": f"""
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #4CAF50;">🎉 Welcome to Epic Voice AI!</h1>

    <p>Hi there!</p>

    <p>This is a test email from your <strong>n8n integration</strong>.</p>

    <p>If you received this, the EMAIL node is working perfectly!</p>

    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>✅ Funnel:</strong> {funnel['name']}</p>
        <p style="margin: 5px 0;"><strong>📧 Sent via:</strong> n8n + Platform SMTP</p>
        <p style="margin: 5px 0;"><strong>🔧 Integration:</strong> Hybrid n8n (Native emailSend node)</p>
    </div>

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This email was sent automatically by your funnel automation system.
    </p>
</body>
</html>
"""
            },
            "position": {"x": 100, "y": 100}
        }

        response = requests.post(
            f"{API_BASE}/api/funnels/{funnel_id}/nodes",
            json=node_data,
            headers=headers,
            timeout=10
        )

        if response.status_code != 201:
            print(f"❌ Failed to add node: {response.status_code}")
            print(response.text)
            return 1

        node = response.json()
        print(f"✅ EMAIL node added: {node_data['label']}")
        print(f"   Subject: {node_data['config']['subject']}")
        print(f"   From: {node_data['config']['from_email']}")

        # Step 3: Activate funnel (triggers sync to n8n)
        print_section("Step 3: Activate Funnel")
        print("⏳ Activating funnel (this will sync to n8n)...")

        response = requests.put(
            f"{API_BASE}/api/funnels/{funnel_id}",
            json={"status": "active"},
            headers=headers,
            timeout=15
        )

        if response.status_code != 200:
            print(f"❌ Failed to activate: {response.status_code}")
            print(response.text)
            return 1

        funnel = response.json()
        print(f"✅ Funnel activated!")
        print(f"   n8n Workflow ID: {funnel.get('n8n_workflow_id', 'N/A')}")
        print(f"   n8n Webhook URL: {funnel.get('n8n_webhook_url', 'N/A')}")

        # Wait a moment for n8n sync
        print("\n⏳ Waiting 2 seconds for n8n sync...")
        time.sleep(2)

        # Step 4: Execute funnel
        print_section("Step 4: Execute Funnel")
        print(f"📧 Sending email to: {test_email}")

        execution_data = {
            "contact_data": {
                "email": test_email,
                "name": "Test User"
            },
            "context": {
                "test_case": "test_case_1_email",
                "automated": True
            }
        }

        response = requests.post(
            f"{API_BASE}/api/funnels/{funnel_id}/start",
            json=execution_data,
            headers=headers,
            timeout=10
        )

        if response.status_code != 201:
            print(f"❌ Failed to execute: {response.status_code}")
            print(response.text)
            return 1

        execution = response.json()
        execution_id = execution['execution_id']

        print(f"✅ Funnel execution started!")
        print(f"   Execution ID: {execution_id}")
        print(f"   Status: {execution['status']}")
        print(f"   Triggered: {execution.get('triggered', 'N/A')}")

        # Step 5: Monitor execution
        print_section("Step 5: Monitor Execution")
        print("⏳ Waiting 5 seconds for n8n to process email...")
        time.sleep(5)

        # Check execution status
        from backend.funnel_engine.models import FunnelExecution
        exec_record = db.query(FunnelExecution).filter(
            FunnelExecution.id == execution_id
        ).first()

        if exec_record:
            print(f"\n📊 Execution Status:")
            print(f"   Status: {exec_record.status.value}")
            print(f"   Started: {exec_record.started_at}")
            if exec_record.completed_at:
                print(f"   Completed: {exec_record.completed_at}")

        # Results
        print_section("✅ TEST COMPLETE!")

        print(f"\n📧 Check your email inbox: {test_email}")
        print(f"   Subject: 🎉 Welcome to Epic Voice AI!")
        print(f"   From: noreply@epic.dm")

        print(f"\n🔍 Monitor in n8n:")
        if funnel.get('n8n_workflow_id'):
            print(f"   Workflow: https://n8n.ai.epic.dm/workflow/{funnel['n8n_workflow_id']}")
        print(f"   Executions: https://n8n.ai.epic.dm/executions")

        print(f"\n📋 Funnel Details:")
        print(f"   Funnel ID: {funnel_id}")
        print(f"   Execution ID: {execution_id}")
        print(f"   Webhook URL: {funnel.get('n8n_webhook_url', 'N/A')}")

        print(f"\n⏰ Email should arrive within 1-2 minutes")
        print(f"   (Check spam folder if not in inbox)")

        print(f"\n✅ If you receive the email, Test Case 1 PASSED! 🎉")

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
