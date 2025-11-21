"""
Check for duplicate phone numbers in the database
"""

from database import SessionLocal
from phone_number_manager import PhoneNumberPool
from sqlalchemy import func

db = SessionLocal()

# Check for duplicates in phone_number_pool
duplicates = db.query(
    PhoneNumberPool.phone_number,
    func.count(PhoneNumberPool.id).label('count')
).group_by(
    PhoneNumberPool.phone_number
).having(
    func.count(PhoneNumberPool.id) > 1
).all()

if duplicates:
    print("❌ DUPLICATE PHONE NUMBERS FOUND:")
    print("="*60)
    for phone, count in duplicates:
        print(f"\n📞 {phone} appears {count} times:")
        
        # Get all instances
        instances = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone
        ).all()
        
        for idx, instance in enumerate(instances, 1):
            print(f"  {idx}. ID: {instance.id[:8]}...")
            print(f"     User: {instance.assigned_to_user_id[:8] if instance.assigned_to_user_id else 'None'}...")
            print(f"     Agent: {instance.assigned_to_agent_id[:8] if instance.assigned_to_agent_id else 'None'}...")
            print(f"     Created: {instance.created_at}")
            print(f"     Status: {instance.status}")
    
    print("\n" + "="*60)
    print(f"Total duplicate numbers: {len(duplicates)}")
else:
    print("✅ No duplicates found in phone_number_pool")

# Also check old phone_mappings table
from database import PhoneMapping

mapping_duplicates = db.query(
    PhoneMapping.phone_number,
    func.count(PhoneMapping.id).label('count')
).group_by(
    PhoneMapping.phone_number
).having(
    func.count(PhoneMapping.id) > 1
).all()

if mapping_duplicates:
    print("\n⚠️  DUPLICATES IN OLD phone_mappings TABLE:")
    for phone, count in mapping_duplicates:
        print(f"  {phone}: {count} times")
else:
    print("\n✅ No duplicates in phone_mappings table")

db.close()
