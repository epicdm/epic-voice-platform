# FreeSWITCH Migration - Quick Reference Card

**Date**: November 16, 2025
**Status**: ✅ Ready to Execute

---

## 📋 Pre-Flight Checklist

Before you begin, verify:
- [ ] SSH access to FreeSWITCH (24.199.103.153)
- [ ] Admin access to LiveKit (localhost:3000)
- [ ] Backup of current settings
- [ ] 2-3 hours available
- [ ] Test phone for calling +17678189426

---

## 🎯 Critical Commands

### FreeSWITCH Server (24.199.103.153)

```bash
# SSH login
ssh root@24.199.103.153
# Password: TAIOiEajqAl7H9vF4uXN

# Reload configuration
fs_cli -x "reloadxml"

# Verify DID routing
fs_cli -x "xml_locate dialplan public 17678189426"

# Show active calls
fs_cli -x "show calls"

# Monitor logs
tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit

# Check CDRs
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h localhost -U fusionpbx -d fusionpbx -c "SELECT caller_id_number, destination_number, start_stamp, billsec FROM v_xml_cdr ORDER BY start_stamp DESC LIMIT 10;"
```

### LiveKit Server (134.199.197.42)

```bash
# Check admin settings
curl 'http://localhost:3000/api/admin/settings?category=sip' | python3 -m json.tool

# Update SIP domain via database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "UPDATE system_settings SET value='24.199.103.153' WHERE key='sip_domain';"

# Restart backend
sudo systemctl restart livekit-backend.service

# Check backend logs
sudo journalctl -u livekit-backend.service -f | grep -i sip
```

---

## 📁 File Locations

### FreeSWITCH
```
Dialplan files:
/etc/freeswitch/dialplan/public/050_livekit_17678189426.xml
/etc/freeswitch/dialplan/public/051_livekit_17678189267.xml
/etc/freeswitch/dialplan/public/075_livekit_outbound.xml

Logs:
/var/log/freeswitch/freeswitch.log

CDR Database:
fusionpbx.v_xml_cdr (PostgreSQL)
```

### LiveKit
```
Admin Settings:
http://localhost:3000/dashboard/admin/system-settings

CDR Sync Script:
/opt/livekit1/backend/freeswitch_cdr_sync.py

Backend Logs:
sudo journalctl -u livekit-backend.service -f
```

---

## 🔧 3-Step Migration

### Step 1: Create DID Routes (1 hour)
```bash
ssh root@24.199.103.153

# Create route for +17678189426
cat > /etc/freeswitch/dialplan/public/050_livekit_17678189426.xml << 'EOXML'
<include>
  <extension name="LiveKit_DID_17678189426">
    <condition field="destination_number" expression="^(\+?1?7678189426)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189426"/>
      <action application="bridge" data="sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud"/>
    </condition>
  </extension>
</include>
EOXML

# Create route for +17678189267
cat > /etc/freeswitch/dialplan/public/051_livekit_17678189267.xml << 'EOXML'
<include>
  <extension name="LiveKit_DID_17678189267">
    <condition field="destination_number" expression="^(\+?1?7678189267)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189267"/>
      <action application="bridge" data="sofia/external/17678189267@3m4yki5jezn.sip.livekit.cloud"/>
    </condition>
  </extension>
</include>
EOXML

# Reload
fs_cli -x "reloadxml"

# Test: Call +17678189426
```

### Step 2: Enable Outbound (30 min)
```bash
# Create outbound accept rule
cat > /etc/freeswitch/dialplan/public/075_livekit_outbound.xml << 'EOXML'
<include>
  <extension name="livekit_outbound_routing">
    <condition field="${network_addr}" expression="^134\.199\.197\.42$">
      <condition field="destination_number" expression="^\+?1?(\d{10})$">
        <action application="set" data="call_direction=outbound"/>
        <action application="transfer" data="$1 XML public"/>
      </condition>
    </condition>
  </extension>
</include>
EOXML

# Reload
fs_cli -x "reloadxml"
```

### Step 3: Update LiveKit (15 min)
```bash
# Via Web UI
# http://localhost:3000/dashboard/admin/system-settings
# SIP Trunk tab → sip_domain = 24.199.103.153

# OR via database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "UPDATE system_settings SET value='24.199.103.153' WHERE key='sip_domain';"

# Restart
sudo systemctl restart livekit-backend.service
```

