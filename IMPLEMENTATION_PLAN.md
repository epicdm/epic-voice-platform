# FreeSWITCH Migration - Implementation Plan

**Date**: November 16, 2025
**Estimated Time**: 2-3 hours
**Status**: ✅ **READY TO EXECUTE**

---

## Overview

This plan migrates your LiveKit system from Magnus Billing to FreeSWITCH for SIP trunking. The migration is **low-risk** with a **rollback plan** available.

**What Changes:**
- SIP trunk provider (Magnus → FreeSWITCH)
- DID routing (Magnus API → FreeSWITCH dialplan)
- CDR source (Magnus API → FreeSWITCH database)

**What Stays the Same:**
- Phone numbers (+17678189426, +17678189267)
- LiveKit SIP domain (3m4yki5jezn.sip.livekit.cloud)
- AI agents
- Frontend dashboard

---

## Phase 1: Inbound DID Routing (CRITICAL)

**Goal**: Route +17678189426 and +17678189267 from FreeSWITCH to LiveKit AI agents

**Time**: 1 hour

### Step 1.1: Create DID Route for +17678189426

**On FreeSWITCH Server (24.199.103.153):**

```bash
# SSH to FreeSWITCH
ssh root@24.199.103.153
# Password: TAIOiEajqAl7H9vF4uXN

# Create dialplan file
cat > /etc/freeswitch/dialplan/public/050_livekit_17678189426.xml << 'EOF'
<include>
  <extension name="LiveKit_DID_17678189426">
    <condition field="destination_number" expression="^(\+?1?7678189426)$">
      <!-- Mark as inbound call -->
      <action application="set" data="call_direction=inbound"/>

      <!-- Set accountcode for CDR tracking -->
      <action application="set" data="accountcode=livekit_17678189426"/>

      <!-- Log the routing -->
      <action application="log" data="INFO Routing +17678189426 to LiveKit SIP"/>

      <!-- Bridge to LiveKit SIP endpoint -->
      <action application="bridge" data="sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud"/>

      <!-- If bridge fails, log and hangup -->
      <action application="log" data="ERROR Failed to bridge to LiveKit for +17678189426"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>
EOF

# Verify file created
cat /etc/freeswitch/dialplan/public/050_livekit_17678189426.xml
```

### Step 1.2: Create DID Route for +17678189267

```bash
# Create dialplan file
cat > /etc/freeswitch/dialplan/public/051_livekit_17678189267.xml << 'EOF'
<include>
  <extension name="LiveKit_DID_17678189267">
    <condition field="destination_number" expression="^(\+?1?7678189267)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189267"/>
      <action application="log" data="INFO Routing +17678189267 to LiveKit SIP"/>
      <action application="bridge" data="sofia/external/17678189267@3m4yki5jezn.sip.livekit.cloud"/>
      <action application="log" data="ERROR Failed to bridge to LiveKit for +17678189267"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>
EOF

# Verify
cat /etc/freeswitch/dialplan/public/051_livekit_17678189267.xml
```

### Step 1.3: Reload FreeSWITCH Configuration

```bash
# Reload XML dialplan
fs_cli -x "reloadxml"

# Expected output: "+OK [Success]"

# Verify routes loaded
fs_cli -x "xml_locate dialplan public 17678189426"
fs_cli -x "xml_locate dialplan public 17678189267"

# Expected: Should show the extension XML we created
```

### Step 1.4: Test Inbound Routing

**Option A: Manual Test Call**
```bash
# Call +17678189426 from your phone
# Expected:
# - FreeSWITCH receives call
# - Routes to LiveKit
# - AI agent answers
```

**Option B: FreeSWITCH Console Test**
```bash
# Monitor logs in real-time
fs_cli -x "console loglevel debug"

# In another terminal, watch logs
tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit

# Make a test call and watch the routing
```

**Success Criteria:**
- ✅ Call reaches LiveKit AI agent
- ✅ Agent responds with greeting
- ✅ Audio quality is clear
- ✅ CDR captured in `v_xml_cdr` table

---

## Phase 2: Outbound Call Routing

**Goal**: Allow LiveKit to send outbound calls through FreeSWITCH

**Time**: 30 minutes

### Step 2.1: Create Outbound Accept Rule

**On FreeSWITCH Server:**

