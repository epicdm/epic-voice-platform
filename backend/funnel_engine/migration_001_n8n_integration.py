"""
Alembic Migration: Add n8n Integration to Funnels

Revision ID: 001_n8n_integration
Create Date: 2025-11-16
Description: Add n8n_workflow_id column to funnels table for auto-sync integration

Changes:
1. Add n8n_workflow_id VARCHAR(100) column to funnels table
2. Add index on n8n_workflow_id for lookups
3. Allow NULL values (workflows created before n8n integration won't have IDs)

Run with:
    python backend/funnel_engine/migration_001_n8n_integration.py upgrade

Rollback with:
    python backend/funnel_engine/migration_001_n8n_integration.py downgrade
"""

from sqlalchemy import text
import sys
import os

# Add parent directory to path for database import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from database import SessionLocal, engine


def upgrade():
    """
    Apply migration: Add n8n_workflow_id column
    """
    db = SessionLocal()

    print("🔧 Applying migration: 001_n8n_integration")

    try:
        # 1. Add n8n_workflow_id column to funnels table
        print("  📦 Adding n8n_workflow_id column to funnels table...")
        db.execute(text("""
            ALTER TABLE funnels
            ADD COLUMN IF NOT EXISTS n8n_workflow_id VARCHAR(100) NULL
        """))

        # 2. Add index for n8n_workflow_id lookups
        print("  📇 Creating index on n8n_workflow_id...")
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_funnels_n8n_workflow
            ON funnels(n8n_workflow_id)
        """))

        db.commit()
        print("✅ Migration completed successfully!")

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def downgrade():
    """
    Rollback migration: Remove n8n_workflow_id column
    """
    db = SessionLocal()

    print("🔧 Rolling back migration: 001_n8n_integration")

    try:
        # 1. Drop index
        print("  🗑️  Dropping index idx_funnels_n8n_workflow...")
        db.execute(text("""
            DROP INDEX IF EXISTS idx_funnels_n8n_workflow
        """))

        # 2. Drop column
        print("  🗑️  Dropping n8n_workflow_id column...")
        db.execute(text("""
            ALTER TABLE funnels
            DROP COLUMN IF EXISTS n8n_workflow_id
        """))

        db.commit()
        print("✅ Rollback completed successfully!")

    except Exception as e:
        print(f"❌ Rollback failed: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run funnel n8n integration migration")
    parser.add_argument(
        "action",
        choices=["upgrade", "downgrade"],
        help="Migration action: upgrade or downgrade"
    )

    args = parser.parse_args()

    if args.action == "upgrade":
        upgrade()
    elif args.action == "downgrade":
        downgrade()
