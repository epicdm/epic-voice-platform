# FreeSWITCH Migration - Ready to Execute

**Date**: November 16, 2025
**Status**: ✅ **ANALYSIS COMPLETE - READY FOR INVENTORY**

---

## What You Have Now

### 1. Complete Magnus API Function Inventory
**File**: `/opt/livekit1/MAGNUS_TO_FREESWITCH_MIGRATION_CHECKLIST.md`

**Contains**:
- ✅ All 9 Magnus API functions currently used
- ✅ Complete data models (DIDs, SIP accounts, CDRs, users)
- ✅ FreeSWITCH equivalents needed for each function
- ✅ Priority order for migration (DID routing = CRITICAL)

**Key Functions Mapped**:
1. **DID Management**: Create, lookup, provision phone numbers
2. **DID Routing** (CRITICAL): Route inbound calls to LiveKit SIP
3. **SIP Accounts**: User authentication, caller ID, codecs
4. **CDR**: Call detail records for billing
5. **User Management**: Account creation, plan assignment
6. **Outbound Calling**: Route calls to PSTN carriers
7. **Billing**: Cost tracking, accountcode mapping
8. **Offers**: Special pricing plans

### 2. FreeSWITCH AI Inventory Prompt
**File**: `/opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md`

**Ready to use** - Copy the prompt section and paste to FreeSWITCH server AI

**Will gather**:
- DID/phone number storage and routing
- Inbound/outbound call routing rules
- SIP configuration and peering
- CDR logging and storage
- Database setup
- Network and firewall configuration
- Complete configuration file listing

### 3. FreeSWITCH Server Configuration
**File**: `/opt/livekit1/FREESWITCH_INTEGRATION_CONFIG.md`

**Already gathered**:
- ✅ Server IP: 24.199.103.153
- ✅ SIP Ports: 5060 (internal), 5080 (external)
- ✅ Codecs: PCMU, PCMA, G.722 (LiveKit compatible)
- ✅ Current routing: 1767→23.186.240.10, others→Vitelity
- ✅ Network test: 60ms latency, port 5060 accessible

### 4. Step-by-Step Integration Guide
**File**: `/opt/livekit1/FREESWITCH_INTEGRATION_GUIDE.md`

**Includes**:
- Configuration file examples (gateway, dialplan)
- Testing procedures
- Rollback plan
- Quick command reference

---

## Your Next Steps

### Step 1: Gather FreeSWITCH Inventory (NOW)

**Action**: Use AI on FreeSWITCH server to gather detailed configuration

1. SSH or connect to FreeSWITCH server AI interface
2. Copy the entire prompt from `/opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md`
3. Paste into FreeSWITCH server AI
4. Save the response as `FREESWITCH_INVENTORY_REPORT.md`

**Expected Output**: Complete inventory of:
- How DIDs are stored (database? XML?)
- Current DID routing rules
- SIP gateway configurations
- CDR module setup (CSV? PostgreSQL?)
- Carrier trunk configurations

### Step 2: Gap Analysis (AFTER Step 1)

Compare FreeSWITCH inventory against Magnus checklist:

**Critical Questions to Answer**:
1. ✅ Can FreeSWITCH route +17678189426 to LiveKit now?
2. ✅ Can FreeSWITCH accept outbound calls from LiveKit (134.199.197.42)?
3. ❓ Are CDRs being captured? Where?
4. ❓ How are DIDs managed? (API? Manual XML editing?)
5. ❓ What carriers are configured for outbound calling?

### Step 3: Implementation Plan (AFTER Step 2)

Based on gaps found, create specific implementation tasks:

**Priority 1 (CRITICAL)**:
- [ ] Create FreeSWITCH dialplan route: +17678189426 → LiveKit SIP
- [ ] Create FreeSWITCH dialplan route: +17678189267 → LiveKit SIP
- [ ] Configure FreeSWITCH to accept outbound calls from LiveKit IP
- [ ] Test inbound call flow
- [ ] Test outbound call flow

**Priority 2 (HIGH)**:
- [ ] Configure CDR capture (CSV or PostgreSQL)
- [ ] Create CDR sync script: FreeSWITCH → LiveKit database
- [ ] Verify all call records are captured

**Priority 3 (MEDIUM)**:
- [ ] Create DID management interface (API or web UI)
- [ ] Implement automated DID provisioning
- [ ] Add firewall rules (secure IP-based peering)

**Priority 4 (LOW)**:
- [ ] Monitoring and alerting
- [ ] Performance optimization
- [ ] Decommission Magnus

---

## Key Migration Points

### What Changes in LiveKit Code:

**Current (Magnus)**:
```python
# Phone number provisioning
magnus_client.provision_did_for_user(user_id, username, prefix='1767818')

# DID routing
magnus_client.create_did_destination({
    'id_did': did_id,
    'destination': f'SIP/{username}@3m4yki5jezn.sip.livekit.cloud'
})

# CDR sync
cdr_service.sync_cdrs_from_magnus()
```

