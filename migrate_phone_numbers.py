"""
Migrate existing phone numbers from phone_mappings to phone_number_pool
"""

from database import SessionLocal, PhoneMapping
from phone_number_manager import PhoneNumberPool, PhoneNumberHistory
from datetime import datetime

def migrate_existing_numbers():
    """Migrate existing phone_mappings to new phone_number_pool system"""
    db = SessionLocal()
    
    try:
        # Get all existing mappings
        mappings = db.query(PhoneMapping).all()
        
        migrated = 0
        skipped = 0
        
        print(f"📊 Found {len(mappings)} existing phone mappings")
        
        for mapping in mappings:
            # Check if already in pool
            existing = db.query(PhoneNumberPool).filter(
                PhoneNumberPool.phone_number == mapping.phone_number
            ).first()
            
            if existing:
                print(f"⏭️  Skipped {mapping.phone_number} - already in pool")
                skipped += 1
                continue
            
            # Add to pool
            pool_entry = PhoneNumberPool(
                phone_number=mapping.phone_number,
                assigned_to_user_id=mapping.user_id,
                assigned_to_agent_id=mapping.agent_config_id if mapping.is_active else None,
                status='assigned' if mapping.is_active else 'available',
                assigned_at=mapping.created_at if mapping.is_active else None,
                provider='magnus',
                can_receive_calls=True,
                can_send_calls=True,
                purchase_date=mapping.created_at,
                created_at=mapping.created_at
            )
            db.add(pool_entry)
            
            # Add history entry
            history = PhoneNumberHistory(
                phone_number=mapping.phone_number,
                user_id=mapping.user_id,
                agent_id=mapping.agent_config_id,
                action='migrated',
                previous_status=None,
                new_status='assigned' if mapping.is_active else 'available',
                notes='Migrated from phone_mappings table'
            )
            db.add(history)
            
            print(f"✅ Migrated {mapping.phone_number} → User: {mapping.user_id[:8]}...")
            migrated += 1
        
        db.commit()
        
        print(f"\n{'='*60}")
        print(f"✅ Migration Complete!")
        print(f"📊 Migrated: {migrated}")
        print(f"⏭️  Skipped: {skipped}")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    migrate_existing_numbers()
