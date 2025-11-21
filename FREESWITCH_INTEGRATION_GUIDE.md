# FreeSWITCH Integration - Quick Start Guide

**Status**: ✅ Ready to implement
**Network Test**: ✅ Connectivity confirmed (60ms latency)

---

## Summary of FreeSWITCH Setup

Your FreeSWITCH server at **24.199.103.153** is configured with:

- **Internal SIP Profile**: Port 5060 (UDP/TCP)
- **External SIP Profile**: Port 5080 (UDP/TCP)
- **Codecs**: PCMU, PCMA, G.722 (all compatible with LiveKit)
- **Current Routing**:
  - 1767 numbers → Local trunk (23.186.240.10)
  - All other numbers → Vitelity (outbound.vitelity.net)

**Network**: LiveKit ↔ FreeSWITCH connectivity confirmed (60ms ping)

---

## Integration Options

### Option A: Simple IP-Based Routing (RECOMMENDED)

**Pros**:
- No authentication needed
- Simple configuration
- Fast setup

**Cons**:
- Less secure (mitigate with firewall rules)

**How it works**:
1. FreeSWITCH routes specific DIDs directly to LiveKit SIP domain
2. LiveKit sends outbound calls to FreeSWITCH IP
3. IP-based trust (no username/password)

### Option B: SIP Trunk with Authentication

**Pros**:
- More secure
- Standard SIP trunk setup

**Cons**:
- Requires LiveKit SIP trunk credentials
- More complex configuration

---

## Step-by-Step Implementation (Option A)

### Step 1: Configure FreeSWITCH to Route to LiveKit

SSH to FreeSWITCH server and create gateway config:

```bash
ssh root@24.199.103.153

# Create LiveKit gateway
cat > /etc/freeswitch/sip_profiles/internal/livekit.xml << 'EOF'
<include>
  <gateway name="livekit">
    <param name="proxy" value="3m4yki5jezn.sip.livekit.cloud"/>
    <param name="register" value="false"/>
    <param name="caller-id-in-from" value="true"/>
    <param name="extension-in-contact" value="true"/>
  </gateway>
</include>
EOF

# Create inbound route for your phone numbers
cat > /etc/freeswitch/dialplan/public/300_livekit_inbound.xml << 'EOF'
<include>
  <!-- Route specific DIDs to LiveKit AI agents -->
  <extension name="livekit_ai_agents">
    <condition field="destination_number" expression="^(\+?1?7678189426|\+?1?7678189267)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="hangup_after_bridge=true"/>
      <action application="export" data="sip_h_X-Trunk=livekit"/>
      <action application="log" data="INFO Routing to LiveKit AI: ${destination_number}"/>
      <action application="bridge" data="sofia/internal/${destination_number}@3m4yki5jezn.sip.livekit.cloud"/>
    </condition>
  </extension>
</include>
EOF

# Reload FreeSWITCH configuration
fs_cli -x "reloadxml"
fs_cli -x "sofia profile internal rescan"
fs_cli -x "sofia status"
```

### Step 2: Update LiveKit Admin Settings

Access the admin panel:

**URL**: http://localhost:3000/dashboard/admin/system-settings

**Changes to make**:

1. Click on "SIP Trunk" tab
2. Update the following:
   - **sip_domain**: Change from `voice.epic.dm` to `24.199.103.153`
   - **sip_transport**: `udp` (or `tcp`)
   - **sip_port**: `5060`
3. Click "Test SIP Connection"
4. Click "Save Changes"

### Step 3: Update Phone Numbers

Point your DIDs to use FreeSWITCH:

**Option A: Via Admin Panel** (when available)
- Navigate to Phone Numbers page
- Update each number's SIP settings

**Option B: Via Database**:
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
UPDATE phone_number_pool
SET
  sip_domain = '24.199.103.153',
  sip_port = 5060
WHERE \"phoneNumber\" IN ('+17678189426', '+17678189267');
"
```

### Step 4: Configure Outbound Calls (LiveKit → FreeSWITCH)

Update LiveKit backend to send outbound calls to FreeSWITCH:

In your LiveKit SIP configuration, set:
```
Outbound SIP URI: sip:${destination}@24.199.103.153:5060
```

This can be configured in the admin settings panel under "SIP Outbound Trunk ID"

### Step 5: Test Inbound Calls

```bash
# Call one of your DIDs from an external phone
# Expected flow:
# Your phone → PSTN → FreeSWITCH → LiveKit → AI Agent

# Monitor on FreeSWITCH:
ssh root@24.199.103.153
fs_cli
# Inside fs_cli:
console loglevel debug
sofia loglevel all 9

# Watch for incoming call and route to LiveKit
```

### Step 6: Test Outbound Calls

```bash
# Trigger an outbound call from LiveKit
# Expected flow:
# AI Agent → LiveKit → FreeSWITCH → PSTN → Recipient

