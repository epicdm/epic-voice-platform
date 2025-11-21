"""
Migration: Create system_settings table and initialize defaults

Run with: python -m backend.admin_settings.migration_001_system_settings
"""

import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from database import Base, SessionLocal
from backend.admin_settings.models import SystemSetting, DEFAULT_SETTINGS


def run_migration():
    """Create system_settings table and populate with defaults."""
    print("Running migration: Create system_settings table")

    # Create table
    from database import engine
    Base.metadata.create_all(engine, tables=[SystemSetting.__table__])
    print("✅ Created system_settings table")

    # Initialize with default settings
    db = SessionLocal()
    try:
        # Check if settings already exist
        existing_count = db.query(SystemSetting).count()
        if existing_count > 0:
            print(f"⚠️  Settings already exist ({existing_count} settings found). Skipping initialization.")
            print("   To reset, manually delete from system_settings table first.")
            return

        # Load values from environment variables
        env_mapping = {
            'sip_domain': 'EPIC_SIP_DOMAIN',
            'sip_transport': 'EPIC_SIP_TRANSPORT',
            'livekit_sip_domain': 'LIVEKIT_SIP_DOMAIN',
            'sip_outbound_trunk_id': 'SIP_OUTBOUND_TRUNK_ID',
            'smtp_host': 'SMTP_HOST',
            'smtp_port': 'SMTP_PORT',
            'smtp_user': 'SMTP_USER',
            'smtp_password': 'SMTP_PASSWORD',
            'livekit_url': 'LIVEKIT_URL',
            'livekit_api_key': 'LIVEKIT_API_KEY',
            'livekit_api_secret': 'LIVEKIT_API_SECRET',
            'livekit_webhook_secret': 'LIVEKIT_WEBHOOK_SECRET',
        }

        # Create settings from defaults
        for setting_data in DEFAULT_SETTINGS:
            # Override with environment variable if exists
            key = setting_data['key']
            if key in env_mapping:
                env_value = os.getenv(env_mapping[key])
                if env_value:
                    setting_data['value'] = env_value

            setting = SystemSetting(**setting_data)
            db.add(setting)

        db.commit()
        print(f"✅ Initialized {len(DEFAULT_SETTINGS)} default settings")

        # Print summary by category
        print("\nSettings by category:")
        categories = db.query(SystemSetting.category).distinct().all()
        for (category,) in categories:
            count = db.query(SystemSetting).filter(SystemSetting.category == category).count()
            print(f"  - {category}: {count} settings")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during migration: {e}")
        raise
    finally:
        db.close()


if __name__ == '__main__':
    run_migration()
