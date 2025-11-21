#!/usr/bin/env python3
"""
Test Phone Number Assignment to Agent
"""
import sys
import os
sys.path.insert(0, '/opt/livekit1')

from database import SessionLocal, User
from phone_number_manager import PhoneNumberManager, PhoneNumberPool
from sqlalchemy import create_engine

# Initialize
db = SessionLocal()
phone_manager = PhoneNumberManager()

# Test parameters
phone_number = "17678189025"
agent_id = "139d8d20-293d-4a1b-817f-73cc7f35b1ee"  # EPIC Sales Agent
user = db.query(User).filter(User.email == 'giraud.eric@gmail.com').first()
user_id = user.id if user else None

print(f"📞 Assigning phone number: {phone_number}")
print(f"🤖 To agent ID: {agent_id}")
print(f"👤 User ID: {user_id}")
print()

# Call the assignment function
result = phone_manager.assign_to_agent(db, phone_number, agent_id, user_id)

print()
print("=" * 60)
if result['success']:
    print("✅ Assignment SUCCESSFUL!")
    print(f"Message: {result.get('message', 'No message')}")
else:
    print("❌ Assignment FAILED!")
    print(f"Error: {result.get('error', 'Unknown error')}")
print("=" * 60)

# Verify the assignment
print("\n📋 Verifying assignment in database...")
pool_record = db.query(PhoneNumberPool).filter(
    PhoneNumberPool.phone_number == phone_number
).first()

if pool_record:
    print(f"Phone Number: {pool_record.phone_number}")
    print(f"Status: {pool_record.status}")
    print(f"Assigned to Agent ID: {pool_record.assigned_to_agent_id}")
    print(f"SIP Username: {pool_record.sip_username}")
    print(f"SIP Domain: {pool_record.sip_domain}")
else:
    print("❌ Phone number not found in pool!")

db.close()