**New (FreeSWITCH)**:
```python
# Phone number provisioning
freeswitch_client.create_dialplan_route(
    did='+17678189426',
    destination='3m4yki5jezn.sip.livekit.cloud'
)

# DID routing (XML dialplan file)
# <extension name="livekit_ai_agents">
#   <condition field="destination_number" expression="^17678189426$">
#     <action application="bridge" data="sofia/internal/${destination_number}@3m4yki5jezn.sip.livekit.cloud"/>
#   </condition>
# </extension>

# CDR sync
cdr_service.sync_cdrs_from_freeswitch()
```

### What Changes in Admin Settings:

**Current**:
- SIP Domain: `voice.epic.dm`
- SIP Outbound Trunk ID: `ST_sTo8gGpNbXzY`

**New**:
- SIP Domain: `24.199.103.153` (FreeSWITCH IP)
- SIP Port: `5060`
- SIP Transport: `udp` or `tcp`

**How to Change**:
1. Go to: http://localhost:3000/dashboard/admin/system-settings
2. Click "SIP Trunk" tab
3. Update `sip_domain` to `24.199.103.153`
4. Click "Test SIP Connection"
5. Click "Save Changes"

---

## Success Criteria

Before going live, verify:

### Inbound Calls ✓
- [ ] Call +17678189426 from external phone
- [ ] Call reaches LiveKit AI agent
- [ ] Audio quality is good
- [ ] Call is recorded in LiveKit database

### Outbound Calls ✓
- [ ] AI agent initiates outbound call
- [ ] Call routes through FreeSWITCH
- [ ] Call reaches recipient via Vitelity/local trunk
- [ ] Caller ID displays correctly

### CDR Capture ✓
- [ ] All calls logged in FreeSWITCH CDR
- [ ] CDRs sync to LiveKit database
- [ ] Call duration, disposition, cost captured

### Monitoring ✓
- [ ] FreeSWITCH logs show call flow
- [ ] No SIP errors in logs
- [ ] Latency acceptable (<200ms)

---

## Quick Reference

### Current System Status

**Magnus Billing** (Current):
- Status: Active
- SIP Domain: voice.epic.dm
- Functions: DID provisioning, routing, CDR, billing
- Migration Status: Being replaced

**FreeSWITCH** (New):
- IP: 24.199.103.153
- Status: Running, configured, ready for integration
- SIP: 5060 (internal), 5080 (external)
- Codecs: PCMU, PCMA, G.722
- Network: 60ms latency to LiveKit (134.199.197.42)

**LiveKit**:
- Backend: 134.199.197.42
- Frontend: localhost:3000
- SIP Domain: 3m4yki5jezn.sip.livekit.cloud
- Outbound Trunk: ST_sTo8gGpNbXzY

### Key Phone Numbers for Testing

- **+17678189426** - Primary test DID
- **+17678189267** - Secondary test DID

Both currently routed via Magnus, will migrate to FreeSWITCH.

---

## Files Summary

| File | Purpose | Status |
|------|---------|--------|
| `MAGNUS_TO_FREESWITCH_MIGRATION_CHECKLIST.md` | Complete Magnus API function inventory | ✅ Complete |
| `FREESWITCH_AI_INVENTORY_PROMPT.md` | AI prompt for FreeSWITCH server | ✅ Ready to use |
| `FREESWITCH_INTEGRATION_CONFIG.md` | FreeSWITCH technical details | ✅ Complete |
| `FREESWITCH_INTEGRATION_GUIDE.md` | Step-by-step implementation | ✅ Complete |
| `ADMIN_SETTINGS_DEPLOYMENT_COMPLETE.md` | Admin panel documentation | ✅ Complete |
| `FREESWITCH_INVENTORY_REPORT.md` | FreeSWITCH inventory response | ⏳ Waiting for you |

---

## Timeline Estimate

**Phase 1: Inventory** (30-60 min)
- Run AI prompt on FreeSWITCH server
- Analyze response
- Identify gaps

**Phase 2: Configuration** (1-2 hours)
- Create FreeSWITCH dialplan routes
- Configure CDR capture
- Update admin settings

**Phase 3: Testing** (1-2 hours)
- Test inbound calls
- Test outbound calls
- Verify CDR sync

**Phase 4: Monitoring** (24-48 hours)
- Monitor call quality
- Check for errors
- Fine-tune configuration

**Total**: 2-4 days from start to full production

---

## Next Action Required

**YOU**: Run the AI inventory prompt on FreeSWITCH server

**Steps**:
1. Open `/opt/livekit1/FREESWITCH_AI_INVENTORY_PROMPT.md`
2. Copy the prompt section (starts at line 10)
3. Paste to FreeSWITCH server AI (24.199.103.153)
4. Save the response
5. Share the response for gap analysis

**After that**: I'll create the specific implementation plan based on what FreeSWITCH has vs. what Magnus provides.

---

## Support

If you encounter issues during inventory gathering:

1. **FreeSWITCH not responding**: Check service status
   ```bash
   ssh root@24.199.103.153
   systemctl status freeswitch
   ```

2. **Can't find configuration**: Try manual commands
   ```bash
   fs_cli -x "sofia status"
   ls -la /etc/freeswitch/dialplan/public/
   ```

3. **Need help**: Share the FreeSWITCH AI response and I'll analyze

---

**STATUS**: ✅ Ready for Step 1 - FreeSWITCH Inventory Gathering
