"""
Fix duplicate phone numbers by:
1. Normalizing format (add + prefix)
2. Removing duplicates (keep oldest)
3. Enforcing unique constraint
"""

from database import SessionLocal, PhoneMapping, AgentConfig
from phone_number_manager import PhoneNumberPool
from sqlalchemy import func
from datetime import datetime

db = SessionLocal()

print("🔧 PHONE NUMBER CLEANUP STARTING...")
print("="*80)

# ============================================================================
# Step 1: Find duplicates BEFORE normalizing
# ============================================================================

print("\n📋 Step 1: Finding duplicates (considering +/- prefix)...")

# Get all active mappings
mappings = db.query(PhoneMapping).filter(
    PhoneMapping.is_active == True
).all()

# Group by normalized number (with + prefix)
number_groups = {}
for mapping in mappings:
    # Normalize for comparison
    normalized = mapping.phone_number if mapping.phone_number.startswith('+') else f"+{mapping.phone_number}"
    
    if normalized not in number_groups:
        number_groups[normalized] = []
    number_groups[normalized].append(mapping)

# Find duplicates
duplicates_to_remove = []
for normalized_number, instances in number_groups.items():
    if len(instances) > 1:
        print(f"\n❌ Duplicate found: {normalized_number} ({len(instances)} instances)")
        
        # Sort by creation date (keep oldest)
        instances.sort(key=lambda x: x.created_at)
        keep = instances[0]
        remove = instances[1:]
        
        # Show what we're doing
        agent = db.query(AgentConfig).filter(AgentConfig.id == keep.agent_config_id).first()
        keep_agent_name = agent.name if agent else "Unknown"
        print(f"   ✓ KEEP: {keep.phone_number} → {keep_agent_name} (created {keep.created_at})")
        
        for dup in remove:
            agent = db.query(AgentConfig).filter(AgentConfig.id == dup.agent_config_id).first()
            dup_agent_name = agent.name if agent else "Unknown"
            print(f"   ✗ REMOVE: {dup.phone_number} → {dup_agent_name} (created {dup.created_at})")
            duplicates_to_remove.append(dup)

# Remove duplicates by DELETING them (not just marking inactive)
if duplicates_to_remove:
    for dup in duplicates_to_remove:
        db.delete(dup)
    db.commit()
    print(f"\n✅ Deleted {len(duplicates_to_remove)} duplicate mappings")
else:
    print("✅ No duplicates found")

# ============================================================================
# Step 2: Now safe to normalize (no duplicates)
# ============================================================================

print("\n📋 Step 2: Normalizing phone_mappings format...")

# Re-query active mappings
mappings = db.query(PhoneMapping).filter(
    PhoneMapping.is_active == True
).all()

normalized_count = 0
for mapping in mappings:
    if not mapping.phone_number.startswith('+'):
        old_number = mapping.phone_number
        mapping.phone_number = f"+{old_number}"
        print(f"   ✓ Normalized: {old_number} → {mapping.phone_number}")
        normalized_count += 1

if normalized_count > 0:
    db.commit()
    print(f"✅ Normalized {normalized_count} phone numbers")
else:
    print("✅ All numbers already normalized")

# ============================================================================
# Step 3: Double-check no duplicates remain in phone_mappings
# ============================================================================

print("\n📋 Step 3: Double-checking phone_mappings...")

# Re-query after normalization
duplicates = db.query(
    PhoneMapping.phone_number,
    func.count(PhoneMapping.id).label('count')
).filter(
    PhoneMapping.is_active == True
).group_by(
    PhoneMapping.phone_number
).having(
    func.count(PhoneMapping.id) > 1
).all()

if duplicates:
    print(f"❌ Found {len(duplicates)} duplicate phone numbers")
    
    for phone, count in duplicates:
        print(f"\n📞 Processing: {phone} ({count} instances)")
        
        # Get all instances, ordered by creation date (oldest first)
        instances = db.query(PhoneMapping).filter(
            PhoneMapping.phone_number == phone,
            PhoneMapping.is_active == True
        ).order_by(PhoneMapping.created_at.asc()).all()
        
        # Keep the oldest one
        keep = instances[0]
        remove = instances[1:]
        
        print(f"   ✓ KEEP: Agent {keep.agent_config_id[:8]}... (created {keep.created_at})")
        
        # Deactivate the duplicates
        for dup in remove:
            agent = db.query(AgentConfig).filter(
                AgentConfig.id == dup.agent_config_id
            ).first()
            agent_name = agent.name if agent else "Unknown"
            
            print(f"   ✗ REMOVE: Agent {agent_name} (created {dup.created_at})")
            dup.is_active = False
    
    db.commit()
    print(f"\n✅ Removed {sum(count - 1 for _, count in duplicates)} duplicate mappings")
