#!/usr/bin/env python3
"""
Test Campaign Engine End-to-End
Creates test campaign and verifies automated execution
"""

import os
import sys
import uuid
import asyncio
from datetime import datetime, timedelta, timezone
from sqlalchemy import create_engine, text
from database import SessionLocal

# Test configuration
TEST_USER_ID = "b50cec05-fa5b-4bb4-aaaa-21358c699c45"  # Use existing admin user
TEST_AGENT_ID = "7b885e98-8cfe-4d8a-947c-9eb24ad678e0"  # tst0002 agent
TEST_PHONE_NUMBER = "+15555551234"  # Test number (non-functional)

def print_section(title):
    """Print formatted section header"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def verify_test_user(db):
    """Verify test user exists"""
    print_section("STEP 1: Verify Test User")

    user_id = TEST_USER_ID

    result = db.execute(text("""
        SELECT id, email, name FROM users WHERE id = :id
    """), {'id': user_id})

    user = result.fetchone()
    if user:
        print(f"✅ Using existing user: {user[1]} ({user[2]})")
        return user_id
    else:
        print(f"❌ Test user not found: {user_id}")
        sys.exit(1)

def create_test_lead(db, user_id):
    """Create test lead"""
    print_section("STEP 2: Create Test Lead")

    lead_id = str(uuid.uuid4())

    db.execute(text("""
        INSERT INTO leads (
            id, user_id, phone_number, first_name, last_name,
            status, created_at, updated_at
        ) VALUES (
            :id, :user_id, :phone_number, :first_name, :last_name,
            :status, :created_at, :updated_at
        )
    """), {
        'id': lead_id,
        'user_id': user_id,
        'phone_number': TEST_PHONE_NUMBER,
        'first_name': 'Test',
        'last_name': 'Lead',
        'status': 'new',
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    })
    db.commit()

    print(f"✅ Created test lead: {lead_id}")
    print(f"   Phone: {TEST_PHONE_NUMBER}")
    return lead_id

def create_test_campaign(db, user_id):
    """Create test campaign"""
    print_section("STEP 3: Create Test Campaign")

    campaign_id = str(uuid.uuid4())

    db.execute(text("""
        INSERT INTO campaigns (
            id, user_id, agent_id, name, description, status,
            scheduled_start, scheduled_end, leads_total,
            created_at, updated_at
        ) VALUES (
            :id, :user_id, :agent_id, :name, :description, :status,
            :scheduled_start, :scheduled_end, :leads_total,
            :created_at, :updated_at
        )
    """), {
        'id': campaign_id,
        'user_id': user_id,
        'agent_id': TEST_AGENT_ID,
        'name': 'Test Campaign - Automated Execution',
        'description': 'End-to-end test of campaign engine',
        'status': 'scheduled',
        'scheduled_start': datetime.now(timezone.utc),
        'scheduled_end': datetime.now(timezone.utc) + timedelta(hours=1),
        'leads_total': 1,
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    })
    db.commit()

    print(f"✅ Created test campaign: {campaign_id}")
    print(f"   Status: scheduled")
    print(f"   Agent: {TEST_AGENT_ID}")
    return campaign_id

def schedule_test_call(db, campaign_id, lead_id):
    """Schedule test call for immediate execution"""
    print_section("STEP 4: Schedule Test Call")

    call_id = str(uuid.uuid4())

    # Schedule for 5 seconds from now (should be picked up in next polling cycle)
    scheduled_time = datetime.now(timezone.utc) + timedelta(seconds=5)

    db.execute(text("""
        INSERT INTO campaign_calls (
            id, campaign_id, lead_id, scheduled_for,
            status, retry_count, max_retries,
            created_at, updated_at
        ) VALUES (
            :id, :campaign_id, :lead_id, :scheduled_for,
            :status, :retry_count, :max_retries,
            :created_at, :updated_at
        )
    """), {
        'id': call_id,
        'campaign_id': campaign_id,
        'lead_id': lead_id,
        'scheduled_for': scheduled_time,
        'status': 'scheduled',
        'retry_count': 0,
        'max_retries': 2,
        'created_at': datetime.now(timezone.utc),
        'updated_at': datetime.now(timezone.utc)
    })
    db.commit()

    print(f"✅ Created scheduled call: {call_id}")
    print(f"   Scheduled for: {scheduled_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"   Status: scheduled")
    return call_id

def monitor_call_execution(db, call_id, timeout_seconds=60):
    """Monitor call execution by campaign engine"""
    print_section("STEP 5: Monitor Campaign Engine Execution")

    print(f"📡 Monitoring call {call_id[:8]}... (timeout: {timeout_seconds}s)")
    print("   Campaign engine should pick this up in the next polling cycle (30s)")

    start_time = datetime.now(timezone.utc)

    while (datetime.now(timezone.utc) - start_time).total_seconds() < timeout_seconds:
        result = db.execute(text("""
            SELECT status, attempted_at, error_message, call_log_id
            FROM campaign_calls
            WHERE id = :id
        """), {'id': call_id})

        row = result.fetchone()
        if row:
            status, attempted_at, error_message, call_log_id = row

            if status != 'scheduled':
                print(f"\n✅ Status changed: {status}")
                if attempted_at:
                    print(f"   Attempted at: {attempted_at}")
                if error_message:
                    print(f"   Error: {error_message}")
                if call_log_id:
                    print(f"   Call log ID: {call_log_id}")
                return status, error_message

        # Poll every 2 seconds
        import time
        time.sleep(2)
        print(".", end="", flush=True)

    print("\n⏱️ Timeout reached - call may still be processing")
    return None, "Monitoring timeout"

def verify_campaign_metrics(db, campaign_id):
    """Verify campaign metrics were updated"""
    print_section("STEP 6: Verify Campaign Metrics")

    result = db.execute(text("""
        SELECT
            status,
            actual_start,
            leads_completed,
            leads_failed,
            leads_in_progress,
            total_calls
        FROM campaigns
        WHERE id = :id
    """), {'id': campaign_id})

    row = result.fetchone()
    if row:
        status, actual_start, leads_completed, leads_failed, leads_in_progress, total_calls = row

        print(f"Campaign Status: {status}")
        print(f"Actual Start: {actual_start}")
        print(f"Leads Completed: {leads_completed}")
        print(f"Leads Failed: {leads_failed}")
        print(f"Leads In Progress: {leads_in_progress}")
        print(f"Total Calls: {total_calls}")

        if status == 'running' or status == 'completed':
            print("\n✅ Campaign metrics updated successfully!")
            return True
        else:
            print("\n⚠️ Campaign status not updated yet")
            return False

    return False

def cleanup_test_data(db, campaign_id, lead_id, call_id):
    """Clean up test data"""
    print_section("STEP 7: Cleanup Test Data")

    try:
        # Delete in correct order due to foreign keys
        db.execute(text("DELETE FROM campaign_calls WHERE id = :id"), {'id': call_id})
        db.execute(text("DELETE FROM campaigns WHERE id = :id"), {'id': campaign_id})
        db.execute(text("DELETE FROM leads WHERE id = :id"), {'id': lead_id})
        # Don't delete user - using existing admin user
        db.commit()

        print("✅ Test data cleaned up successfully")
    except Exception as e:
        print(f"⚠️ Cleanup error (non-fatal): {e}")
        db.rollback()

def main():
    """Run complete end-to-end test"""
    print_section("Campaign Engine End-to-End Test")
    print("This test will:")
    print("1. Verify test user exists")
    print("2. Create a test lead")
    print("3. Create a test campaign")
    print("4. Schedule a test call")
    print("5. Monitor campaign engine execution")
    print("6. Verify campaign metrics")
    print("7. Clean up test data")

    db = SessionLocal()

    try:
        # Run test workflow
        user_id = verify_test_user(db)
        lead_id = create_test_lead(db, user_id)
        campaign_id = create_test_campaign(db, user_id)
        call_id = schedule_test_call(db, campaign_id, lead_id)

        # Monitor execution
        status, error = monitor_call_execution(db, call_id, timeout_seconds=90)

        # Verify metrics
        metrics_updated = verify_campaign_metrics(db, campaign_id)

        # Results summary
        print_section("TEST RESULTS")
        if status and status != 'scheduled':
            print("✅ Campaign engine successfully processed the call!")
            print(f"   Final status: {status}")
            if error:
                print(f"   Note: {error}")
        else:
            print("⚠️ Call was not processed within timeout period")
            print("   This may indicate:")
            print("   - Campaign engine polling interval too long")
            print("   - Service not running")
            print("   - Database connection issues")

        if metrics_updated:
            print("✅ Campaign metrics updated correctly")

        # Cleanup
        cleanup_test_data(db, campaign_id, lead_id, call_id)

        print_section("TEST COMPLETE")

        # Exit code based on results
        if status and status != 'scheduled':
            print("🎉 End-to-end test PASSED!")
            return 0
        else:
            print("❌ End-to-end test FAILED or INCOMPLETE")
            return 1

    except Exception as e:
        print(f"\n❌ Test error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        db.close()

if __name__ == '__main__':
    sys.exit(main())
