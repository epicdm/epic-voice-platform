#!/usr/bin/env python3
"""
Complete Database Schema Fix Script
Applies ALL necessary schema corrections to match expected configuration
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def apply_all_fixes():
    """Apply all database schema fixes"""

    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor()

        print("=" * 80)
        print("APPLYING ALL DATABASE SCHEMA FIXES")
        print("=" * 80)

        fixes_applied = []

        # FIX 1: Increase sip_extension from VARCHAR(10) to VARCHAR(20)
        print("\n🔧 Fix 1: Increasing sip_extension column size...")
        cursor.execute("""
            ALTER TABLE agent_configs
            ALTER COLUMN sip_extension TYPE VARCHAR(20);
        """)
        fixes_applied.append("sip_extension: VARCHAR(10) → VARCHAR(20)")

        # FIX 2: Update column comment
        cursor.execute("""
            COMMENT ON COLUMN agent_configs.sip_extension
            IS 'SIP extension or DID number (can store full phone numbers up to 20 chars)';
        """)

        # Commit all changes
        conn.commit()

        # Verify fixes
        print("\n✅ Verifying fixes...")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'agent_configs'
              AND column_name IN ('sip_extension', 'did_number')
            ORDER BY column_name;
        """)

        results = cursor.fetchall()
        for column_name, data_type, max_length in results:
            print(f"  {column_name}: {data_type}({max_length})")

        cursor.close()
        conn.close()

        print("\n" + "=" * 80)
        print("✅ ALL FIXES APPLIED SUCCESSFULLY")
        print("=" * 80)
        print("\nFixes applied:")
        for i, fix in enumerate(fixes_applied, 1):
            print(f"  {i}. {fix}")

        return True

    except Exception as e:
        print(f"\n❌ Fix application failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = apply_all_fixes()
    sys.exit(0 if success else 1)
