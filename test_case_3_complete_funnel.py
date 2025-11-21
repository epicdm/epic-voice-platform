#!/usr/bin/env python3
"""
Test Case 3: Complete Funnel with CALL → DELAY → EMAIL

Tests full funnel integration:
- AI voice call initiation
- Conditional flow based on call outcome
- Delay between stages
- Follow-up email
"""

import requests
import time
import sys
import json
from datetime import datetime

# API Configuration
API_BASE = "http://localhost:5001"  # Use local backend directly
AUTH_EMAIL = "admin@epic.dm"

# Test Configuration
# Get test phone number from command line or prompt
if len(sys.argv) > 1:
    TEST_PHONE = sys.argv[1]
else:
    print("\nℹ️  No phone number provided. Usage: python3 test_case_3_complete_funnel.py +1234567890")
    TEST_PHONE = input("📞 Enter phone number to call (with country code, e.g., +17678189426): ").strip()

if len(sys.argv) > 2:
    TEST_EMAIL = sys.argv[2]
else:
    TEST_EMAIL = input("📧 Enter email address for follow-up: ").strip() or "test@example.com"

AGENT_CONFIG_ID = "7b885e98-8cfe-4d8a-947c-9eb24ad678e0"  # tst0002 agent

headers = {
    "Content-Type": "application/json",
    "X-User-Email": AUTH_EMAIL
}

def create_funnel():
    """Create funnel"""
    print("\n" + "=" * 60)
    print("  Step 1: Create Funnel")
    print("=" * 60)

    funnel_data = {
        "name": f"Complete Funnel Test {int(time.time())}",
        "description": "Test Case 3: CALL → DELAY → EMAIL complete flow",
        "status": "draft"
    }

    response = requests.post(
        f"{API_BASE}/api/funnels",
        json=funnel_data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create funnel: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)

    funnel = response.json()
    funnel_id = funnel['id']

    print(f"✅ Funnel created: {funnel_data['name']}")
    print(f"   ID: {funnel_id}")

    return funnel_id

def add_call_node(funnel_id):
    """Add CALL node to funnel"""
    print("\n" + "=" * 60)
    print("  Step 2: Add CALL Node")
    print("=" * 60)

    node_data = {
        "label": "AI Sales Call",
        "node_type": "call",
        "config": {
            "agent_id": AGENT_CONFIG_ID,  # Changed from agent_config_id to agent_id
            "max_duration": 300,
            "record": True
        },
        "position": {"x": 100, "y": 100}
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/nodes",
        json=node_data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to add CALL node: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)

    node = response.json()

    print(f"✅ CALL node added: {node_data['label']}")
    print(f"   Agent: {AGENT_CONFIG_ID}")
    print(f"   Max Duration: 300s")

    return node['node_id']

