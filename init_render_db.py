#\!/usr/bin/env python3
"""
One-time script to initialize the Render database with all tables.
Run this after deploying to Render for the first time.
"""
import os
import sys

# Set environment variables if needed
if 'DATABASE_URL' not in os.environ:
    print("❌ ERROR: DATABASE_URL environment variable not set\!")
    print("Make sure you're running this on Render or have DATABASE_URL set locally.")
    sys.exit(1)

print(f"🔗 Connecting to database...")
print(f"   Database URL: {os.environ['DATABASE_URL'][:50]}...")

# Import after env check
from database import Base, engine, SessionLocal

def init_database():
    """Create all database tables."""
    try:
        print("\n📊 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully\!")
        
        # Verify tables were created
        from sqlalchemy import inspect
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"\n📋 Created {len(tables)} tables:")
        for table in sorted(tables):
            print(f"   ✓ {table}")
        
        return True
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Render Database Initialization Script")
    print("=" * 60)
    
    success = init_database()
    
    if success:
        print("\n" + "=" * 60)
        print("✅ Database initialization complete\!")
        print("=" * 60)
        sys.exit(0)
    else:
        print("\n" + "=" * 60)
        print("❌ Database initialization failed\!")
        print("=" * 60)
        sys.exit(1)
