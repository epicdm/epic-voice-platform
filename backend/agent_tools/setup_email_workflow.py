#!/usr/bin/env python3
"""
Setup Email Follow-up n8n Workflow
Creates an n8n workflow for sending follow-up emails after AI agent calls
"""

import os
import sys
sys.path.append('/opt/livekit1')

from backend.n8n_integration.client import N8nClient
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv('/opt/livekit1/.env')

def create_email_workflow():
    """Create n8n workflow for email follow-ups"""

    # Initialize n8n client
    n8n = N8nClient(
        base_url=os.getenv('N8N_URL', 'https://n8n.ai.epic.dm'),
        api_key=os.getenv('N8N_API_KEY')
    )

    # Test connection
    if not n8n.test_connection():
        logger.error("Failed to connect to n8n")
        return None

    # Create workflow
    workflow_data = {
        "name": "AI Agent Email Follow-up",
        "active": True,
        "nodes": [
            {
                "parameters": {
                    "httpMethod": "POST",
                    "path": "ai-agent-email-followup",
                    "responseMode": "responseNode",
                    "options": {}
                },
                "id": "webhook-trigger",
                "name": "Webhook Trigger",
                "type": "n8n-nodes-base.webhook",
                "typeVersion": 1.1,
                "position": [250, 300],
                "webhookId": "ai-agent-email-followup"
            },
            {
                "parameters": {
                    "fromEmail": "={{ $json.from_email || 'noreply@epic.dm' }}",
                    "toEmail": "={{ $json.to }}",
                    "subject": "={{ $json.subject }}",
                    "text": "={{ $json.body }}",
                    "options": {
                        "allowUnauthorizedCerts": False
                    }
                },
                "id": "send-email",
                "name": "Send Email",
                "type": "n8n-nodes-base.emailSend",
                "typeVersion": 2.1,
                "position": [450, 300],
                "credentials": {
                    "smtp": {
                        "id": "1",
                        "name": "SMTP account"
                    }
                }
            },
            {
                "parameters": {
                    "respondWith": "json",
                    "responseBody": "={{ { \"success\": true, \"message_id\": $json.messageId, \"to\": $json.to, \"sent_at\": $now.toISO() } }}"
                },
                "id": "webhook-response",
                "name": "Webhook Response",
                "type": "n8n-nodes-base.respondToWebhook",
                "typeVersion": 1,
                "position": [650, 300]
            }
        ],
        "connections": {
            "Webhook Trigger": {
                "main": [
                    [
                        {
                            "node": "Send Email",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            },
            "Send Email": {
                "main": [
                    [
                        {
                            "node": "Webhook Response",
                            "type": "main",
                            "index": 0
                        }
                    ]
                ]
            }
        },
        "settings": {
            "executionOrder": "v1"
        },
        "staticData": None,
        "tags": ["ai-agent", "email", "follow-up"],
        "triggerCount": 1,
        "updatedAt": None,
        "versionId": None
    }

    try:
        workflow = n8n.create_workflow(workflow_data)

        # Extract webhook URL
        webhook_url = f"{n8n.base_url}/webhook/ai-agent-email-followup"

        logger.info(f"✅ Email workflow created successfully!")
        logger.info(f"📧 Workflow ID: {workflow.get('id')}")
        logger.info(f"🔗 Webhook URL: {webhook_url}")

        # Test the webhook
        logger.info("\n🧪 Testing webhook...")
        test_payload = {
            "to": "test@example.com",
            "subject": "Test Email from AI Agent",
            "body": "This is a test email sent from the AI Agent Email Follow-up workflow.",
            "from_email": "noreply@epic.dm"
        }

        import requests
        test_response = requests.post(
            webhook_url,
            json=test_payload,
            timeout=30
        )

        if test_response.status_code == 200:
            logger.info(f"✅ Test successful: {test_response.json()}")
        else:
            logger.warning(f"⚠️ Test failed with status {test_response.status_code}: {test_response.text}")

        return {
            'workflow_id': workflow.get('id'),
            'webhook_url': webhook_url,
            'workflow_name': workflow.get('name')
        }

    except Exception as e:
        logger.error(f"❌ Failed to create workflow: {e}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    print("🚀 Setting up Email Follow-up n8n Workflow...\n")

    result = create_email_workflow()

    if result:
        print("\n" + "="*60)
        print("✅ EMAIL FOLLOW-UP WORKFLOW CREATED!")
        print("="*60)
        print(f"Workflow ID: {result['workflow_id']}")
        print(f"Webhook URL: {result['webhook_url']}")
        print("\n📝 Next Steps:")
        print("1. Go to https://n8n.ai.epic.dm and configure SMTP credentials")
        print("2. The workflow is ready to receive webhook calls")
        print("3. Test with:")
        print(f"\n   curl -X POST {result['webhook_url']} \\")
        print('     -H "Content-Type: application/json" \\')
        print('     -d \'{"to":"your@email.com","subject":"Test","body":"Hello!"}\'')
        print("\n" + "="*60)
    else:
        print("\n❌ Failed to create workflow. Check logs above.")
        sys.exit(1)
