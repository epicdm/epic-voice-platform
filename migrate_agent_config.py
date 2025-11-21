"""
Database Migration Script: Add Advanced Agent Configuration Fields
Adds new columns to agent_configs table for full LiveKit configuration support.
"""

import sqlite3
import os
from datetime import datetime

DATABASE_PATH = os.getenv('DATABASE_URL', 'sqlite:///./voice_agents.db').replace('sqlite:///', '')

def migrate_database():
    """Add new columns to agent_configs table."""

    print("🔄 Starting database migration...")
    print(f"📂 Database: {DATABASE_PATH}")

    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Get existing columns
    cursor.execute("PRAGMA table_info(agent_configs)")
    existing_columns = {row[1] for row in cursor.fetchall()}
    print(f"📋 Existing columns: {len(existing_columns)}")

    migrations = [
        # Core Configuration
        ("agent_mode", "TEXT DEFAULT 'standard'"),

        # LLM Configuration
        ("llm_provider", "TEXT DEFAULT 'openai'"),

        # STT Configuration
        ("stt_provider", "TEXT DEFAULT 'deepgram'"),
        ("stt_model", "TEXT DEFAULT 'nova-2'"),
        ("stt_language", "TEXT DEFAULT 'en'"),

        # TTS Configuration
        ("tts_provider", "TEXT DEFAULT 'openai'"),
        ("tts_model", "TEXT"),
        ("tts_voice_id", "TEXT"),

        # Realtime API Configuration
        ("realtime_voice", "TEXT DEFAULT 'alloy'"),

        # VAD Configuration
        ("vad_enabled", "INTEGER DEFAULT 1"),
        ("vad_provider", "TEXT DEFAULT 'silero'"),

        # Turn Detection
        ("turn_detection_model", "TEXT DEFAULT 'multilingual'"),

        # Noise Cancellation
        ("noise_cancellation_enabled", "INTEGER DEFAULT 1"),
        ("noise_cancellation_type", "TEXT DEFAULT 'BVC'"),

        # Advanced Session Options
        ("preemptive_generation", "INTEGER DEFAULT 0"),
        ("resume_false_interruption", "INTEGER DEFAULT 0"),
        ("false_interruption_timeout", "REAL DEFAULT 1.0"),
        ("min_interruption_duration", "REAL DEFAULT 0.2"),

        # Greeting Configuration
        ("greeting_enabled", "INTEGER DEFAULT 1"),
        ("greeting_message", "TEXT"),
    ]

    added_count = 0
    skipped_count = 0

    for column_name, column_def in migrations:
        if column_name in existing_columns:
            print(f"  ⏭️  Skipping {column_name} (already exists)")
            skipped_count += 1
            continue

        try:
            sql = f"ALTER TABLE agent_configs ADD COLUMN {column_name} {column_def}"
            cursor.execute(sql)
            print(f"  ✅ Added column: {column_name}")
            added_count += 1
        except sqlite3.OperationalError as e:
            print(f"  ⚠️  Error adding {column_name}: {e}")

    conn.commit()
    conn.close()

    print(f"\n✨ Migration complete!")
    print(f"   Added: {added_count} new columns")
    print(f"   Skipped: {skipped_count} existing columns")
    print(f"   Total columns: {len(existing_columns) + added_count}")

    # Verify migration
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(agent_configs)")
    final_columns = cursor.fetchall()
    conn.close()

    print(f"\n📊 Final schema:")
    for col in final_columns:
        col_id, name, type_name, notnull, default, pk = col
        print(f"   {name:30} {type_name:15} {f'DEFAULT {default}' if default else ''}")

def backup_database():
    """Create a backup of the database before migration."""
    if not os.path.exists(DATABASE_PATH):
        print("⚠️  Database doesn't exist yet, skipping backup")
        return None

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"{DATABASE_PATH}.backup_{timestamp}"

    try:
        import shutil
        shutil.copy2(DATABASE_PATH, backup_path)
        print(f"💾 Backup created: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"⚠️  Backup failed: {e}")
        return None

if __name__ == "__main__":
    print("=" * 60)
    print("  Agent Configuration Migration")
    print("  Adds advanced LiveKit configuration fields")
    print("=" * 60)
    print()

    # Create backup
    backup_path = backup_database()
    if backup_path:
        print(f"✅ Backup saved to: {backup_path}")
        print()

    # Run migration
    try:
        migrate_database()
        print("\n✅ Migration successful!")
        print("\n🚀 Next steps:")
        print("   1. Restart the Flask backend: pkill -f user_dashboard && uv run python user_dashboard.py")
        print("   2. Test creating/editing agents in the GUI")
        print("   3. Verify existing agents still work")
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        if backup_path:
            print(f"   You can restore from backup: {backup_path}")
        raise
