"""
SQLAlchemy models for call outcome recording.

Models are now defined in database.py to avoid duplicate table definitions.
This module imports them for backwards compatibility.

Multi-Tenant: All tables include userId foreign key for tenant isolation
Database Conventions: camelCase columns (Prisma compatibility), snake_case tables
"""

from database import CallLog, LiveKitCallEvent


# Migration helper - add missing columns to existing call_logs table
def upgrade_call_logs_schema(db_session):
    """
    Add new columns to existing call_logs table if they don't exist.

    This is a transitional helper until proper Alembic migrations are in place.
    Run this once to upgrade the schema without losing existing data.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(db_session.bind)
    existing_columns = [col['name'] for col in inspector.get_columns('call_logs')]

    alterations = []

    # Check for missing columns
    if 'livekitRoomName' not in existing_columns:
        alterations.append('ADD COLUMN "livekitRoomName" VARCHAR(255)')

    if 'livekitRoomSid' not in existing_columns:
        alterations.append('ADD COLUMN "livekitRoomSid" VARCHAR(100) UNIQUE')

    if 'direction' not in existing_columns:
        alterations.append("ADD COLUMN direction VARCHAR(20) DEFAULT 'inbound'")

    if 'sipCallId' not in existing_columns:
        alterations.append('ADD COLUMN "sipCallId" VARCHAR(255)')

    if 'status' not in existing_columns:
        alterations.append("ADD COLUMN status VARCHAR(50) DEFAULT 'ended'")

    if 'outcome' not in existing_columns:
        alterations.append('ADD COLUMN outcome VARCHAR(50)')

    if 'recordingUrl' not in existing_columns:
        alterations.append('ADD COLUMN "recordingUrl" VARCHAR(512)')

    if 'metadata' not in existing_columns:
        alterations.append('ADD COLUMN metadata JSONB')

    if 'updatedAt' not in existing_columns:
        alterations.append('ADD COLUMN "updatedAt" TIMESTAMP DEFAULT NOW()')

    # Execute alterations
    if alterations:
        for alteration in alterations:
            try:
                db_session.execute(text(f'ALTER TABLE call_logs {alteration}'))
                print(f"✅ Applied: {alteration}")
            except Exception as e:
                print(f"⚠️  Skipped (may already exist): {alteration} - {e}")

        db_session.commit()
        print("✅ call_logs schema upgraded successfully")
    else:
        print("✅ call_logs schema already up to date")
