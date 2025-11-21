#!/usr/bin/env python3
"""
Test n8n workflow creation
Creates a simple test workflow to verify integration
"""

import sys
sys.path.append('/opt/livekit1/backend')

import logging
logging.basicConfig(level=logging.DEBUG, format='%(levelname)s: %(message)s')

from n8n_integration.client import N8nClient

# Configuration
N8N_URL = "https://n8n.ai.epic.dm"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI"

def main():
    print("🔍 Testing n8n workflow creation...")
    print(f"URL: {N8N_URL}")
    print()

    # Create client
    client = N8nClient(N8N_URL, N8N_API_KEY)

    # Create a simple test workflow
    test_workflow = {
        "name": "Test Workflow - API Integration",
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "test-webhook",
                    "responseMode": "onReceived",
                    "responseData": "firstEntryJson"
                },
                "id": "c1f7b0d0-1234-4567-89ab-0123456789ab",
                "name": "Webhook",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 2,
                "position": [250, 300]
            }
        ],
        "connections": {},
        "settings": {
            "executionOrder": "v1"
        }
    }

    print("📋 Creating test workflow...")
    try:
        import requests

        # Make the API call directly to see full response
        response = requests.post(
            f"{N8N_URL}/api/v1/workflows",
            headers=client.headers,
            json=test_workflow,
            timeout=30,
        )

        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        print()

        if response.status_code != 200 and response.status_code != 201:
            print(f"❌ Error: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error Details: {error_data}")
            except:
                print(f"Raw Error: {response.text}")
            return None

        workflow = response.json()
        print(f"✅ Workflow created successfully!")
        print(f"   ID: {workflow.get('id')}")
        print(f"   Name: {workflow.get('name')}")
        print(f"   Active: {workflow.get('active')}")
        print()

        # Get webhook URL
        webhook_url = f"{N8N_URL}/webhook/test-webhook"
        print(f"📡 Webhook URL: {webhook_url}")
        print()
        print("🧪 Test the webhook:")
        print(f"   curl -X POST {webhook_url} -H 'Content-Type: application/json' -d '{{\"test\": \"data\"}}'")
        print()

        return workflow

    except Exception as e:
        print(f"❌ Error creating workflow: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    main()
