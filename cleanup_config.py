#!/usr/bin/env python3
"""
Clean up LiveKit SIP configuration issues
This script will:
1. Remove duplicate SIP configs
2. Update phone mappings with proper trunk IDs
3. Sync database with LiveKit Cloud configuration
"""

import sqlite3
import sys

def cleanup_database():
    conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
    cursor = conn.cursor()
    
    print("=" * 80)
    print("CLEANING UP CONFIGURATION")
    print("=" * 80)
    
    # 1. Remove duplicate SIP configs (keep only one per user)
    print("\n1. Removing duplicate SIP configs...")
    cursor.execute('''
        SELECT id, user_id, created_at 
        FROM sip_configs 
        ORDER BY created_at ASC
    ''')
    configs = cursor.fetchall()
    
    users_seen = set()
    configs_to_delete = []
    
    for config_id, user_id, created_at in configs:
        if user_id in users_seen:
            configs_to_delete.append(config_id)
            print(f"   - Marking duplicate config {config_id} for deletion")
        else:
            users_seen.add(user_id)
            print(f"   - Keeping config {config_id} for user {user_id}")
    
    for config_id in configs_to_delete:
        cursor.execute('DELETE FROM sip_configs WHERE id = ?', (config_id,))
        print(f"   ✅ Deleted duplicate config {config_id}")
    
    # 2. Update phone mappings with missing trunk IDs
    print("\n2. Updating phone mappings with trunk IDs...")
    cursor.execute('''
        SELECT id, phone_number, sip_trunk_id 
        FROM phone_mappings 
        WHERE sip_trunk_id IS NULL OR sip_trunk_id = ""
    ''')
    mappings_to_fix = cursor.fetchall()
    
    for mapping_id, phone_number, trunk_id in mappings_to_fix:
        # Use outbound trunk for phone numbers
        new_trunk_id = 'ST_sTo8gGpNbXzY'  # Outbound trunk
        cursor.execute('''
            UPDATE phone_mappings 
            SET sip_trunk_id = ? 
            WHERE id = ?
        ''', (new_trunk_id, mapping_id))
        print(f"   ✅ Updated {phone_number} with trunk {new_trunk_id}")
    
    # 3. Update SIP configs to include auth credentials
    print("\n3. Updating SIP configs with auth credentials...")
    cursor.execute('''
        UPDATE sip_configs 
        SET sip_username = 'livekit',
            sip_password = 'werwqerwqrwq555'
        WHERE sip_username IS NULL
    ''')
    print(f"   ✅ Updated SIP configs with auth credentials")
    
    # Commit all changes
    conn.commit()
    
    # 4. Verify cleanup
    print("\n4. Verifying cleanup...")
    cursor.execute('SELECT COUNT(*) FROM sip_configs')
    sip_count = cursor.fetchone()[0]
    print(f"   - SIP Configs: {sip_count}")
    
    cursor.execute('SELECT COUNT(*) FROM phone_mappings WHERE sip_trunk_id IS NULL OR sip_trunk_id = ""')
    missing_trunk_count = cursor.fetchone()[0]
    print(f"   - Phone mappings without trunk ID: {missing_trunk_count}")
    
    conn.close()
    
    print("\n✅ Cleanup complete!")
    print("=" * 80)
    
    return sip_count, missing_trunk_count

if __name__ == "__main__":
    print("This will clean up your LiveKit configuration.")
    print("Press Ctrl+C to cancel, or press Enter to continue...")
    try:
        input()
        sip_count, missing_count = cleanup_database()
        
        if sip_count <= 2 and missing_count == 0:
            print("\n✅ Configuration is now clean!")
            print("\nNext steps:")
            print("1. Deploy an agent from the UI")
            print("2. Test an outbound call to +17672958382")
            print("3. Check your VoIP server logs to confirm call reception")
        else:
            print("\n⚠️  Some issues remain. Please review the output above.")
            
    except KeyboardInterrupt:
        print("\n\nCleanup cancelled.")
        sys.exit(1)
