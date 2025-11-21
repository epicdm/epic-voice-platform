"""
Setup Demo Users and Agents
Quick setup script for testing multi-tenant platform
"""

from database import SessionLocal, User, AgentConfig, PhoneMapping, init_db
from werkzeug.security import generate_password_hash
import uuid

def create_demo_users():
    """Create demo users with sample agents."""
    
    # Initialize database
    print("🔧 Initializing database...")
    init_db()
    
    db = SessionLocal()
    
    # Demo User 1
    print("\n👤 Creating Demo User 1...")
    user1_id = str(uuid.uuid4())
    user1 = User(
        id=user1_id,
        email="demo@example.com",
        password_hash=generate_password_hash("demo123"),
        name="Demo User"
    )
    db.add(user1)
    
    # Agent for User 1
    agent1_id = str(uuid.uuid4())
    agent1 = AgentConfig(
        id=agent1_id,
        user_id=user1_id,
        name="Customer Support Agent",
        instructions="""You are a professional customer service representative.

Your role is to:
- Answer customer questions politely and accurately
- Help resolve issues with empathy
- Provide clear information about our products and services
- Escalate complex issues when needed

Keep responses brief and conversational. Always be patient and friendly.""",
        llm_model="gpt-4o-mini",
        voice="alloy",
        temperature=0.7,
        language="en-US"
    )
    db.add(agent1)
    
    # Demo User 2
    print("👤 Creating Demo User 2...")
    user2_id = str(uuid.uuid4())
    user2 = User(
        id=user2_id,
        email="sales@example.com",
        password_hash=generate_password_hash("sales123"),
        name="Sales Team"
    )
    db.add(user2)
    
    # Agent for User 2
    agent2_id = str(uuid.uuid4())
    agent2 = AgentConfig(
        id=agent2_id,
        user_id=user2_id,
        name="Sales Assistant",
        instructions="""You are an enthusiastic and knowledgeable sales assistant.

Your role is to:
- Help customers find products that meet their needs
- Explain features and benefits clearly
- Answer questions about pricing and availability
- Guide customers toward making a purchase decision

Be friendly, helpful, and consultative. Keep responses concise.""",
        llm_model="gpt-4o-mini",
        voice="nova",
        temperature=0.8,
        language="en-US"
    )
    db.add(agent2)
    
    # Phone mapping for User 1 (using your existing number)
    print("📞 Setting up phone number mapping...")
    phone_mapping = PhoneMapping(
        id=str(uuid.uuid4()),
        user_id=user1_id,
        agent_config_id=agent1_id,
        phone_number="17678183366",  # Your existing number
        sip_trunk_id="ST_xkAxBhmf4pbR"
    )
    db.add(phone_mapping)
    
    try:
        db.commit()
        print("\n✅ Demo users created successfully!")
        print("\n📝 Login Credentials:")
        print("-" * 50)
        print("User 1 (Customer Support):")
        print("  Email: demo@example.com")
        print("  Password: demo123")
        print("  Phone: +17678183366")
        print()
        print("User 2 (Sales):")
        print("  Email: sales@example.com")
        print("  Password: sales123")
        print("-" * 50)
        print("\n🚀 You can now login at: http://localhost:5001")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 50)
    print("🎙️  Voice Agent Platform - Demo Setup")
    print("=" * 50)
    create_demo_users()