def add_delay_node(funnel_id):
    """Add DELAY node"""
    print("\n" + "=" * 60)
    print("  Step 3: Add DELAY Node")
    print("=" * 60)

    node_data = {
        "label": "Wait 30 seconds",
        "node_type": "delay",
        "config": {
            "duration": 30
        },
        "position": {"x": 300, "y": 100}
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/nodes",
        json=node_data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to add DELAY node: {response.status_code}")
        sys.exit(1)

    node = response.json()

    print(f"✅ DELAY node added: {node_data['label']}")
    print(f"   Duration: 30 seconds")

    return node['node_id']

def add_email_node(funnel_id):
    """Add EMAIL node"""
    print("\n" + "=" * 60)
    print("  Step 4: Add EMAIL Node")
    print("=" * 60)

    node_data = {
        "label": "Follow-up Email",
        "node_type": "email",
        "config": {
            "from_email": "noreply@epic.dm",
            "subject": "Thanks for the call!",
            "body": "Hi,\n\nThanks for speaking with us on the phone.\n\nWe'll follow up shortly.\n\nBest,\nEpic Voice Team",
            "html_body": """
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2>Thanks for the call! 📞</h2>

    <p>Hi there,</p>

    <p>Thanks for speaking with us on the phone.</p>

    <p>We'll follow up shortly with next steps.</p>

    <p style="color: #666; font-size: 12px; margin-top: 30px;">
        This email was sent automatically by your funnel automation system.
    </p>
</body>
</html>
"""
        },
        "position": {"x": 500, "y": 100}
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/nodes",
        json=node_data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to add EMAIL node: {response.status_code}")
        sys.exit(1)

    node = response.json()

    print(f"✅ EMAIL node added: {node_data['label']}")
    print(f"   Subject: {node_data['config']['subject']}")

    return node['node_id']

def add_edges(funnel_id, call_node_id, delay_node_id, email_node_id):
    """Add edges to connect nodes"""
    print("\n" + "=" * 60)
    print("  Step 5: Connect Nodes with Edges")
    print("=" * 60)

    # Edge 1: CALL (answered) → DELAY
    edge_data_1 = {
        "source_node_id": call_node_id,
        "target_node_id": delay_node_id,
        "condition": "answered"
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/edges",
        json=edge_data_1,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to add edge (CALL → DELAY): {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)

    print(f"✅ Edge added: CALL (answered) → DELAY")

    # Edge 2: DELAY → EMAIL
    edge_data_2 = {
        "source_node_id": delay_node_id,
        "target_node_id": email_node_id,
        "condition": "completed"
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/edges",
        json=edge_data_2,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to add edge (DELAY → EMAIL): {response.status_code}")
        sys.exit(1)

    print(f"✅ Edge added: DELAY → EMAIL")

    # Edge 3: CALL (no_answer) → EMAIL (skip delay)
    edge_data_3 = {
        "source_node_id": call_node_id,
        "target_node_id": email_node_id,
        "condition": "no_answer"
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/edges",
        json=edge_data_3,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"⚠️  Failed to add edge (CALL → EMAIL): {response.status_code}")
    else:
        print(f"✅ Edge added: CALL (no_answer) → EMAIL")

def activate_funnel(funnel_id):
    """Activate funnel"""
    print("\n" + "=" * 60)
    print("  Step 6: Activate Funnel")
    print("=" * 60)
    print("⏳ Activating funnel (this will sync to n8n)...")

    response = requests.put(
        f"{API_BASE}/api/funnels/{funnel_id}",
        json={"status": "active"},
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to activate funnel: {response.status_code}")
        sys.exit(1)

    funnel = response.json()

    print(f"✅ Funnel activated!")
    print(f"   n8n Workflow ID: {funnel.get('n8n_workflow_id', 'N/A')}")
    print(f"   n8n Webhook URL: {funnel.get('n8n_webhook_url', 'N/A')}")

    # Wait for n8n sync
    print("\n⏳ Waiting 3 seconds for n8n sync...")
    time.sleep(3)

def execute_funnel(funnel_id):
    """Execute funnel with test contact"""
    print("\n" + "=" * 60)
    print("  Step 7: Execute Funnel")
    print("=" * 60)
    print(f"📞 Calling: {TEST_PHONE}")
    print(f"📧 Email: {TEST_EMAIL}")

    execution_data = {
        "contact_data": {
            "phone": TEST_PHONE,
            "email": TEST_EMAIL,
            "name": "Test User"
        }
    }

    response = requests.post(
        f"{API_BASE}/api/funnels/{funnel_id}/start",
        json=execution_data,
        headers=headers
    )

    if response.status_code not in [200, 201]:
        print(f"❌ Failed to start execution: {response.status_code}")
        print(f"   Response: {response.text}")
        sys.exit(1)

    execution = response.json()
    execution_id = execution['execution_id']

    print(f"✅ Funnel execution started!")
    print(f"   Execution ID: {execution_id}")
    print(f"   Status: {execution.get('status')}")

    return execution_id

def monitor_execution(funnel_id, execution_id):
    """Monitor execution progress"""
    print("\n" + "=" * 60)
    print("  Step 8: Monitor Execution")
    print("=" * 60)
    print("⏳ Monitoring execution progress...")
    print("   (Will check for 60 seconds)\n")

    for i in range(12):  # Check for 60 seconds (12 x 5s)
        time.sleep(5)

        response = requests.get(
            f"{API_BASE}/api/funnels/{funnel_id}/executions/{execution_id}",
            headers=headers
        )

        if response.status_code == 200:
            execution = response.json()
            status = execution.get('status')
            current_node = execution.get('current_node_id', 'N/A')
            last_outcome = execution.get('last_outcome', 'N/A')

            print(f"[{i*5}s] Status: {status} | Node: {current_node[:8]}... | Outcome: {last_outcome}")

            if status == 'completed':
                print("\n✅ Execution completed!")
                print(f"   Started: {execution.get('started_at')}")
                print(f"   Completed: {execution.get('completed_at')}")
                print(f"   Final Outcome: {last_outcome}")
                return
        else:
            print(f"⚠️  Failed to fetch execution: {response.status_code}")

    print("\n⏰ Still running after 60 seconds...")
    print("   Check dashboard for full execution details")

def main():
    print("=" * 60)
    print("  🧪 TEST CASE 3: COMPLETE FUNNEL")
    print("=" * 60)

    # Show agent info
    print(f"\n🤖 Using AI Agent: tst0002")
    print(f"   ID: {AGENT_CONFIG_ID}")

    # Query agent's phone number
    try:
        import psycopg2
        conn = psycopg2.connect("postgresql://postgres:nXrRje4emjejjeKI009p@localhost:5432/epic_voice_db")
        cur = conn.cursor()
        cur.execute("""
            SELECT "phoneNumber" FROM phone_mappings
            WHERE "agentConfigId" = %s AND "isActive" = true
        """, (AGENT_CONFIG_ID,))
        result = cur.fetchone()
        agent_phone = result[0] if result else "No number assigned"
        cur.close()
        conn.close()
        print(f"   📞 Agent's Number: {agent_phone}")
        print(f"      (This is what caller ID will show)")
    except:
        print(f"   📞 Agent's Number: (lookup failed)")

    print(f"\n📞 Calling TO: {TEST_PHONE}")
    print(f"📧 Email: {TEST_EMAIL}")
    print(f"✅ Authenticated as: {AUTH_EMAIL}")

    # Create funnel
    funnel_id = create_funnel()

    # Add nodes
    call_node_id = add_call_node(funnel_id)
    delay_node_id = add_delay_node(funnel_id)
    email_node_id = add_email_node(funnel_id)

    # Connect nodes
    add_edges(funnel_id, call_node_id, delay_node_id, email_node_id)

    # Activate
    activate_funnel(funnel_id)

    # Execute
    execution_id = execute_funnel(funnel_id)

    # Monitor
    monitor_execution(funnel_id, execution_id)

    print("\n" + "=" * 60)
    print("  ✅ TEST COMPLETE!")
    print("=" * 60)
    print(f"\n📋 Funnel ID: {funnel_id}")
    print(f"📋 Execution ID: {execution_id}")
    print(f"\n🔍 Expected Flow:")
    print(f"   1. AI calls {TEST_PHONE}")
    print(f"   2. If answered → Wait 30s → Send email")
    print(f"   3. If no answer → Send email immediately")
    print(f"\n📧 Check {TEST_EMAIL} for follow-up email")
    print(f"📞 Check your phone for incoming call from AI agent")

    print(f"\n🌐 View in dashboard:")
    print(f"   https://ai.epic.dm/dashboard/funnels")
    print(f"   https://n8n.ai.epic.dm/executions")

if __name__ == "__main__":
    main()
