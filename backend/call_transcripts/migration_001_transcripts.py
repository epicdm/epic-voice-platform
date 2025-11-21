"""
Database Migration: Call Transcripts

Revision ID: 001_transcripts
Create Date: 2025-10-30
Description: Create call_transcripts and transcript_segments tables

Changes:
1. Create call_transcripts table with metadata and status tracking
2. Create transcript_segments table with speaker identification and timestamps
3. Add indexes for common query patterns
4. Ensure multi-tenant isolation via userId foreign keys

Run with:
    python backend/call_transcripts/migration_001_transcripts.py

Tables Created:
- call_transcripts: Top-level transcript per call with metadata
- transcript_segments: Individual utterances with speaker, timing, text
"""

from sqlalchemy import text
import sys
import os

# Add parent directory to path for database import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))
from database import SessionLocal, engine


def upgrade():
    """
    Apply migration: Create transcript tables
    """
    db = SessionLocal()

    print("🔧 Applying migration: 001_transcripts")

    try:
        # 1. Create call_transcripts table
        print("  📦 Creating call_transcripts table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS call_transcripts (
                id VARCHAR(36) PRIMARY KEY,
                "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                "callLogId" VARCHAR(36) NOT NULL UNIQUE REFERENCES call_logs(id) ON DELETE CASCADE,
                language VARCHAR(10),
                duration DOUBLE PRECISION,
                "segmentCount" INTEGER DEFAULT 0,
                sentiment VARCHAR(20),
                summary TEXT,
                keywords JSONB,
                status VARCHAR(20) DEFAULT 'processing' NOT NULL,
                "errorMessage" TEXT,
                "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL,
                "updatedAt" TIMESTAMP DEFAULT NOW(),
                "completedAt" TIMESTAMP
            );
        """))
        print("    ✅ call_transcripts table created")

        # 2. Create indexes on call_transcripts
        print("  📑 Creating indexes on call_transcripts...")
        transcript_indexes = [
            ('idx_call_transcripts_userId', '"userId"'),
            ('idx_call_transcripts_callLogId', '"callLogId"'),
            ('idx_call_transcripts_status', 'status'),
            ('idx_call_transcripts_createdAt', '"createdAt"'),
            ('idx_call_transcripts_user_created', '"userId", "createdAt"'),
        ]

        for index_name, columns in transcript_indexes:
            try:
                db.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON call_transcripts ({columns});
                """))
                print(f"    ✅ Index {index_name} created")
            except Exception as e:
                print(f"    ⚠️  Index {index_name} may already exist: {e}")

        # 3. Create transcript_segments table
        print("  📦 Creating transcript_segments table...")
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS transcript_segments (
                id VARCHAR(36) PRIMARY KEY,
                "transcriptId" VARCHAR(36) NOT NULL REFERENCES call_transcripts(id) ON DELETE CASCADE,
                "sequenceNumber" INTEGER NOT NULL,
                speaker VARCHAR(20) NOT NULL,
                "speakerId" VARCHAR(100),
                "startTime" DOUBLE PRECISION NOT NULL,
                "endTime" DOUBLE PRECISION NOT NULL,
                text TEXT NOT NULL,
                confidence DOUBLE PRECISION,
                language VARCHAR(10),
                "isFinal" BOOLEAN DEFAULT TRUE,
                segment_metadata JSONB,
                "createdAt" TIMESTAMP DEFAULT NOW() NOT NULL
            );
        """))
        print("    ✅ transcript_segments table created")

        # 4. Create indexes on transcript_segments
        print("  📑 Creating indexes on transcript_segments...")
        segment_indexes = [
            ('idx_transcript_segments_transcriptId', '"transcriptId"'),
            ('idx_transcript_segments_speaker', 'speaker'),
            ('idx_transcript_segments_transcript_sequence', '"transcriptId", "sequenceNumber"'),
            ('idx_transcript_segments_transcript_time', '"transcriptId", "startTime"'),
            ('idx_transcript_segments_createdAt', '"createdAt"'),
        ]

        for index_name, columns in segment_indexes:
            try:
                db.execute(text(f"""
                    CREATE INDEX IF NOT EXISTS {index_name}
                    ON transcript_segments ({columns});
                """))
                print(f"    ✅ Index {index_name} created")
            except Exception as e:
                print(f"    ⚠️  Index {index_name} may already exist: {e}")

        db.commit()
        print("✅ Migration 001_transcripts applied successfully\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Migration failed: {e}")
        raise
    finally:
        db.close()


def downgrade():
    """
    Rollback migration: Drop transcript tables
    """
    db = SessionLocal()

    print("🔧 Rolling back migration: 001_transcripts")

    try:
        # Drop tables in reverse order (segments first due to FK)
        print("  📦 Dropping transcript_segments table...")
        db.execute(text("DROP TABLE IF EXISTS transcript_segments CASCADE;"))
        print("    ✅ transcript_segments table dropped")

        print("  📦 Dropping call_transcripts table...")
        db.execute(text("DROP TABLE IF EXISTS call_transcripts CASCADE;"))
        print("    ✅ call_transcripts table dropped")

        db.commit()
        print("✅ Migration 001_transcripts rolled back successfully\n")

    except Exception as e:
        db.rollback()
        print(f"❌ Rollback failed: {e}")
        raise
    finally:
        db.close()


def check_status():
    """
    Check if migration has been applied
    """
    db = SessionLocal()

    try:
        # Check if call_transcripts table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'call_transcripts'
            );
        """))
        transcripts_exists = result.scalar()

        # Check if transcript_segments table exists
        result = db.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'transcript_segments'
            );
        """))
        segments_exists = result.scalar()

        if transcripts_exists and segments_exists:
            # Get transcript count
            result = db.execute(text("SELECT COUNT(*) FROM call_transcripts;"))
            transcript_count = result.scalar()

            # Get segment count
            result = db.execute(text("SELECT COUNT(*) FROM transcript_segments;"))
            segment_count = result.scalar()

            print("✅ Migration 001_transcripts: APPLIED")
            print(f"   - {transcript_count} transcripts recorded")
            print(f"   - {segment_count} segments recorded")
        else:
            print("❌ Migration 001_transcripts: NOT APPLIED")
            if not transcripts_exists:
                print("   - call_transcripts table missing")
            if not segments_exists:
                print("   - transcript_segments table missing")

    except Exception as e:
        print(f"❌ Error checking migration status: {e}")
    finally:
        db.close()


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        command = sys.argv[1]
        if command == 'upgrade' or command == 'up':
            upgrade()
        elif command == 'downgrade' or command == 'down':
            downgrade()
        elif command == 'status':
            check_status()
        else:
            print(f"Unknown command: {command}")
            print("Usage: python migration_001_transcripts.py [upgrade|downgrade|status]")
    else:
        # Default: run upgrade
        upgrade()
