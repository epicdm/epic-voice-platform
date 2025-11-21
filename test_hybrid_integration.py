#!/usr/bin/env python3
"""
Test Hybrid n8n Integration
Tests the complete funnel-to-n8n workflow with:
1. Webhook trigger
2. Native email/SMS nodes with credentials
3. Backend API for calls
4. Completion webhook
5. Webhook URL extraction and storage
"""

import sys
import os
os.chdir('/opt/livekit1')
sys.path.insert(0, '/opt/livekit1')

from backend.n8n_integration.sync import get_sync_service
from backend.funnel_engine.models import Funnel
from database import SessionLocal

FUNNEL_NAME = "4444444444"

def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")

def main():
    print_section("🧪 HYBRID N8N INTEGRATION TEST")

    db = SessionLocal()
    n8n_service = get_sync_service()

    try:
        # 1. Load funnel
        print_section("Step 1: Load Funnel")
        funnel = db.query(Funnel).filter(Funnel.name == FUNNEL_NAME).first()
        if not funnel:
            print(f"❌ Funnel '{FUNNEL_NAME}' not found")
            sys.exit(1)

        print(f"✅ Funnel loaded: {funnel.name}")
        print(f"   ID: {funnel.id}")
        print(f"   Status: {funnel.status.value}")
        print(f"   Existing n8n workflow: {funnel.n8n_workflow_id}")
        print(f"   Existing webhook URL: {funnel.n8n_webhook_url}")

        # 2. Sync funnel to n8n (will update with new structure)
        print_section("Step 2: Sync Funnel to n8n")
        print("This will update the workflow with:")
        print("  ✅ Webhook trigger node (entry point)")
        print("  ✅ Native EMAIL node with SMTP credentials")
        print("  ✅ Native SMS node with Twilio credentials")
        print("  ✅ HTTP node for CALL using /api/sip/outbound-call")
        print("  ✅ Completion webhook node (exit point)")

        workflow_id = n8n_service.sync_funnel(db, funnel.id)

        if not workflow_id:
            print("❌ Failed to sync funnel")
            sys.exit(1)

        print(f"✅ Funnel synced to n8n workflow: {workflow_id}")

        # 3. Refresh funnel to get webhook URL
        print_section("Step 3: Verify Webhook URL")
        db.refresh(funnel)

        if funnel.n8n_webhook_url:
            print(f"✅ Webhook URL stored: {funnel.n8n_webhook_url}")
        else:
            print("❌ No webhook URL stored")
            sys.exit(1)

        # 4. Get workflow details from n8n
        print_section("Step 4: Verify n8n Workflow Structure")
        workflow = n8n_service.client.get_workflow(workflow_id)

        if not workflow:
            print("❌ Could not fetch workflow from n8n")
            sys.exit(1)

        nodes = workflow.get('nodes', [])
        print(f"\n📊 Workflow has {len(nodes)} nodes:")

        for node in nodes:
            node_type = node.get('type', 'unknown')
            node_name = node.get('name', 'unnamed')
            print(f"   • {node_name}: {node_type}")

            # Check for credentials
            creds = node.get('credentials', {})
            if creds:
                print(f"     Credentials: {list(creds.keys())}")

        # 5. Verify specific nodes
        print_section("Step 5: Verify Node Configuration")

        has_webhook_trigger = False
        has_email_with_creds = False
        has_sms_with_creds = False
        has_call_node = False
        has_completion_webhook = False

        for node in nodes:
            node_type = node.get('type')
            node_name = node.get('name')
            params = node.get('parameters', {})
            creds = node.get('credentials', {})

            if node_type == "n8n-nodes-base.webhook" and "Trigger" in node_name:
                has_webhook_trigger = True
                print(f"✅ Found webhook trigger")
                print(f"   Path: {params.get('path')}")

            if node_type == "n8n-nodes-base.emailSend":
                if 'smtp' in creds:
                    has_email_with_creds = True
                    print(f"✅ Found EMAIL node with SMTP credentials")
                    print(f"   Credential: {creds['smtp'].get('name')}")

            if node_type == "n8n-nodes-base.twilio":
                if 'twilioApi' in creds:
                    has_sms_with_creds = True
                    print(f"✅ Found SMS node with Twilio credentials")
                    print(f"   Credential: {creds['twilioApi'].get('name')}")

            if node_type == "n8n-nodes-base.httpRequest":
                url = params.get('url', '')
                if '/api/sip/outbound-call' in url:
                    has_call_node = True
                    print(f"✅ Found CALL node using backend API")
                    print(f"   URL: {url}")
                elif 'Completion' in node_name:
                    has_completion_webhook = True
                    print(f"✅ Found completion webhook")
                    print(f"   URL: {url}")

        # 6. Summary
        print_section("✅ INTEGRATION TEST RESULTS")

        results = [
            ("Webhook Trigger Node", has_webhook_trigger),
            ("EMAIL with SMTP Credentials", has_email_with_creds),
            ("SMS with Twilio Credentials", has_sms_with_creds),
            ("CALL using Backend API", has_call_node),
            ("Completion Webhook", has_completion_webhook),
        ]

        all_passed = True
        for name, passed in results:
            status = "✅ PASS" if passed else "❌ FAIL"
            print(f"   {status}: {name}")
            if not passed:
                all_passed = False

        print(f"\n{'=' * 60}")
        if all_passed:
            print("🎉 ALL TESTS PASSED - HYBRID INTEGRATION COMPLETE!")
        else:
            print("⚠️  SOME TESTS FAILED - CHECK OUTPUT ABOVE")

        print(f"\n📋 Next Steps:")
        print(f"   1. Activate the funnel: PUT /api/funnels/{funnel.id} (status: active)")
        print(f"   2. Test execution: POST /api/funnels/{funnel.id}/start")
        print(f"   3. Monitor in n8n: https://n8n.ai.epic.dm/workflow/{workflow_id}")

        return 0 if all_passed else 1

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
