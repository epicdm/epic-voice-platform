#!/usr/bin/env python3
"""
Test n8n Workflow Validation
Verifies that validation catches errors before workflow creation
"""

import sys
import os

# Add backend to path
sys.path.insert(0, '/opt/livekit1')
from backend.n8n_integration.client import N8nClient

def test_validation():
    """Test workflow validation with various scenarios"""

    # Initialize client (URL doesn't matter for validation-only test)
    client = N8nClient("https://n8n.ai.epic.dm", "test-key")

    print("\n" + "="*60)
    print("🧪 Testing n8n Workflow Validation")
    print("="*60 + "\n")

    # Test 1: Valid workflow
    print("Test 1: ✅ Valid Workflow")
    print("-" * 60)
    valid_workflow = {
        "name": "Test Funnel",
        "nodes": [
            {
                "id": "webhook-1",
                "type": "n8n-nodes-base.webhook",
                "name": "Webhook Trigger",
                "parameters": {"path": "funnel-123"},
                "position": [100, 100]
            },
            {
                "id": "http-1",
                "type": "n8n-nodes-base.httpRequest",
                "name": "Call AI Agent",
                "parameters": {"method": "POST", "url": "https://ai.epic.dm/api/sip/outbound-call"},
                "position": [400, 100]
            }
        ],
        "connections": {
            "Webhook Trigger": {
                "main": [[{"node": "Call AI Agent", "type": "main", "index": 0}]]
            }
        }
    }

    result = client.validate_workflow(valid_workflow)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == True, "Valid workflow should pass validation"
    print("✅ PASS\n")

    # Test 2: Missing webhook path
    print("Test 2: ❌ Missing Webhook Path")
    print("-" * 60)
    invalid_webhook = {
        "name": "Test Funnel",
        "nodes": [
            {
                "id": "webhook-1",
                "type": "n8n-nodes-base.webhook",
                "name": "Webhook Trigger",
                "parameters": {},  # Missing "path"!
                "position": [100, 100]
            }
        ],
        "connections": {}
    }

    result = client.validate_workflow(invalid_webhook)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == False, "Missing webhook path should fail validation"
    assert any("path" in err.lower() for err in result['errors']), "Should report missing path"
    print("✅ PASS\n")

    # Test 3: No workflow name
    print("Test 3: ❌ No Workflow Name")
    print("-" * 60)
    no_name = {
        "name": "",  # Empty name!
        "nodes": [
            {
                "id": "webhook-1",
                "type": "n8n-nodes-base.webhook",
                "name": "Trigger",
                "parameters": {"path": "test"},
                "position": [100, 100]
            }
        ],
        "connections": {}
    }

    result = client.validate_workflow(no_name)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == False, "Empty name should fail validation"
    assert any("name" in err.lower() for err in result['errors']), "Should report missing name"
    print("✅ PASS\n")

    # Test 4: Duplicate node names
    print("Test 4: ❌ Duplicate Node Names")
    print("-" * 60)
    duplicate_names = {
        "name": "Test Funnel",
        "nodes": [
            {
                "id": "webhook-1",
                "type": "n8n-nodes-base.webhook",
                "name": "Trigger",  # Duplicate name!
                "parameters": {"path": "test"},
                "position": [100, 100]
            },
            {
                "id": "webhook-2",
                "type": "n8n-nodes-base.webhook",
                "name": "Trigger",  # Duplicate name!
                "parameters": {"path": "test2"},
                "position": [400, 100]
            }
        ],
        "connections": {}
    }

    result = client.validate_workflow(duplicate_names)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == False, "Duplicate names should fail validation"
    assert any("duplicate" in err.lower() for err in result['errors']), "Should report duplicates"
    print("✅ PASS\n")

    # Test 5: Disconnected nodes (warning only)
    print("Test 5: ⚠️  Disconnected Nodes (Warning Only)")
    print("-" * 60)
    disconnected = {
        "name": "Test Funnel",
        "nodes": [
            {
                "id": "webhook-1",
                "type": "n8n-nodes-base.webhook",
                "name": "Trigger",
                "parameters": {"path": "test"},
                "position": [100, 100]
            },
            {
                "id": "http-1",
                "type": "n8n-nodes-base.httpRequest",
                "name": "Orphan Node",  # Not connected!
                "parameters": {"method": "GET", "url": "https://example.com"},
                "position": [400, 100]
            }
        ],
        "connections": {}  # No connections!
    }

    result = client.validate_workflow(disconnected)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == True, "Disconnected nodes should NOT fail validation (warning only)"
    assert any("disconnected" in warn.lower() for warn in result['warnings']), "Should warn about disconnected nodes"
    print("✅ PASS\n")

    # Test 6: Missing node ID
    print("Test 6: ❌ Missing Node ID")
    print("-" * 60)
    no_id = {
        "name": "Test Funnel",
        "nodes": [
            {
                # Missing "id" field!
                "type": "n8n-nodes-base.webhook",
                "name": "Trigger",
                "parameters": {"path": "test"},
                "position": [100, 100]
            }
        ],
        "connections": {}
    }

    result = client.validate_workflow(no_id)
    print(f"Valid: {result['valid']}")
    print(f"Errors: {result['errors']}")
    print(f"Warnings: {result['warnings']}")
    assert result['valid'] == False, "Missing node ID should fail validation"
    assert any("id" in err.lower() for err in result['errors']), "Should report missing ID"
    print("✅ PASS\n")

    # Summary
    print("=" * 60)
    print("✅ ALL VALIDATION TESTS PASSED!")
    print("=" * 60)
    print("\n📊 Summary:")
    print("  - Valid workflow: ✅ Passes validation")
    print("  - Missing webhook path: ❌ Caught")
    print("  - Missing name: ❌ Caught")
    print("  - Duplicate names: ❌ Caught")
    print("  - Disconnected nodes: ⚠️  Warned")
    print("  - Missing node ID: ❌ Caught")
    print("\n🎯 Validation system working correctly!\n")

if __name__ == "__main__":
    try:
        test_validation()
        sys.exit(0)
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