---

## 🧪 Testing Checklist

```bash
# Test 1: Inbound Call
# Call +17678189426 from your phone
# Expected: AI agent answers

# Test 2: Check FreeSWITCH CDR
ssh root@24.199.103.153
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h localhost -U fusionpbx -d fusionpbx -c "SELECT * FROM v_xml_cdr ORDER BY start_stamp DESC LIMIT 1;"

# Test 3: Outbound Call
# Trigger from LiveKit dashboard
# Expected: Call connects

# Test 4: Verify Success Rate
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h localhost -U fusionpbx -d fusionpbx -c "SELECT COUNT(*) as total, COUNT(CASE WHEN hangup_cause='NORMAL_CLEARING' THEN 1 END) as success FROM v_xml_cdr WHERE start_stamp >= NOW() - INTERVAL '1 hour';"
```

---

## 🔄 Rollback (5 min)

```bash
# On LiveKit server
# Via Web UI: http://localhost:3000/dashboard/admin/system-settings
# Change sip_domain back to: voice.epic.dm

# OR via database
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "UPDATE system_settings SET value='voice.epic.dm' WHERE key='sip_domain';"

# Restart
sudo systemctl restart livekit-backend.service

# Test
# Call +17678189426 → Should route via Magnus
```

---

## 📊 Server Details

| Component | Value |
|-----------|-------|
| **FreeSWITCH IP** | 24.199.103.153 |
| **FreeSWITCH SIP Port** | 5060 (internal), 5080 (external) |
| **LiveKit IP** | 134.199.197.42 |
| **LiveKit SIP Domain** | 3m4yki5jezn.sip.livekit.cloud |
| **Test DID 1** | +17678189426 |
| **Test DID 2** | +17678189267 |
| **Vitelity Gateway** | 64.2.142.93 |
| **Local Trunk** | 23.186.240.10 |

---

## 🆘 Troubleshooting

### Issue: Calls don't route to LiveKit
```bash
# Check dialplan loaded
fs_cli -x "xml_locate dialplan public 17678189426"

# If empty, reload
fs_cli -x "reloadxml"

# Check logs for errors
tail -50 /var/log/freeswitch/freeswitch.log | grep ERROR
```

### Issue: No audio on calls
```bash
# Check codec negotiation
fs_cli -x "show calls" # Look for codec

# Verify RTP ports open
netstat -tulpn | grep freeswitch | grep udp
```

### Issue: Outbound calls fail
```bash
# Check if LiveKit IP is allowed
fs_cli -x "show calls" # Look for source IP

# Verify dialplan accepts from 134.199.197.42
fs_cli -x "xml_locate dialplan public 15551234567"
```

---

## 📞 Support Commands

```bash
# FreeSWITCH status
systemctl status freeswitch

# LiveKit status
sudo systemctl status livekit-backend.service
sudo systemctl status livekit-frontend.service

# Network connectivity
ping 24.199.103.153
ping 134.199.197.42
telnet 24.199.103.153 5060

# Database connectivity
PGPASSWORD='9GGTVplZI0wqAndvMxNS' psql -h 24.199.103.153 -U fusionpbx -d fusionpbx -c "SELECT version();"
```

---

## ✅ Success Criteria

- [ ] Inbound calls connect within 3 seconds
- [ ] AI agent responds to inbound calls
- [ ] Outbound calls connect
- [ ] Audio quality clear (no echo/delay)
- [ ] CDRs captured in database
- [ ] Success rate > 95%
- [ ] No SIP errors in logs

---

## 📚 Full Documentation

- **Quick Start**: `START_HERE.md`
- **Implementation**: `IMPLEMENTATION_PLAN.md`
- **Gap Analysis**: `GAP_ANALYSIS.md`
- **Inventory**: `FREESWITCH_INVENTORY_REPORT.md`
- **Workflow**: `MIGRATION_WORKFLOW.md`
- **Ready Guide**: `READY_TO_MIGRATE.md`

---

**Total Time**: 2-3 hours
**Risk Level**: Low
**Rollback Time**: 5 minutes
**Status**: ✅ Ready to Execute