# Monitor on FreeSWITCH to see if call is received
```

---

## Quick Commands Reference

### FreeSWITCH Server Commands

```bash
# SSH to FreeSWITCH
ssh root@24.199.103.153

# Check SIP profiles
fs_cli -x "sofia status"

# Check active calls
fs_cli -x "show calls"

# Monitor live calls
fs_cli
console loglevel debug

# Reload configuration
fs_cli -x "reloadxml"

# Restart SIP profile
fs_cli -x "sofia profile internal restart"

# Check logs
tail -f /var/log/freeswitch/freeswitch.log
```

### LiveKit Server Commands

```bash
# Check admin settings
curl 'http://localhost:5001/api/admin/settings?category=sip' -H 'X-Admin-Auth: true' | python3 -m json.tool

# Check phone numbers
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
SELECT \"phoneNumber\", \"livekitInboundTrunkId\", \"livekitOutboundTrunkId\"
FROM phone_number_pool
WHERE \"phoneNumber\" IN ('+17678189426', '+17678189267');
"

# Test SIP connectivity
telnet 24.199.103.153 5060
```

---

## Firewall Configuration (Optional but Recommended)

### On FreeSWITCH Server (24.199.103.153)

```bash
ssh root@24.199.103.153

# Allow SIP from LiveKit server
ufw allow from 134.199.197.42 to any port 5060 proto udp comment 'LiveKit SIP'
ufw allow from 134.199.197.42 to any port 5060 proto tcp comment 'LiveKit SIP'

# Allow RTP media from LiveKit
ufw allow from 134.199.197.42 to any port 16384:32768 proto udp comment 'LiveKit RTP'

# Verify rules
ufw status numbered
```

### On LiveKit Server (134.199.197.42)

```bash
# Allow SIP from FreeSWITCH
sudo ufw allow from 24.199.103.153 to any port 5060 proto udp comment 'FreeSWITCH SIP'
sudo ufw allow from 24.199.103.153 to any port 5060 proto tcp comment 'FreeSWITCH SIP'

# Allow RTP media from FreeSWITCH
sudo ufw allow from 24.199.103.153 to any port 50000:60000 proto udp comment 'FreeSWITCH RTP'

# Verify rules
sudo ufw status numbered
```

---

## Rollback Plan (If Needed)

If integration fails, revert to Magnus:

### Via Admin Panel
1. Go to: http://localhost:3000/dashboard/admin/system-settings
2. Click "SIP Trunk" tab
3. Change:
   - **sip_domain**: `voice.epic.dm`
   - **sip_port**: `5060`
   - **sip_outbound_trunk_id**: `ST_sTo8gGpNbXzY`
4. Save changes

### Via Database
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
UPDATE phone_number_pool
SET
  sip_domain = 'voice.epic.dm',
  sip_port = 5060
WHERE \"phoneNumber\" IN ('+17678189426', '+17678189267');
"
```

---

## Testing Checklist

- [ ] FreeSWITCH gateway configuration created
- [ ] FreeSWITCH dialplan route created
- [ ] FreeSWITCH configuration reloaded
- [ ] LiveKit admin settings updated (SIP domain = 24.199.103.153)
- [ ] Phone numbers updated in database
- [ ] Firewall rules configured (optional)
- [ ] Inbound call test successful
- [ ] Outbound call test successful
- [ ] Audio quality verified
- [ ] Latency acceptable (<200ms)

---

## Current Configuration Summary

**Magnus (Current)**:
- SIP Domain: voice.epic.dm
- Outbound Trunk ID: ST_sTo8gGpNbXzY
- Status: Active

**FreeSWITCH (New)**:
- IP: 24.199.103.153
- SIP Port: 5060 (internal)
- LiveKit SIP: 3m4yki5jezn.sip.livekit.cloud
- Status: Ready to integrate

---

## Support

If you encounter issues:

1. **Check FreeSWITCH logs**:
   ```bash
   ssh root@24.199.103.153
   tail -f /var/log/freeswitch/freeswitch.log
   ```

2. **Check LiveKit backend logs**:
   ```bash
   sudo journalctl -u livekit-backend.service -f
   ```

3. **Verify network connectivity**:
   ```bash
   ping 24.199.103.153
   telnet 24.199.103.153 5060
   ```

4. **Check SIP status**:
   ```bash
   ssh root@24.199.103.153
   fs_cli -x "sofia status"
   ```

---

## Next Steps

1. Review this guide
2. Decide on implementation timeline
3. Test during low-traffic period
4. Have rollback plan ready
5. Execute Step 1-6 above
6. Monitor call quality for 24-48 hours
7. Decommission Magnus if successful

**Estimated Time**: 30-60 minutes for full integration
