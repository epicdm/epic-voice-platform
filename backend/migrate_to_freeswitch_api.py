#!/usr/bin/env python3
"""
Magnus to FreeSWITCH Migration Script (API-Based)
Migrates LiveKit from Magnus Billing to FreeSWITCH using APIs
"""

import sys
import logging
from datetime import datetime
from typing import List, Dict
import psycopg2

# Add backend to path
sys.path.insert(0, '/opt/livekit1/backend')

from freeswitch_api_client import FreeSWITCHAPIClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ==================== CONFIGURATION ====================

# FreeSWITCH API Configuration
FREESWITCH_CONFIG = {
    'base_url': 'https://billing.call.epic.dm',
    'api_token': None,  # Set if using token auth
    'username': None,  # Set if using session auth
    'password': None,  # Set if using session auth
    'event_socket_host': '24.199.103.153',
    'event_socket_port': 8021,
    'event_socket_password': 'ClueCon'
}

# LiveKit Database Configuration
LIVEKIT_DB_CONFIG = {
    'host': 'localhost',
    'database': 'epic_voice_db',
    'user': 'postgres',
    'password': 'nXrRje4emjejjeKI009p'
}

# FreeSWITCH Database Configuration (for direct CDR sync)
FREESWITCH_DB_CONFIG = {
    'host': '24.199.103.153',
    'database': 'fusionpbx',
    'user': 'fusionpbx',
    'password': '9GGTVplZI0wqAndvMxNS'
}

# Phone numbers to migrate
PHONE_NUMBERS_TO_MIGRATE = [
    '+17678189426',
    '+17678189267'
]

# LiveKit SIP domain
LIVEKIT_SIP_DOMAIN = '3m4yki5jezn.sip.livekit.cloud'


# ==================== MIGRATION FUNCTIONS ====================

def test_connectivity(client: FreeSWITCHAPIClient) -> bool:
    """
    Test connectivity to FreeSWITCH

    Args:
        client: FreeSWITCH API client

    Returns:
        True if connected successfully
    """
    logger.info("Testing FreeSWITCH connectivity...")

    try:
        # Test Event Socket
        status = client.get_status()
        logger.info(f"✅ Event Socket connected: {status[:100]}...")

        # Test SIP status
        sofia_status = client.sofia_status()
        logger.info(f"✅ SIP profiles active")

        return True

    except Exception as e:
        logger.error(f"❌ Connectivity test failed: {e}")
        return False


def migrate_did_routing(
    client: FreeSWITCHAPIClient,
    phone_numbers: List[str]
) -> Dict[str, bool]:
    """
    Migrate DID routing to LiveKit

    Args:
        client: FreeSWITCH API client
        phone_numbers: List of phone numbers to migrate

    Returns:
        Dictionary of phone_number -> success
    """
    logger.info(f"Migrating {len(phone_numbers)} DIDs to LiveKit routing...")

    results = {}

    for phone in phone_numbers:
        try:
            # Clean phone number
            clean_phone = phone.replace('+', '').replace('-', '')

            # Create SIP destination
            destination = f"{clean_phone}@{LIVEKIT_SIP_DOMAIN}"

            logger.info(f"Creating route: {phone} → {destination}")

            # Create inbound route using API
            route_result = client.create_inbound_route(
                did=phone,
                destination=destination,
                description=f"LiveKit AI Agent - {phone}",
                enabled=True
            )

            logger.info(f"✅ Route created for {phone}")
            logger.info(f"   Dialplan XML: {route_result.get('dialplan_xml', '')[:100]}...")

            results[phone] = True

        except Exception as e:
            logger.error(f"❌ Failed to create route for {phone}: {e}")
            results[phone] = False

    # Reload dialplan
    try:
        logger.info("Reloading FreeSWITCH dialplan...")
        reload_output = client.reload_dialplan()
        logger.info(f"✅ Dialplan reloaded: {reload_output[:100]}")
    except Exception as e:
        logger.error(f"⚠️  Warning: Failed to reload dialplan: {e}")

    return results


