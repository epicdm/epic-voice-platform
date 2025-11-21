#!/usr/bin/env python3
import os
import sqlite3
from dotenv import load_dotenv

load_dotenv('/opt/livekit1/.env')

print("=" * 80)
print("COMPREHENSIVE LIVEKIT & VoIP CONFIGURATION AUDIT")
print("=" * 80)

print("\n1. ENVIRONMENT VARIABLES")
print("-" * 80)
print(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL')}")
print(f"LIVEKIT_API_KEY: {os.getenv('LIVEKIT_API_KEY')}")
print(f"LIVEKIT_API_SECRET: {'SET' if os.getenv('LIVEKIT_API_SECRET') else 'NOT SET'}")
print(f"SIP_OUTBOUND_TRUNK_ID: {os.getenv('SIP_OUTBOUND_TRUNK_ID')}")
print(f"EPIC_SIP_DOMAIN: {os.getenv('EPIC_SIP_DOMAIN', 'NOT SET')}")
print(f"EPIC_SIP_TRANSPORT: {os.getenv('EPIC_SIP_TRANSPORT', 'NOT SET')}")

print("\n2. LIVEKIT CLOUD CONFIGURATION")
print("-" * 80)
print("OUTBOUND TRUNK:")
print("  - Trunk ID: ST_sTo8gGpNbXzY")
print("  - Name: epic-agent-outbound")
print("  - Address: voice.epic.dm")
print("  - Transport: TCP")
print("  - Auth Username: livekit")
print("  - Auth Password: werwqerwqrwq555")
print("  - Numbers: [+17678183366]")

print("\nINBOUND TRUNK:")
print("  - Trunk ID: ST_xkAxBhmf4pbR")
print("  - Name: epic-agent-inbound")
print("  - Numbers: [+17678183366]")

print("\nDISPATCH RULES:")
print("  - Rule ID: SDR_DfEXS4tojwWo")
print("  - Type: Individual")
print("  - Room Prefix: sip-call")

print("\n3. DATABASE CONFIGURATION")
print("-" * 80)

conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()

cursor.execute('SELECT COUNT(*) FROM sip_configs')
sip_config_count = cursor.fetchone()[0]
print(f"SIP Configs Count: {sip_config_count}")

cursor.execute('SELECT id, name, trunk_id, sip_url FROM sip_configs')
for config in cursor.fetchall():
    print(f"  - {config[1]}: trunk={config[2]}, url={config[3]}")

cursor.execute('SELECT COUNT(*) FROM phone_mappings')
phone_count = cursor.fetchone()[0]
print(f"\nPhone Mappings Count: {phone_count}")

cursor.execute('SELECT phone_number, sip_trunk_id FROM phone_mappings')
for mapping in cursor.fetchall():
    print(f"  - {mapping[0]}: trunk={mapping[1] or 'NONE'}")

cursor.execute('SELECT COUNT(*) FROM agent_configs WHERE status="deployed"')
deployed_count = cursor.fetchone()[0]
print(f"\nDeployed Agents Count: {deployed_count}")

print("\n4. CONFIGURATION ISSUES DETECTED")
print("-" * 80)

issues = []

# Check for duplicate SIP configs
if sip_config_count > 1:
    issues.append(f"⚠️  DUPLICATE SIP CONFIGS: {sip_config_count} configs found (should be 1 per user)")

# Check for phone mappings without trunk IDs
cursor.execute('SELECT COUNT(*) FROM phone_mappings WHERE sip_trunk_id IS NULL OR sip_trunk_id = ""')
missing_trunks = cursor.fetchone()[0]
if missing_trunks > 0:
    issues.append(f"⚠️  MISSING TRUNK IDs: {missing_trunks} phone mappings have no trunk ID")

# Check for deployed agents
if deployed_count == 0:
    issues.append("⚠️  NO DEPLOYED AGENTS: No agents are currently deployed to handle calls")

# Check environment vs database mismatch
env_trunk = os.getenv('SIP_OUTBOUND_TRUNK_ID')
cursor.execute('SELECT DISTINCT trunk_id FROM sip_configs')
db_trunks = [row[0] for row in cursor.fetchall()]
if env_trunk not in db_trunks:
    issues.append(f"⚠️  ENV/DB MISMATCH: .env has trunk {env_trunk} but DB has {db_trunks}")

if issues:
    for issue in issues:
        print(issue)
else:
    print("✅ No obvious configuration issues detected")

print("\n5. VOIP SERVER CONNECTIVITY CHECK")
print("-" * 80)
import socket
try:
    # Try to resolve voice.epic.dm
    ip = socket.gethostbyname('voice.epic.dm')
    print(f"✅ voice.epic.dm resolves to: {ip}")
    
    # Try to connect to SIP port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    result = sock.connect_ex(('voice.epic.dm', 5060))
    if result == 0:
        print(f"✅ TCP connection to voice.epic.dm:5060 successful!")
    else:
        print(f"⚠️  Cannot connect to voice.epic.dm:5060 (Error: {result})")
    sock.close()
except Exception as e:
    print(f"❌ Error checking VoIP connectivity: {e}")

print("\n6. RECOMMENDATIONS")
print("-" * 80)
print("Based on the audit, you should:")
if sip_config_count > 1:
    print("  1. ✅ CLEAN duplicate SIP configs")
if missing_trunks > 0:
    print("  2. ✅ FIX phone mappings with missing trunk IDs")
if deployed_count == 0:
    print("  3. ✅ DEPLOY an agent to handle calls")
print("  4. ✅ VERIFY LiveKit can reach voice.epic.dm:5060")
print("  5. ✅ TEST with a simple outbound call")

conn.close()