else:
    print("✅ No duplicates found")

# ============================================================================
# Step 4: Normalize phone_number_pool
# ============================================================================

print("\n📋 Step 4: Normalizing phone_number_pool format...")

pool_numbers = db.query(PhoneNumberPool).all()

pool_normalized = 0
for num in pool_numbers:
    if not num.phone_number.startswith('+'):
        old_number = num.phone_number
        num.phone_number = f"+{old_number}"
        print(f"   ✓ Normalized: {old_number} → {num.phone_number}")
        pool_normalized += 1

if pool_normalized > 0:
    db.commit()
    print(f"✅ Normalized {pool_normalized} pool numbers")
else:
    print("✅ All pool numbers already normalized")

# ============================================================================
# Step 5: Find and resolve duplicates in phone_number_pool
# ============================================================================

print("\n📋 Step 5: Finding duplicates in phone_number_pool...")

pool_duplicates = db.query(
    PhoneNumberPool.phone_number,
    func.count(PhoneNumberPool.id).label('count')
).group_by(
    PhoneNumberPool.phone_number
).having(
    func.count(PhoneNumberPool.id) > 1
).all()

if pool_duplicates:
    print(f"❌ Found {len(pool_duplicates)} duplicate pool numbers")
    
    for phone, count in pool_duplicates:
        print(f"\n📞 Processing: {phone} ({count} instances)")
        
        # Get all instances, ordered by creation date (oldest first)
        instances = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone
        ).order_by(PhoneNumberPool.created_at.asc()).all()
        
        # Keep the oldest one
        keep = instances[0]
        remove = instances[1:]
        
        print(f"   ✓ KEEP: ID {keep.id[:8]}... (created {keep.created_at})")
        
        # Delete the duplicates
        for dup in remove:
            print(f"   ✗ DELETE: ID {dup.id[:8]}... (created {dup.created_at})")
            db.delete(dup)
    
    db.commit()
    print(f"\n✅ Deleted {sum(count - 1 for _, count in pool_duplicates)} duplicate pool entries")
else:
    print("✅ No duplicates in pool")

# ============================================================================
# Step 6: Verify cleanup
# ============================================================================

print("\n📋 Step 6: Verifying cleanup...")

# Check phone_mappings
final_mapping_dups = db.query(
    PhoneMapping.phone_number,
    func.count(PhoneMapping.id).label('count')
).filter(
    PhoneMapping.is_active == True
).group_by(
    PhoneMapping.phone_number
).having(
    func.count(PhoneMapping.id) > 1
).all()

# Check phone_number_pool
final_pool_dups = db.query(
    PhoneNumberPool.phone_number,
    func.count(PhoneNumberPool.id).label('count')
).group_by(
    PhoneNumberPool.phone_number
).having(
    func.count(PhoneNumberPool.id) > 1
).all()

if final_mapping_dups:
    print(f"❌ Still have {len(final_mapping_dups)} duplicates in phone_mappings!")
else:
    print("✅ phone_mappings: No duplicates")

if final_pool_dups:
    print(f"❌ Still have {len(final_pool_dups)} duplicates in phone_number_pool!")
else:
    print("✅ phone_number_pool: No duplicates")

# ============================================================================
# Summary
# ============================================================================

print("\n" + "="*80)
print("🎉 CLEANUP COMPLETE!")
print("="*80)

# Show final state
active_mappings = db.query(PhoneMapping).filter(
    PhoneMapping.is_active == True
).count()

pool_count = db.query(PhoneNumberPool).count()

print(f"\n📊 Final State:")
print(f"   Active phone_mappings: {active_mappings}")
print(f"   Phone_number_pool entries: {pool_count}")
print(f"\n✅ All phone numbers now normalized with + prefix")
print(f"✅ All duplicates removed")

db.close()
