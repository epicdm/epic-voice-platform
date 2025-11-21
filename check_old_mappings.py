"""
Check the old phone_mappings table for duplicates
"""

from database import SessionLocal, PhoneMapping, AgentConfig

db = SessionLocal()

# Get all active phone mappings
mappings = db.query(PhoneMapping).filter(
    PhoneMapping.is_active == True
).all()

print(f"📊 Found {len(mappings)} active phone mappings:\n")
print("="*80)

phone_counts = {}
for mapping in mappings:
    phone = mapping.phone_number
    
    # Get agent name
    agent_name = "Unknown"
    if mapping.agent_config_id:
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == mapping.agent_config_id
        ).first()
        if agent:
            agent_name = agent.name
    
    print(f"📞 {phone}")
    print(f"   Agent: {agent_name}")
    print(f"   Agent ID: {mapping.agent_config_id}")
    print(f"   User ID: {mapping.user_id[:8]}...")
    print(f"   Created: {mapping.created_at}")
    print()
    
    # Count occurrences
    if phone in phone_counts:
        phone_counts[phone] += 1
    else:
        phone_counts[phone] = 1

print("="*80)
print("\n🔍 DUPLICATE CHECK:")
duplicates_found = False
for phone, count in phone_counts.items():
    if count > 1:
        print(f"❌ {phone} appears {count} times!")
        duplicates_found = True

if not duplicates_found:
    print("✅ No duplicates in active phone_mappings")

db.close()
