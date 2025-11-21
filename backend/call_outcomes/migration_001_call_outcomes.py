"""
Alembic Migration: Call Outcome Recording Tables

Revision ID: 001_call_outcomes
Create Date: 2025-10-29
Description: Create livekit_call_events table and enhance call_logs with outcome tracking

Changes:
1. Create livekit_call_events table with eventId UNIQUE constraint for idempotency
2. Add columns to call_logs: livekitRoomSid, direction, outcome, status, metadata
3. Add indexes for common query patterns
4. Ensure multi-tenant isolation via userId foreign keys

Run with:
    python backend/call_outcomes/migration_001_call_outcomes.py upgrade

Rollback with:
    python backend/call_outcomes/migration_001_call_outcomes.py downgrade
"""

from sqlalchemy import text
import sys
import os

# Add parent directory to path for database import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from database import SessionLocal, engine


def upgrade():
    """
    Apply migration: Create tables and add columns
    """
    db = SessionLocal()

    print("🔧 Applying migration: 001_call_outcomes")

    try:
        # 1. Create livekit_call_events table
        print("  📦 Creating livekit_call_events table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS livekit_call_events (
                id VARCHAR(36) PRIMARY KEY,
                "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                "callLogId" VARCHAR(36) REFERENCES call_logs(id) ON DELETE CASCADE,
                "eventId" VARCHAR(100) NOT NULL UNIQUE,
                event VARCHAR(50) NOT NULL,
                "roomName" VARCHAR(255) NOT NULL,
                "roomSid" VARCHAR(100),
                "participantIdentity" VARCHAR(255),
                "participantSid" VARCHAR(100),
                timestamp BIGINT NOT NULL,
                "rawPayload" JSONB NOT NULL,
                processed INTEGER DEFAULT 1 NOT NULL,
                "errorMessage" TEXT,
                "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
                "processedAt" TIMESTAMP DEFAULT NOW() NOT NULL
            );
        """))
        print("    ✅ livekit_call_events table created")

        # 2. Create indexes on livekit_call_events
        print("  📑 Creating indexes on livekit_call_events...")
        indexes = [
            ('idx_livekit_events_userId', '"userId"'),
            ('idx_livekit_events_callLogId', '"callLogId"'),
            ('idx_livekit_events_eventId', '"eventId"'),
            ('idx_livekit_events_event', 'event'),
            ('idx_livekit_events_roomName', '"roomName"'),
            ('idx_livekit_events_roomSid', '"roomSid"'),
            ('idx_livekit_events_participantSid', '"participantSid"'),
            ('idx_livekit_events_timestamp', 'timestamp'),
            ('idx_livekit_events_createdAt', '"createdAt"'),
            ('idx_livekit_events_user_event', '"userId", event'),
            ('idx_livekit_events_room_event', '"roomName", event'),
        ]

        for index_name, columns in indexes:
            try:
                db.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON livekit_call_events ({columns});
                """))
                print(f"    ✅ Index {index_name} created")
            except Exception as e:
                print(f"    ⚠️  Index {index_name} may already exist: {e}")

        # 3. Add columns to call_logs (if they don't exist)
        print("  📦 Enhancing call_logs table...")
        alterations = [
            ('livekitRoomName', 'VARCHAR(255)'),
            ('livekitRoomSid', 'VARCHAR(100)'),
            ('direction', "VARCHAR(20) DEFAULT 'inbound'"),
            ('sipCallId', 'VARCHAR(255)'),
            ('status', "VARCHAR(50) DEFAULT 'ended'"),
            ('outcome', 'VARCHAR(50)'),
            ('recordingUrl', 'VARCHAR(512)'),
            ('metadata', 'JSONB'),
            ('updatedAt', 'TIMESTAMP DEFAULT NOW()'),
        ]

        for col_name, col_type in alterations:
            try:
                db.execute(text(f"""
                    ALTER TABLE call_logs
                    ADD COLUMN IF NOT EXISTS "{col_name}" {col_type};
                """))
                print(f"    ✅ Column {col_name} added to call_logs")
            except Exception as e:
                print(f"    ⚠️  Column {col_name} may already exist: {e}")

        # 4. Add indexes on call_logs for outcome queries
        print("  📑 Creating indexes on call_logs...")
        call_log_indexes = [
            ('idx_call_logs_livekitRoomName', '"livekitRoomName"'),
            ('idx_call_logs_livekitRoomSid', '"livekitRoomSid"'),
            ('idx_call_logs_direction', 'direction'),
            ('idx_call_logs_status', 'status'),
            ('idx_call_logs_outcome', 'outcome'),
            ('idx_call_logs_user_outcome', '"userId", outcome'),
            ('idx_call_logs_user_started', '"userId", "startedAt"'),
            ('idx_call_logs_user_direction', '"userId", direction'),
            ('idx_call_logs_phone_started', '"phoneNumber", "startedAt"'),
        ]

        for index_name, columns in call_log_indexes:
            try:
                db.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON call_logs ({columns});
                """))
                print(f"    ✅ Index {index_name} created")
            except Exception as e:
                print(f"    ⚠️  Index {index_name} may already exist: {e}")

        # 5. Add unique constraint on livekitRoomSid (if not exists)
        try:
            db.execute(text("""
                ALTER TABLE call_logs
                ADD CONSTRAINT uq_call_logs_livekitRoomSid
                UNIQUE ("livekitRoomSid");
            """))
            print("    ✅ Unique constraint on livekitRoomSid added")
        except Exception as e:
            print(f"    ⚠️  Unique constraint may already exist: {e}")

        db.commit()
        print("✅ Migration 001_call_outcomes applied successfully\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise

    finally:
        db.close()


def downgrade():
    """
    Rollback migration: Drop table and remove columns
    """
    db = SessionLocal()

    print("🔧 Rolling back migration: 001_call_outcomes")

    try:
        # 1. Drop livekit_call_events table
        print("  🗑️  Dropping livekit_call_events table...")
        db.execute(text("DROP TABLE IF EXISTS livekit_call_events CASCADE;"))
        print("    ✅ livekit_call_events table dropped")

        # 2. Drop indexes from call_logs
        print("  🗑️  Dropping indexes from call_logs...")
        indexes_to_drop = [
            'idx_call_logs_livekitRoomName',
            'idx_call_logs_livekitRoomSid',
            'idx_call_logs_direction',
            'idx_call_logs_status',
            'idx_call_logs_outcome',
            'idx_call_logs_user_outcome',
            'idx_call_logs_user_started',
            'idx_call_logs_user_direction',
            'idx_call_logs_phone_started',
        ]

        for index_name in indexes_to_drop:
            try:
                db.execute(text(f"DROP INDEX IF EXISTS {index_name};"))
                print(f"    ✅ Index {index_name} dropped")
            except Exception as e:
                print(f"    ⚠️  Could not drop {index_name}: {e}")

        # 3. Drop unique constraint
        try:
            db.execute(text("""
                ALTER TABLE call_logs
                DROP CONSTRAINT IF EXISTS uq_call_logs_livekitRoomSid;
            """))
            print("    ✅ Unique constraint dropped")
        except Exception as e:
            print(f"    ⚠️  Could not drop constraint: {e}")

        # 4. Remove columns from call_logs
        print("  🗑️  Removing columns from call_logs...")
        columns_to_drop = [
            'livekitRoomName',
            'livekitRoomSid',
            'direction',
            'sipCallId',
            'status',
            'outcome',
            'recordingUrl',
            'metadata',
            'updatedAt',
        ]

        for col_name in columns_to_drop:
            try:
                db.execute(text(f"""
                    ALTER TABLE call_logs
                    DROP COLUMN IF EXISTS "{col_name}";
                """))
                print(f"    ✅ Column {col_name} dropped")
            except Exception as e:
                print(f"    ⚠️  Could not drop {col_name}: {e}")

        db.commit()
        print("✅ Migration 001_call_outcomes rolled back successfully\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Rollback failed: {e}")
        raise

    finally:
        db.close()


def status():
    """
    Check if migration has been applied
    """
    db = SessionLocal()

    try:
        # Check if livekit_call_events table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'livekit_call_events'
            );
        """))
        table_exists = result.scalar()

        if table_exists:
            # Count events
            count_result = db.execute(text("SELECT COUNT(*) FROM livekit_call_events;"))
            event_count = count_result.scalar()

            print(f"✅ Migration 001_call_outcomes: APPLIED")
            print(f"   - livekit_call_events table exists")
            print(f"   - {event_count} events recorded\n")
        else:
            print(f"⏳ Migration 001_call_outcomes: NOT APPLIED")
            print(f"   - livekit_call_events table does not exist\n")

    except Exception as e:
        print(f"❌ Error checking migration status: {e}\n")

    finally:
        db.close()


if __name__ == '__main__':
    import sys

    command = sys.argv[1] if len(sys.argv) > 1 else 'status'

    if command == 'upgrade':
        upgrade()
    elif command == 'downgrade':
        downgrade()
    elif command == 'status':
        status()
    else:
        print("Usage: python migration_001_call_outcomes.py [upgrade|downgrade|status]")
        print("\nCommands:")
        print("  upgrade    - Apply migration (create tables and columns)")
        print("  downgrade  - Rollback migration (drop tables and columns)")
        print("  status     - Check if migration has been applied")
        sys.exit(1)
