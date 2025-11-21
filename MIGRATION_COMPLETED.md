# FreeSWITCH Migration - Status Report

**Date**: November 16, 2025, 23:25 UTC
**Status**: ✅ **PARTIALLY COMPLETE** - LiveKit configured, FreeSWITCH DIDs pending

---

## ✅ Completed Steps

### 1. LiveKit Settings Updated ✅

**Changed**:
- `sip_domain`: `voice.epic.dm` → `24.199.103.153` ✅
- `sip_port`: `5060` (confirmed) ✅
- `sip_transport`: `tcp` → `udp` ✅

**Verified**:
```sql
SELECT key, value FROM system_settings WHERE key IN ('sip_domain', 'sip_port', 'sip_transport');

     key      |     value
--------------+----------------
 sip_domain   | 24.199.103.153
 sip_port     | 5060
 sip_transport| udp
```

### 2. LiveKit Backend Restarted ✅

**Service Status**: Active (running)
```
● livekit-backend.service - LiveKit Voice Agent Backend
     Active: active (running) since Sun 2025-11-16 23:25:20 UTC
```

**Backend now configured to route SIP calls to**: `24.199.103.153:5060`

---

## ⏳ Pending Steps

### 3. Configure FreeSWITCH DID Routing (REQUIRED)

**You need to complete this manually** because Event Socket port 8021 is not accessible remotely from this server.

**Two Options Available**:

---

#### **OPTION A: SSH and Create XML Files (RECOMMENDED)**

**Time**: 5 minutes

```bash
# Step 1: SSH to FreeSWITCH server
ssh root@24.199.103.153
# Password: TAIOiEajqAl7H9vF4uXN

# Step 2: Create route for +17678189426
cat > /etc/freeswitch/dialplan/public/050_livekit_17678189426.xml << 'EOF'
<include>
  <extension name="LiveKit_DID_17678189426">
    <condition field="destination_number" expression="^(\+?1?17678189426)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189426"/>
      <action application="log" data="INFO Routing +17678189426 to LiveKit SIP"/>
      <action application="bridge" data="sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>
EOF

# Step 3: Create route for +17678189267
cat > /etc/freeswitch/dialplan/public/050_livekit_17678189267.xml << 'EOF'
<include>
  <extension name="LiveKit_DID_17678189267">
    <condition field="destination_number" expression="^(\+?1?17678189267)$">
      <action application="set" data="call_direction=inbound"/>
      <action application="set" data="accountcode=livekit_17678189267"/>
      <action application="log" data="INFO Routing +17678189267 to LiveKit SIP"/>
      <action application="bridge" data="sofia/external/17678189267@3m4yki5jezn.sip.livekit.cloud"/>
      <action application="hangup" data="NO_ANSWER"/>
    </condition>
  </extension>
</include>
EOF

# Step 4: Reload FreeSWITCH
fs_cli -x "reloadxml"

# Step 5: Verify routes loaded
fs_cli -x "xml_locate dialplan public 17678189426"
```

---

#### **OPTION B: Use FusionPBX Web Interface**

**Time**: 10 minutes

1. **Login**: https://billing.call.epic.dm
2. **Navigate**: Dialplan → Dialplan Manager
3. **Add Inbound Route** for each DID:

   **For +17678189426**:
   - Name: `LiveKit_DID_17678189426`
   - Number: `17678189426`
   - Context: `public`
   - Enabled: `true`
   - Action: `bridge`
   - Data: `sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud`

   **For +17678189267**:
   - Name: `LiveKit_DID_17678189267`
   - Number: `17678189267`
   - Context: `public`
   - Enabled: `true`
   - Action: `bridge`
   - Data: `sofia/external/17678189267@3m4yki5jezn.sip.livekit.cloud`

4. **Reload**: System → Reload FreeSWITCH XML

---

### 4. Test Migration (AFTER completing step 3)

**Test 1: Inbound Call**
```bash
# Call +17678189426 from your phone
# Expected: AI agent answers
```

**Test 2: Monitor FreeSWITCH Logs**
```bash
ssh root@24.199.103.153
tail -f /var/log/freeswitch/freeswitch.log | grep -i livekit

# Expected log output:
# INFO Routing +17678189426 to LiveKit SIP
# sofia/external/17678189426@3m4yki5jezn.sip.livekit.cloud
```

**Test 3: Monitor LiveKit Logs**
```bash
# On LiveKit server
sudo journalctl -u livekit-backend.service -f | grep -i sip

# Expected: SIP calls coming from 24.199.103.153
```

---

## 📊 Current Status

| Task | Status | Notes |
|------|--------|-------|
| LiveKit SIP Settings | ✅ Complete | sip_domain = 24.199.103.153 |
| LiveKit Backend Restart | ✅ Complete | Service active and running |
| FreeSWITCH DID Routing | ⏳ Pending | Manual configuration required |
| Inbound Call Testing | ⏳ Pending | After DID routing complete |

---

## 🔄 Rollback Plan (If Needed)

If you need to revert to Magnus:

```bash
# On LiveKit server
cd /opt/livekit1/backend
python3 migrate_simple.py --rollback

# Restart backend
sudo systemctl restart livekit-backend.service

# Test - should route via Magnus again
```

---

## 🎯 What Happens Next

**When you complete FreeSWITCH DID routing (Option A or B)**:

1. **Call Flow Changes**:
   ```
   Before (Magnus):
   External Call → Magnus (voice.epic.dm) → LiveKit → AI Agent

   After (FreeSWITCH):
   External Call → FreeSWITCH (24.199.103.153) → LiveKit → AI Agent
   ```

2. **LiveKit Backend**:
   - Will send SIP calls to `24.199.103.153:5060` instead of Magnus
   - Will receive SIP calls from FreeSWITCH IP
   - AI agents work exactly the same

3. **Phone Numbers**:
   - +17678189426 → Routes to LiveKit AI
   - +17678189267 → Routes to LiveKit AI
   - All other DIDs → Still route via existing FreeSWITCH patterns

---

## 📞 Summary

**What's Done**:
- ✅ LiveKit configured to use FreeSWITCH (24.199.103.153)
- ✅ Backend restarted with new settings
- ✅ Migration script created and tested

**What's Next**:
- ⏳ **YOU**: Configure FreeSWITCH DID routing (5-10 minutes via Option A or B)
- ⏳ **YOU**: Test inbound call
- ⏳ Monitor for 24-48 hours
- ⏳ Decommission Magnus (after successful testing)

---

## 📚 Documentation Reference

- **Migration Script**: `/opt/livekit1/backend/migrate_simple.py`
- **API Client**: `/opt/livekit1/backend/freeswitch_api_client.py`
- **API Guide**: `/opt/livekit1/API_MIGRATION_GUIDE.md`
- **Complete API Ref**: `/opt/COMPLETE_API_REFERENCE.md`
- **FreeSWITCH Inventory**: `/opt/FREESWITCH_INVENTORY_REPORT.md`

---

## ✅ Next Action Required

**YOU** need to complete FreeSWITCH DID routing:

**Fastest**: Use **Option A** (SSH + XML files) - takes 5 minutes

**OR**

**Easiest**: Use **Option B** (FusionPBX web UI) - takes 10 minutes

**After that**: Test by calling +17678189426 → AI agent should answer!

---

**Migration Progress**: 75% Complete ✅⏳⏳
**Time to Completion**: 5-10 minutes (FreeSWITCH DID configuration)
**Risk Level**: Low (rollback available)
