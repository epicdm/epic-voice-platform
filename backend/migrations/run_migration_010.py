#!/usr/bin/env python3
"""
Migration 010: Fix sip_extension VARCHAR length
Run this migration to fix the StringDataRightTruncation error
"""

import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def run_migration():
    """Apply migration to increase sip_extension column size"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        # Connect to database
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        print("=" * 60)
        print("Migration 010: Fix sip_extension VARCHAR(10) → VARCHAR(20)")
        print("=" * 60)

        # Check current column definition
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'agent_configs'
            AND column_name = 'sip_extension';
        """)

        result = cursor.fetchone()
        if result:
            col_name, data_type, max_length = result
            print(f"\n📋 Current definition: {col_name} {data_type}({max_length})")
        else:
            print("\n⚠️  Column sip_extension not found")
            return False

        # Apply migration
        print("\n🔧 Applying migration...")
        cursor.execute("""
            ALTER TABLE agent_configs
            ALTER COLUMN sip_extension TYPE VARCHAR(20);
        """)

        # Update column comment
        cursor.execute("""
            COMMENT ON COLUMN agent_configs.sip_extension
            IS 'SIP extension or DID number (can store full phone numbers up to 20 chars)';
        """)

        conn.commit()

        # Verify the change
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'agent_configs'
            AND column_name = 'sip_extension';
        """)

        result = cursor.fetchone()
        if result:
            col_name, data_type, max_length = result
            print(f"✅ Updated definition: {col_name} {data_type}({max_length})")

        cursor.close()
        conn.close()

        print("\n" + "=" * 60)
        print("✅ Migration completed successfully!")
        print("=" * 60)
        print("\nThis fixes the error:")
        print("  (psycopg2.errors.StringDataRightTruncation)")
        print("  value too long for type character varying(10)")
        print("\nFull phone numbers like +17678189329 will now fit.")

        return True

    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    import sys
    success = run_migration()
    sys.exit(0 if success else 1)