```bash
# Create dialplan to accept calls FROM LiveKit
cat > /etc/freeswitch/dialplan/public/075_livekit_outbound.xml << 'EOF'
<include>
  <extension name="livekit_outbound_routing">
    <!-- Only accept calls from LiveKit IP -->
    <condition field="${network_addr}" expression="^134\.199\.197\.42$">
      <!-- Match 10-digit USA numbers -->
      <condition field="destination_number" expression="^(\+?1?(\d{10}))$">
        <action application="set" data="call_direction=outbound"/>
        <action application="set" data="accountcode=livekit_outbound_${sip_from_user}"/>
        <action application="log" data="INFO Outbound call from LiveKit to $1"/>

        <!-- Transfer to existing outbound routing (Vitelity/Local Trunk) -->
        <action application="transfer" data="$2 XML public"/>
      </condition>
    </condition>

    <!-- Reject calls from other IPs -->
    <condition field="${network_addr}" expression="^134\.199\.197\.42$" break="never">
      <anti-action application="log" data="WARNING Rejected outbound call from unauthorized IP ${network_addr}"/>
      <anti-action application="respond" data="403 Forbidden"/>
    </condition>
  </extension>
</include>
EOF

# Verify
cat /etc/freeswitch/dialplan/public/075_livekit_outbound.xml
```

### Step 2.2: Reload and Test

```bash
# Reload
fs_cli -x "reloadxml"

# Verify loaded
fs_cli -x "xml_locate dialplan public 15551234567"
```

**Test Outbound (from LiveKit):**
```bash
# On LiveKit server, trigger outbound call
# This will be tested in Phase 4
```

---

## Phase 3: LiveKit Configuration Update

**Goal**: Update LiveKit to use FreeSWITCH instead of Magnus

**Time**: 15 minutes

### Step 3.1: Update Admin Settings via Web UI

**URL**: http://localhost:3000/dashboard/admin/system-settings

**Changes:**
1. Click "SIP Trunk" tab
2. Update settings:
   - `sip_domain`: Change from `voice.epic.dm` to `24.199.103.153`
   - `sip_transport`: `udp` (or `tcp`)
   - `sip_port`: `5060`
3. Click "Test SIP Connection"
4. If successful, click "Save Changes"

### Step 3.2: Update via Database (Alternative)

**On LiveKit Server:**

```bash
# Update SIP settings in database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db << 'EOF'
-- Update SIP domain
UPDATE system_settings
SET value = '24.199.103.153', updated_at = NOW()
WHERE key = 'sip_domain';

-- Verify change
SELECT key, value FROM system_settings WHERE category = 'sip';
EOF
```

### Step 3.3: Restart LiveKit Backend (if needed)

```bash
# Only if settings don't hot-reload
sudo systemctl restart livekit-backend.service

# Verify status
sudo systemctl status livekit-backend.service
```

---

## Phase 4: End-to-End Testing

**Goal**: Verify complete call flow works

**Time**: 30 minutes

### Test 1: Inbound Call Flow

**Steps:**
1. Call +17678189426 from external phone
2. Verify AI agent answers
3. Have conversation
4. Hang up

**Monitoring (FreeSWITCH):**
```bash
# On FreeSWITCH server
ssh root@24.199.103.153

# Monitor calls in real-time
fs_cli -x "show calls"

# Monitor logs
tail -f /var/log/freeswitch/freeswitch.log | grep -E "(17678189426|livekit)"
```

**Monitoring (LiveKit):**
```bash
# On LiveKit server
sudo journalctl -u livekit-backend.service -f | grep -i sip
```

**Success Criteria:**
- ✅ Call connects within 3 seconds
- ✅ AI agent greets caller
- ✅ Audio clear, no echo/delay
- ✅ Latency < 200ms

### Test 2: Outbound Call Flow

**Steps:**
1. Trigger outbound call from LiveKit (via AI agent tool or API)
2. Verify call reaches recipient
3. Verify audio quality

**API Test (LiveKit):**
```bash
# On LiveKit server
curl -X POST 'http://localhost:5001/api/calls/outbound' \
  -H 'Content-Type: application/json' \
  -d '{
    "agent_config_id": 1,
    "to_number": "+15551234567",
    "from_number": "+17678189426"
  }'
```

**Success Criteria:**
- ✅ Call initiated by LiveKit
- ✅ FreeSWITCH receives call from 134.199.197.42
- ✅ FreeSWITCH routes to Vitelity/Local Trunk
- ✅ Recipient phone rings
- ✅ Audio clear both directions

### Test 3: CDR Verification

**Check FreeSWITCH CDR:**
```bash
# On FreeSWITCH server
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h localhost -U fusionpbx -d fusionpbx << 'EOF'
-- Recent calls
SELECT
    caller_id_number,
    destination_number,
    direction,
    start_stamp,
    duration,
    billsec,
    hangup_cause,
    accountcode
FROM v_xml_cdr
ORDER BY start_stamp DESC
LIMIT 10;
EOF
```

