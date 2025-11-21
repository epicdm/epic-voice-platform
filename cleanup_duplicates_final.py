"""
Final duplicate cleanup - simple and direct
"""

from database import SessionLocal, PhoneMapping, AgentConfig
from phone_number_manager import PhoneNumberPool

db = SessionLocal()

print("🔧 FINAL DUPLICATE CLEANUP")
print("="*80)

# ============================================================================
# Check ALL phone_mappings (active AND inactive)
# ============================================================================

print("\n📋 Step 1: Checking ALL phone_mappings (including inactive)...")

all_mappings = db.query(PhoneMapping).all()

# Normalize and group
number_groups = {}
for mapping in all_mappings:
    normalized = mapping.phone_number if mapping.phone_number.startswith('+') else f"+{mapping.phone_number}"
    
    if normalized not in number_groups:
        number_groups[normalized] = []
    number_groups[normalized].append(mapping)

# Find and remove ALL duplicates
deleted_count = 0
for normalized_number, instances in number_groups.items():
    if len(instances) > 1:
        print(f"\n❌ Duplicate: {normalized_number} ({len(instances)} total)")
        
        # Sort by: active first, then by creation date
        instances.sort(key=lambda x: (not x.is_active, x.created_at))
        
        keep = instances[0]
        remove = instances[1:]
        
        # Show what we're keeping
        agent = db.query(AgentConfig).filter(AgentConfig.id == keep.agent_config_id).first()
        keep_agent = agent.name if agent else "Unknown"
        keep_status = "ACTIVE" if keep.is_active else "INACTIVE"
        print(f"   ✓ KEEP: {keep.phone_number} → {keep_agent} ({keep_status}, {keep.created_at})")
        
        # Delete all others
        for dup in remove:
            agent = db.query(AgentConfig).filter(AgentConfig.id == dup.agent_config_id).first()
            dup_agent = agent.name if agent else "Unknown"
            dup_status = "ACTIVE" if dup.is_active else "INACTIVE"
            print(f"   ✗ DELETE: {dup.phone_number} → {dup_agent} ({dup_status}, {dup.created_at})")
            db.delete(dup)
            deleted_count += 1

if deleted_count > 0:
    db.commit()
    print(f"\n✅ Deleted {deleted_count} duplicate records")
else:
    print("\n✅ No duplicates found")

# ============================================================================
# Now normalize remaining records
# ============================================================================

print("\n📋 Step 2: Normalizing remaining phone_mappings...")

remaining_mappings = db.query(PhoneMapping).all()

normalized_count = 0
for mapping in remaining_mappings:
    if not mapping.phone_number.startswith('+'):
        old_number = mapping.phone_number
        mapping.phone_number = f"+{old_number}"
        print(f"   ✓ Normalized: {old_number} → {mapping.phone_number}")
        normalized_count += 1

if normalized_count > 0:
    db.commit()
    print(f"✅ Normalized {normalized_count} records")
else:
    print("✅ All records already normalized")

# ============================================================================
# Clean phone_number_pool
# ============================================================================

print("\n📋 Step 3: Cleaning phone_number_pool...")

pool_numbers = db.query(PhoneNumberPool).all()

# Group and find duplicates
pool_groups = {}
for num in pool_numbers:
    normalized = num.phone_number if num.phone_number.startswith('+') else f"+{num.phone_number}"
    
    if normalized not in pool_groups:
        pool_groups[normalized] = []
    pool_groups[normalized].append(num)

pool_deleted = 0
for normalized_number, instances in pool_groups.items():
    if len(instances) > 1:
        print(f"\n❌ Pool duplicate: {normalized_number} ({len(instances)} total)")
        
        # Keep oldest
        instances.sort(key=lambda x: x.created_at)
        keep = instances[0]
        remove = instances[1:]
        
        print(f"   ✓ KEEP: {keep.phone_number} (created {keep.created_at})")
        
        for dup in remove:
            print(f"   ✗ DELETE: {dup.phone_number} (created {dup.created_at})")
            db.delete(dup)
            pool_deleted += 1

if pool_deleted > 0:
    db.commit()
    print(f"\n✅ Deleted {pool_deleted} pool duplicates")
else:
    print("✅ No pool duplicates")

# Normalize pool
pool_normalized = 0
pool_numbers = db.query(PhoneNumberPool).all()
for num in pool_numbers:
    if not num.phone_number.startswith('+'):
        old_number = num.phone_number
        num.phone_number = f"+{old_number}"
        print(f"   ✓ Pool normalized: {old_number} → {num.phone_number}")
        pool_normalized += 1

if pool_normalized > 0:
    db.commit()
    print(f"✅ Normalized {pool_normalized} pool records")

# ============================================================================
# Final verification
# ============================================================================

print("\n" + "="*80)
print("📊 FINAL STATE:")

# Check phone_mappings
from sqlalchemy import func

mapping_check = db.query(
    PhoneMapping.phone_number,
    func.count(PhoneMapping.id).label('count')
).group_by(
    PhoneMapping.phone_number
).having(
    func.count(PhoneMapping.id) > 1
).all()

pool_check = db.query(
    PhoneNumberPool.phone_number,
    func.count(PhoneNumberPool.id).label('count')
).group_by(
    PhoneNumberPool.phone_number
).having(
    func.count(PhoneNumberPool.id) > 1
).all()

if mapping_check:
    print(f"❌ Still have {len(mapping_check)} mapping duplicates!")
    for phone, count in mapping_check:
        print(f"   - {phone}: {count}x")
else:
    print("✅ phone_mappings: NO DUPLICATES")

if pool_check:
    print(f"❌ Still have {len(pool_check)} pool duplicates!")
    for phone, count in pool_check:
        print(f"   - {phone}: {count}x")
else:
    print("✅ phone_number_pool: NO DUPLICATES")

# Count active records
active_count = db.query(PhoneMapping).filter(PhoneMapping.is_active == True).count()
pool_count = db.query(PhoneNumberPool).count()

print(f"\n📈 Active phone_mappings: {active_count}")
print(f"📈 Phone_number_pool entries: {pool_count}")

print("\n" + "="*80)
print("✅ CLEANUP COMPLETE!")

db.close()
