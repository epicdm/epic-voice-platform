#!/usr/bin/env python3
"""
Simple FreeSWITCH Migration Script
Migrates LiveKit from Magnus to FreeSWITCH using database-only approach
"""

import logging
import psycopg2
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# LiveKit Database Configuration
LIVEKIT_DB = {
    'host': 'localhost',
    'database': 'epic_voice_db',
    'user': 'postgres',
    'password': 'nXrRje4emjejjeKI009p'
}

# Phone numbers to migrate
PHONE_NUMBERS = [
    '+17678189426',
    '+17678189267'
]


def update_livekit_settings():
    """Update LiveKit admin settings to use FreeSWITCH"""
    logger.info("=" * 60)
    logger.info("FreeSWITCH Migration - Simple Approach")
    logger.info("=" * 60)
    logger.info("")
    logger.info("Step 1: Updating LiveKit Admin Settings...")

    try:
        conn = psycopg2.connect(**LIVEKIT_DB)
        cursor = conn.cursor()

        # Check current settings
        cursor.execute("""
            SELECT key, value
            FROM system_settings
            WHERE category = 'sip'
            ORDER BY key
        """)

        logger.info("\nCurrent SIP Settings:")
        current_settings = {}
        for row in cursor.fetchall():
            key, value = row
            current_settings[key] = value
            logger.info(f"  {key}: {value}")

        # Update to FreeSWITCH
        logger.info("\nUpdating settings to use FreeSWITCH...")

        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_domain'
        """, ('24.199.103.153',))

        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_port'
        """, ('5060',))

        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_transport'
        """, ('udp',))

        conn.commit()

        # Verify updates
        cursor.execute("""
            SELECT key, value
            FROM system_settings
            WHERE category = 'sip'
            ORDER BY key
        """)

        logger.info("\n✅ Settings Updated Successfully:")
        for row in cursor.fetchall():
            key, value = row
            logger.info(f"  {key}: {value}")

        cursor.close()
        conn.close()

        return True, current_settings

    except Exception as e:
        logger.error(f"❌ Failed to update settings: {e}")
        return False, {}


def rollback_settings(original_settings):
    """Rollback to original settings"""
    logger.info("\n" + "=" * 60)
    logger.info("Rolling Back to Original Settings")
    logger.info("=" * 60)

    try:
        conn = psycopg2.connect(**LIVEKIT_DB)
        cursor = conn.cursor()

        if 'sip_domain' in original_settings:
            cursor.execute("""
                UPDATE system_settings
                SET value = %s, updated_at = NOW()
                WHERE key = 'sip_domain'
            """, (original_settings['sip_domain'],))
            logger.info(f"✅ Restored sip_domain: {original_settings['sip_domain']}")

        conn.commit()
        cursor.close()
        conn.close()

        return True

    except Exception as e:
        logger.error(f"❌ Rollback failed: {e}")
        return False


def main():
    """Main migration function"""

    # Update LiveKit settings
    success, original_settings = update_livekit_settings()

    if not success:
        logger.error("\n❌ Migration failed!")
        return 1

    # Instructions for FreeSWITCH configuration
    logger.info("\n" + "=" * 60)
    logger.info("Step 2: Configure FreeSWITCH DID Routing")
    logger.info("=" * 60)
    logger.info("\nYou need to configure DID routing on FreeSWITCH server.")
    logger.info("Since Event Socket is not accessible remotely, you have 2 options:")
    logger.info("")
    logger.info("OPTION A: SSH to FreeSWITCH and create dialplan files")
    logger.info("-" * 60)
    logger.info("ssh root@24.199.103.153")
    logger.info("# Password: TAIOiEajqAl7H9vF4uXN")
    logger.info("")

    for phone in PHONE_NUMBERS:
        clean_phone = phone.replace('+', '').replace('-', '')
        filename = f"050_livekit_{clean_phone}.xml"

        logger.info(f"\n# Create route for {phone}")
        logger.info(f"cat > /etc/freeswitch/dialplan/public/{filename} << 'EOF'")
        logger.info("<include>")
        logger.info(f"  <extension name=\"LiveKit_DID_{clean_phone}\">")
        logger.info(f"    <condition field=\"destination_number\" expression=\"^(\\+?1?{clean_phone})$\">")
        logger.info("      <action application=\"set\" data=\"call_direction=inbound\"/>")
        logger.info(f"      <action application=\"set\" data=\"accountcode=livekit_{clean_phone}\"/>")
        logger.info(f"      <action application=\"log\" data=\"INFO Routing {phone} to LiveKit SIP\"/>")
        logger.info(f"      <action application=\"bridge\" data=\"sofia/external/{clean_phone}@3m4yki5jezn.sip.livekit.cloud\"/>")
        logger.info("      <action application=\"hangup\" data=\"NO_ANSWER\"/>")
        logger.info("    </condition>")
        logger.info("  </extension>")
        logger.info("</include>")
        logger.info("EOF")

    logger.info("\n# Reload FreeSWITCH")
    logger.info("fs_cli -x \"reloadxml\"")
    logger.info("")
    logger.info("OPTION B: Use FusionPBX Web Interface")
    logger.info("-" * 60)
    logger.info("1. Go to: https://billing.call.epic.dm")
    logger.info("2. Navigate to: Dialplan → Dialplan Manager")
    logger.info("3. Add new inbound route for each DID")
    logger.info(f"   - DIDs: {', '.join(PHONE_NUMBERS)}")
    logger.info("   - Destination: Bridge to LiveKit SIP")
    logger.info("   - Action: bridge sofia/external/<number>@3m4yki5jezn.sip.livekit.cloud")

    # Next steps
    logger.info("\n" + "=" * 60)
    logger.info("Step 3: Restart LiveKit Backend")
    logger.info("=" * 60)
    logger.info("\nsudo systemctl restart livekit-backend.service")
    logger.info("sudo systemctl status livekit-backend.service")

    logger.info("\n" + "=" * 60)
    logger.info("Step 4: Test Migration")
    logger.info("=" * 60)
    logger.info("\n1. Call +17678189426 from external phone")
    logger.info("   Expected: AI agent answers")
    logger.info("")
    logger.info("2. Monitor FreeSWITCH logs:")
    logger.info("   ssh root@24.199.103.153")
    logger.info("   tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit")
    logger.info("")
    logger.info("3. Monitor LiveKit logs:")
    logger.info("   sudo journalctl -u livekit-backend.service -f")

    logger.info("\n" + "=" * 60)
    logger.info("Rollback Plan (If Needed)")
    logger.info("=" * 60)
    logger.info("\nIf migration fails, run:")
    logger.info("  python3 migrate_simple.py --rollback")
    logger.info("")
    logger.info("Or manually:")
    logger.info(f"  Update sip_domain back to: {original_settings.get('sip_domain', 'voice.epic.dm')}")
    logger.info("  Restart LiveKit backend")

    logger.info("\n" + "=" * 60)
    logger.info("Migration Status")
    logger.info("=" * 60)
    logger.info("\n✅ LiveKit settings updated (sip_domain = 24.199.103.153)")
    logger.info("⏳ FreeSWITCH DID routing - Manual configuration required")
    logger.info("⏳ Backend restart - Required")
    logger.info("⏳ Testing - Required")
    logger.info("")
    logger.info("Next: Configure FreeSWITCH DIDs (see Option A or B above)")

    return 0


def rollback_main():
    """Rollback to Magnus"""

    # Get current settings first
    try:
        conn = psycopg2.connect(**LIVEKIT_DB)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT value FROM system_settings
            WHERE key = 'sip_domain'
        """)

        current_domain = cursor.fetchone()[0] if cursor.rowcount > 0 else 'unknown'

        cursor.close()
        conn.close()

        logger.info(f"Current sip_domain: {current_domain}")

    except Exception as e:
        logger.error(f"Could not check current settings: {e}")

    # Rollback to Magnus
    original_settings = {'sip_domain': 'voice.epic.dm'}

    if rollback_settings(original_settings):
        logger.info("\n✅ Rollback complete!")
        logger.info("\nNext steps:")
        logger.info("1. Restart LiveKit backend:")
        logger.info("   sudo systemctl restart livekit-backend.service")
        logger.info("")
        logger.info("2. Test call to verify Magnus is working:")
        logger.info("   Call +17678189426 → Should route via Magnus")
        return 0
    else:
        logger.error("\n❌ Rollback failed!")
        return 1


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        sys.exit(rollback_main())
    else:
        sys.exit(main())
