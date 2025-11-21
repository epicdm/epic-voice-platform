#!/usr/bin/env python3
"""
Test n8n connection
"""

import sys
sys.path.append('/opt/livekit1/backend')

from n8n_integration.client import N8nClient

# Configuration
N8N_URL = "https://n8n.ai.epic.dm"
N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwNDAwNDk2MC1kZjlkLTQwYjgtYmU3My1kYjY4MjE3OTA2YzIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzYzMjU2NzY1fQ.RYF3mVkrOUsOUL5wZtTmxLNn5RjgGt_yoKtOnNG9ISI"

def main():
    print("🔍 Testing n8n connection...")
    print(f"URL: {N8N_URL}")
    print()

    # Create client
    client = N8nClient(N8N_URL, N8N_API_KEY)

    # Test connection
    if client.test_connection():
        print("✅ Connection successful!")
        print()

        # List existing workflows
        print("📋 Listing existing workflows...")
        workflows = client.list_workflows()

        if workflows:
            print(f"Found {len(workflows)} workflows:")
            for wf in workflows:
                status = "🟢 Active" if wf.get("active") else "⚪ Inactive"
                print(f"  {status} {wf.get('name')} (ID: {wf.get('id')})")
        else:
            print("  No workflows found")

    else:
        print("❌ Connection failed!")
        print("Check:")
        print("  - n8n is running")
        print("  - URL is correct")
        print("  - API key is valid")
        sys.exit(1)

if __name__ == "__main__":
    main()