**Success Criteria:**
- ✅ Inbound calls show `accountcode=livekit_17678189426`
- ✅ Outbound calls show `accountcode=livekit_outbound_*`
- ✅ `hangup_cause=NORMAL_CLEARING` for successful calls
- ✅ `billsec` matches call duration

---

## Phase 5: CDR Sync Script (Optional)

**Goal**: Sync FreeSWITCH CDRs to LiveKit database

**Time**: 45 minutes

### Step 5.1: Create CDR Sync Script

**On LiveKit Server:**

```bash
# Create script
cat > /opt/livekit1/backend/freeswitch_cdr_sync.py << 'EOF'
#!/usr/bin/env python3
"""
FreeSWITCH CDR Sync to LiveKit Database
Syncs call records from FreeSWITCH to LiveKit for billing and analytics
"""

import psycopg2
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FreeSWITCH Database
FREESWITCH_CONFIG = {
    'host': '24.199.103.153',
    'database': 'fusionpbx',
    'user': 'fusionpbx',
    'password': '9GGTVplZI0wqAndvMxNS'
}

# LiveKit Database
LIVEKIT_CONFIG = {
    'host': 'localhost',
    'database': 'epic_voice_db',
    'user': 'postgres',
    'password': 'nXrRje4emjejjeKI009p'
}

def sync_cdrs(since_minutes=60):
    """Sync CDRs from last N minutes"""

    try:
        # Connect to FreeSWITCH
        fs_conn = psycopg2.connect(**FREESWITCH_CONFIG)
        fs_cursor = fs_conn.cursor()

        # Connect to LiveKit
        lk_conn = psycopg2.connect(**LIVEKIT_CONFIG)
        lk_cursor = lk_conn.cursor()

        # Fetch recent CDRs from FreeSWITCH
        since_time = datetime.now() - timedelta(minutes=since_minutes)

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
            WHERE start_stamp >= %s
              AND accountcode LIKE 'livekit%%'
            ORDER BY start_stamp DESC
        """, (since_time,))

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

            # Extract agent_config_id from accountcode
            # accountcode format: livekit_17678189426 or livekit_outbound_xxx
            agent_config_id = None
            if 'livekit_' in accountcode:
                did = accountcode.replace('livekit_', '').replace('outbound_', '')
                # Lookup agent_config_id by phone number
                lk_cursor.execute("""
                    SELECT id FROM agent_configs
                    WHERE phone_number = %s
                    LIMIT 1
                """, (f'+{did}',))
                result = lk_cursor.fetchone()
                if result:
                    agent_config_id = result[0]

            # Insert into LiveKit call_logs
            lk_cursor.execute("""
                INSERT INTO call_logs (
                    external_call_id,
                    agent_config_id,
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
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                )
                ON CONFLICT (external_call_id) DO NOTHING
            """, (
                uuid,
                agent_config_id,
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

        # Commit
        lk_conn.commit()

        logger.info(f"Synced {synced_count} CDRs from FreeSWITCH to LiveKit")

        # Close connections
        fs_cursor.close()
        fs_conn.close()
        lk_cursor.close()
        lk_conn.close()

        return synced_count

    except Exception as e:
        logger.error(f"CDR sync failed: {e}")
        raise

if __name__ == '__main__':
    sync_cdrs(since_minutes=60)
EOF

# Make executable
chmod +x /opt/livekit1/backend/freeswitch_cdr_sync.py

# Test run
python3 /opt/livekit1/backend/freeswitch_cdr_sync.py
```

### Step 5.2: Create Cron Job

```bash
# Add to crontab
crontab -e

# Add this line (sync every 5 minutes)
*/5 * * * * cd /opt/livekit1/backend && /usr/bin/python3 freeswitch_cdr_sync.py >> /var/log/freeswitch_cdr_sync.log 2>&1

# Verify cron job
crontab -l
```

**Success Criteria:**
- ✅ Script runs without errors
- ✅ CDRs appear in LiveKit `call_logs` table
- ✅ Cron job executes every 5 minutes

---

## Phase 6: Monitoring & Optimization (Optional)

**Goal**: Set up monitoring and fine-tune configuration

**Time**: 1-2 hours

### Step 6.1: Enable mod_cdr_pg_csv

**On FreeSWITCH Server:**

