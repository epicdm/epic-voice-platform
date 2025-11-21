#!/usr/bin/env python3
"""
Test Webhook Delivery
Creates test webhook configuration and triggers test events
"""

import os
import sys
import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from database import SessionLocal
from webhook_events import trigger_webhook_event

# Test configuration
TEST_USER_ID = "b50cec05-fa5b-4bb4-aaaa-21358c699c45"  # Admin user
TEST_WEBHOOK_URL = "https://webhook.site/#!/view/cf165b39-bd91-4482-acad-0644dc8f1c2a"  # Replace with actual webhook.site URL

def print_section(title):
    """Print formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def create_test_webhook(db, user_id: str, webhook_url: str) -> str:
    """Create test webhook configuration"""
    print_section("STEP 1: Create Test Webhook Configuration")

    # Check if webhook already exists for this user
    result = db.execute(text("""
        SELECT id FROM partner_webhooks
        WHERE user_id = :user_id AND url = :url
    """), {'user_id': user_id, 'url': webhook_url})

    existing = result.fetchone()
    if existing:
        webhook_id = existing[0]
        print(f"✅ Using existing webhook: {webhook_id}")
        return webhook_id

    # Create new webhook
    webhook_id = str(uuid.uuid4())

    db.execute(text("""
        INSERT INTO partner_webhooks (
            id, user_id, url, secret, events, active,
            description, created_at, updated_at
        ) VALUES (
            :id, :user_id, :url, :secret, :events, true,
            :description, :created_at, :updated_at
        )
    """), {
        'id': webhook_id,
        'user_id': user_id,
        'url': webhook_url,
        'secret': 'test-webhook-secret-12345',
        'events': ['call.started', 'call.completed', 'call.failed', 'campaign.started', 'campaign.completed'],
        'description': 'Test webhook for delivery service validation',
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    })
    db.commit()

    print(f"✅ Created test webhook: {webhook_id}")
    print(f"   URL: {webhook_url}")
    print(f"   Events: call.*, campaign.*")
    return webhook_id

async def trigger_test_events(user_id: str):
    """Trigger test webhook events"""
    print_section("STEP 2: Trigger Test Events")

    # Event 1: call.started
    print("\n📤 Triggering: call.started")
    await trigger_webhook_event('call.started', {
        'call_id': str(uuid.uuid4()),
        'campaign_call_id': str(uuid.uuid4()),
        'campaign_id': str(uuid.uuid4()),
        'lead_id': str(uuid.uuid4()),
        'phone_number': '+15555551234',
        'agent_id': '7b885e98-8cfe-4d8a-947c-9eb24ad678e0',
        'room_name': 'test-room-123',
        'from_number': '+17678183366',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }, user_id)
    print("✅ Event queued: call.started")

    # Event 2: campaign.started
    print("\n📤 Triggering: campaign.started")
    await trigger_webhook_event('campaign.started', {
        'campaign_id': str(uuid.uuid4()),
        'agent_id': '7b885e98-8cfe-4d8a-947c-9eb24ad678e0',
        'name': 'Test Campaign',
        'started_at': datetime.now(timezone.utc).isoformat()
    }, user_id)
    print("✅ Event queued: campaign.started")

    # Event 3: call.completed
    print("\n📤 Triggering: call.completed")
    await trigger_webhook_event('call.completed', {
        'call_id': str(uuid.uuid4()),
        'campaign_call_id': str(uuid.uuid4()),
        'campaign_id': str(uuid.uuid4()),
        'lead_id': str(uuid.uuid4()),
        'phone_number': '+15555551234',
        'duration_seconds': 125,
        'outcome': 'success',
        'transcript': 'Test call transcript',
        'completed_at': datetime.now(timezone.utc).isoformat()
    }, user_id)
    print("✅ Event queued: call.completed")

def check_webhook_queue(db):
    """Check webhook events queue status"""
    print_section("STEP 3: Check Webhook Events Queue")

    result = db.execute(text("""
        SELECT
            id, event_type, event_id, processed_at,
            retry_count, max_retries
        FROM webhook_events_queue
        ORDER BY created_at DESC
        LIMIT 10
    """))

    events = result.fetchall()

    if not events:
        print("⚠️  No events in queue")
        return

    print(f"\n📋 Found {len(events)} recent events:")
    for event in events:
        status = "✅ Processed" if event[3] else f"⏳ Pending (retry {event[4]}/{event[5]})"
        print(f"   {event[1][:20]:<20} | {event[2][:12]}... | {status}")

def check_deliveries(db, webhook_id: str):
    """Check webhook delivery attempts"""
    print_section("STEP 4: Check Webhook Deliveries")

    result = db.execute(text("""
        SELECT
            id, event_type, status, status_code,
            duration_ms, retry_number, error_message,
            delivered_at
        FROM webhook_deliveries
        WHERE webhook_id = :webhook_id
        ORDER BY created_at DESC
        LIMIT 10
    """), {'webhook_id': webhook_id})

    deliveries = result.fetchall()

    if not deliveries:
        print("ℹ️  No deliveries yet (webhook delivery service may still be processing)")
        print("   Wait 5-10 seconds and run this script again to see results")
        return

    print(f"\n📊 Found {len(deliveries)} delivery attempts:")
    for delivery in deliveries:
        status_icon = "✅" if delivery[2] == 'delivered' else "❌" if delivery[2] == 'failed' else "⏳"
        status_text = f"{status_icon} {delivery[2]}"
        if delivery[3]:  # status_code
            status_text += f" ({delivery[3]})"
        if delivery[4]:  # duration_ms
            status_text += f" - {delivery[4]}ms"
        if delivery[5] > 0:  # retry_number
            status_text += f" - Retry {delivery[5]}"

        print(f"   {delivery[1][:20]:<20} | {status_text}")

        if delivery[6]:  # error_message
            print(f"      Error: {delivery[6][:80]}")

def main():
    """Run webhook delivery test"""
    print_section("Webhook Delivery Test")
    print("This test will:")
    print("1. Create a test webhook configuration")
    print("2. Trigger test events (call.started, campaign.started, call.completed)")
    print("3. Check webhook events queue")
    print("4. Check delivery attempts")
    print("\n⚠️  IMPORTANT: Replace TEST_WEBHOOK_URL with your webhook.site URL")
    print(f"   Current URL: {TEST_WEBHOOK_URL}")

    if TEST_WEBHOOK_URL == "https://webhook.site/unique-id":
        print("\n❌ ERROR: You must update TEST_WEBHOOK_URL in this script first!")
        print("   1. Go to https://webhook.site/ to get a unique URL")
        print("   2. Edit this script and replace the TEST_WEBHOOK_URL")
        print("   3. Run the script again")
        return 1

    db = SessionLocal()

    try:
        # Create test webhook
        webhook_id = create_test_webhook(db, TEST_USER_ID, TEST_WEBHOOK_URL)

        # Trigger test events
        asyncio.run(trigger_test_events(TEST_USER_ID))

        # Check queue
        check_webhook_queue(db)

        # Check deliveries
        check_deliveries(db, webhook_id)

        print_section("TEST COMPLETE")
        print("✅ Test events have been queued")
        print("\n📝 Next Steps:")
        print("1. Wait 5-10 seconds for webhook delivery service to process events")
        print("2. Run this script again to see delivery results")
        print(f"3. Check {TEST_WEBHOOK_URL} to see received webhooks")
        print("\n💡 Monitor webhook delivery service logs:")
        print("   journalctl -u webhook-delivery -f")

        return 0

    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()

if __name__ == '__main__':
    sys.exit(main())