def update_livekit_settings() -> bool:
    """
    Update LiveKit admin settings to use FreeSWITCH

    Returns:
        True if updated successfully
    """
    logger.info("Updating LiveKit admin settings...")

    try:
        conn = psycopg2.connect(**LIVEKIT_DB_CONFIG)
        cursor = conn.cursor()

        # Update SIP domain
        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_domain'
        """, ('24.199.103.153',))

        # Update SIP port (if needed)
        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_port'
        """, ('5060',))

        # Update SIP transport (if needed)
        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_transport'
        """, ('udp',))

        conn.commit()

        logger.info("✅ LiveKit settings updated")
        logger.info("   sip_domain: 24.199.103.153")
        logger.info("   sip_port: 5060")
        logger.info("   sip_transport: udp")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        logger.error(f"❌ Failed to update LiveKit settings: {e}")
        return False


def test_inbound_routing(client: FreeSWITCHAPIClient, phone_numbers: List[str]) -> Dict[str, bool]:
    """
    Test inbound routing for phone numbers

    Args:
        client: FreeSWITCH API client
        phone_numbers: List of phone numbers to test

    Returns:
        Dictionary of phone_number -> test result
    """
    logger.info("Testing inbound routing...")

    results = {}

    for phone in phone_numbers:
        try:
            # Clean phone number
            clean_phone = phone.replace('+', '').replace('-', '')

            # Test dialplan lookup via Event Socket
            command = f"api xml_locate dialplan public {clean_phone}"
            output = client._event_socket_command(command)

            if f"LiveKit_DID_{clean_phone}" in output or "bridge" in output:
                logger.info(f"✅ Route verified for {phone}")
                results[phone] = True
            else:
                logger.warning(f"⚠️  Route not found for {phone}")
                results[phone] = False

        except Exception as e:
            logger.error(f"❌ Failed to test route for {phone}: {e}")
            results[phone] = False

    return results


def sync_cdrs(since_minutes: int = 60) -> int:
    """
    Sync CDRs from FreeSWITCH to LiveKit

    Args:
        since_minutes: Sync CDRs from last N minutes

    Returns:
        Number of CDRs synced
    """
    logger.info(f"Syncing CDRs from last {since_minutes} minutes...")

    try:
        # Connect to FreeSWITCH DB
        fs_conn = psycopg2.connect(**FREESWITCH_DB_CONFIG)
        fs_cursor = fs_conn.cursor()

        # Connect to LiveKit DB
        lk_conn = psycopg2.connect(**LIVEKIT_DB_CONFIG)
        lk_cursor = lk_conn.cursor()

        # Fetch recent CDRs
        fs_cursor.execute("""
            SELECT
                uuid,
                caller_id_number,
                destination_number,
                direction,
                start_stamp,
                answer_stamp,
                end_stamp,
                duration,
                billsec,
                hangup_cause,
                accountcode
            FROM v_xml_cdr
            WHERE start_stamp >= NOW() - INTERVAL '%s minutes'
              AND (accountcode LIKE 'livekit%%' OR destination_number IN %s)
            ORDER BY start_stamp DESC
        """, (since_minutes, tuple(PHONE_NUMBERS_TO_MIGRATE)))

        synced_count = 0

        for row in fs_cursor:
            (uuid, caller, called, direction, start_time, answer_time,
             end_time, duration, billsec, hangup_cause, accountcode) = row

            # Check if already synced
            lk_cursor.execute("""
                SELECT id FROM call_logs
                WHERE external_call_id = %s
            """, (uuid,))

            if lk_cursor.fetchone():
                continue  # Already synced

            # Insert into LiveKit call_logs
            lk_cursor.execute("""
                INSERT INTO call_logs (
                    external_call_id,
                    from_number,
                    to_number,
                    direction,
                    status,
                    started_at,
                    answered_at,
                    ended_at,
                    duration_seconds,
                    created_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (external_call_id) DO NOTHING
            """, (
                uuid,
                caller,
                called,
                direction,
                'completed' if hangup_cause == 'NORMAL_CLEARING' else 'failed',
                start_time,
                answer_time,
                end_time,
                billsec
            ))

            synced_count += 1

        lk_conn.commit()

        logger.info(f"✅ Synced {synced_count} CDRs to LiveKit")

        fs_cursor.close()
        fs_conn.close()
        lk_cursor.close()
        lk_conn.close()

        return synced_count

    except Exception as e:
        logger.error(f"❌ CDR sync failed: {e}")
        return 0


def rollback_migration() -> bool:
    """
    Rollback migration - revert to Magnus

    Returns:
        True if rollback successful
    """
    logger.info("Rolling back to Magnus Billing...")

    try:
        conn = psycopg2.connect(**LIVEKIT_DB_CONFIG)
        cursor = conn.cursor()

        # Revert SIP domain to Magnus
        cursor.execute("""
            UPDATE system_settings
            SET value = %s, updated_at = NOW()
            WHERE key = 'sip_domain'
        """, ('voice.epic.dm',))

        conn.commit()
        cursor.close()
        conn.close()

        logger.info("✅ Rolled back to Magnus Billing (voice.epic.dm)")
        logger.info("   Restart LiveKit backend to apply changes")

        return True

    except Exception as e:
        logger.error(f"❌ Rollback failed: {e}")
        return False


# ==================== MAIN MIGRATION SCRIPT ====================

def main():
    """Main migration script"""

    logger.info("=" * 60)
    logger.info("FreeSWITCH Migration Script (API-Based)")
    logger.info("=" * 60)

    # Initialize FreeSWITCH client
    logger.info("Initializing FreeSWITCH API client...")
    client = FreeSWITCHAPIClient(**FREESWITCH_CONFIG)

    # Phase 1: Test connectivity
    logger.info("\n--- Phase 1: Connectivity Test ---")
    if not test_connectivity(client):
        logger.error("❌ Connectivity test failed. Aborting migration.")
        return 1

    # Phase 2: Migrate DID routing
    logger.info("\n--- Phase 2: Migrate DID Routing ---")
    routing_results = migrate_did_routing(client, PHONE_NUMBERS_TO_MIGRATE)

    failed_dids = [did for did, success in routing_results.items() if not success]
    if failed_dids:
        logger.error(f"❌ Failed to migrate DIDs: {failed_dids}")
        logger.info("You can continue manually or fix and re-run")

    # Phase 3: Update LiveKit settings
    logger.info("\n--- Phase 3: Update LiveKit Settings ---")
    if not update_livekit_settings():
        logger.error("❌ Failed to update LiveKit settings")
        logger.info("Manual update required:")
        logger.info("  1. Go to: http://localhost:3000/dashboard/admin/system-settings")
        logger.info("  2. Change sip_domain to: 24.199.103.153")

    # Phase 4: Test routing
    logger.info("\n--- Phase 4: Test Inbound Routing ---")
    test_results = test_inbound_routing(client, PHONE_NUMBERS_TO_MIGRATE)

    # Phase 5: Sync CDRs
    logger.info("\n--- Phase 5: Sync CDRs ---")
    synced_count = sync_cdrs(since_minutes=1440)  # Last 24 hours

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Migration Summary")
    logger.info("=" * 60)

    for phone in PHONE_NUMBERS_TO_MIGRATE:
        route_status = "✅" if routing_results.get(phone) else "❌"
        test_status = "✅" if test_results.get(phone) else "❌"
        logger.info(f"{phone}:")
        logger.info(f"  Route Created: {route_status}")
        logger.info(f"  Route Verified: {test_status}")

    logger.info(f"\nCDRs Synced: {synced_count}")

    # Next steps
    logger.info("\n--- Next Steps ---")
    logger.info("1. Restart LiveKit backend:")
    logger.info("   sudo systemctl restart livekit-backend.service")
    logger.info("")
    logger.info("2. Test inbound call:")
    logger.info(f"   Call {PHONE_NUMBERS_TO_MIGRATE[0]} from external phone")
    logger.info("   Expected: AI agent answers")
    logger.info("")
    logger.info("3. Monitor logs:")
    logger.info("   FreeSWITCH: tail -f /var/log/freeswitch/freeswitch.log | grep livekit")
    logger.info("   LiveKit: sudo journalctl -u livekit-backend.service -f")
    logger.info("")
    logger.info("4. If issues occur, rollback:")
    logger.info("   python3 migrate_to_freeswitch_api.py --rollback")

    logger.info("\n✅ Migration complete!")
    return 0


def rollback():
    """Rollback command"""
    logger.info("=" * 60)
    logger.info("Rolling Back Migration")
    logger.info("=" * 60)

    if rollback_migration():
        logger.info("\n✅ Rollback complete!")
        logger.info("Restart LiveKit backend:")
        logger.info("  sudo systemctl restart livekit-backend.service")
        return 0
    else:
        logger.error("\n❌ Rollback failed!")
        return 1


if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == '--rollback':
        sys.exit(rollback())
    else:
        sys.exit(main())