```bash
# Edit modules config
nano /etc/freeswitch/autoload_configs/modules.conf.xml

# Find and uncomment:
<load module="mod_cdr_pg_csv"/>

# Save and exit (Ctrl+O, Enter, Ctrl+X)

# Reload module
fs_cli -x "reload mod_cdr_pg_csv"

# Verify loaded
fs_cli -x "module_exists mod_cdr_pg_csv"
# Expected: true
```

### Step 6.2: Add Firewall Rules (Security)

**On FreeSWITCH Server:**

```bash
# Allow SIP from LiveKit only
iptables -I INPUT -p udp -s 134.199.197.42 --dport 5080 -j ACCEPT
iptables -I INPUT -p tcp -s 134.199.197.42 --dport 5080 -j ACCEPT

# Allow RTP from LiveKit
iptables -I INPUT -p udp -s 134.199.197.42 --dport 16384:32768 -j ACCEPT

# Save rules
iptables-save > /etc/iptables/rules.v4
```

**On LiveKit Server:**

```bash
# Allow SIP from FreeSWITCH
sudo ufw allow from 24.199.103.153 to any port 5060 proto udp comment 'FreeSWITCH SIP'
sudo ufw allow from 24.199.103.153 to any port 5060 proto tcp comment 'FreeSWITCH SIP'

# Allow RTP from FreeSWITCH
sudo ufw allow from 24.199.103.153 to any port 50000:60000 proto udp comment 'FreeSWITCH RTP'

# Verify
sudo ufw status numbered
```

### Step 6.3: Monitor Call Quality

**Metrics to Track:**
```bash
# On FreeSWITCH
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h localhost -U fusionpbx -d fusionpbx << 'EOF'
-- Call success rate (last 24 hours)
SELECT
    COUNT(*) as total_calls,
    COUNT(CASE WHEN hangup_cause = 'NORMAL_CLEARING' THEN 1 END) as successful,
    ROUND(100.0 * COUNT(CASE WHEN hangup_cause = 'NORMAL_CLEARING' THEN 1 END) / COUNT(*), 2) as success_rate,
    AVG(billsec) as avg_duration_seconds
FROM v_xml_cdr
WHERE start_stamp >= NOW() - INTERVAL '24 hours'
  AND accountcode LIKE 'livekit%';
EOF
```

**Success Criteria:**
- ✅ Success rate > 95%
- ✅ Average latency < 200ms
- ✅ No audio quality complaints

---

## Rollback Plan

If migration fails, revert in **5 minutes**:

### Step 1: Revert Admin Settings

**Via Web UI:**
1. Go to: http://localhost:3000/dashboard/admin/system-settings
2. Click "SIP Trunk" tab
3. Change `sip_domain` back to `voice.epic.dm`
4. Save changes

**Via Database:**
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db << 'EOF'
UPDATE system_settings
SET value = 'voice.epic.dm', updated_at = NOW()
WHERE key = 'sip_domain';
EOF
```

### Step 2: Restart LiveKit Backend

```bash
sudo systemctl restart livekit-backend.service
```

### Step 3: Test Calls

```bash
# Call +17678189426
# Should route via Magnus again
```

**No FreeSWITCH changes needed** - Dialplan routes remain for future use.

---

## Success Checklist

Before declaring migration complete:

- [ ] Inbound calls to +17678189426 reach AI agent
- [ ] Inbound calls to +17678189267 reach AI agent
- [ ] Outbound calls from AI agents connect
- [ ] Audio quality is clear (no echo, delay)
- [ ] CDRs captured in FreeSWITCH database
- [ ] CDR sync script runs successfully
- [ ] LiveKit dashboard shows calls
- [ ] No SIP errors in logs
- [ ] Success rate > 95%
- [ ] Latency < 200ms

---

## Timeline Summary

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 1 | Inbound DID routing | 1h | ⏳ Pending |
| 2 | Outbound call routing | 30m | ⏳ Pending |
| 3 | LiveKit config update | 15m | ⏳ Pending |
| 4 | End-to-end testing | 30m | ⏳ Pending |
| 5 | CDR sync script | 45m | ⏳ Optional |
| 6 | Monitoring setup | 1-2h | ⏳ Optional |

**Total Required Time**: 2 hours 15 minutes
**Total with Optional**: 4 hours 30 minutes

---

## Next Action

**YOU**: Execute Phase 1 - Create DID routes on FreeSWITCH server

**Start with:**
```bash
ssh root@24.199.103.153
# Then follow Phase 1 steps
```

**After Phase 1**: Test inbound call before continuing

**Status**: ✅ Ready to begin implementation
