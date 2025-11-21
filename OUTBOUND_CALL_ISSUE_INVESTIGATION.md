# Outbound Call Issue - +17678189426 Investigation

**Date**: October 28, 2025
**Issue**: Outbound calls from +17678189426 don't ring, while +17678189267 works fine
**Status**: ✅ INBOUND CALLS WORKING | ❌ OUTBOUND CALLS NOT WORKING

---

## 🎯 Current Status

### Working
- ✅ **Inbound calls to +17678189426**: Routes correctly to EPIC Sales Agent
- ✅ **Outbound calls from +17678189267**: Phone rings, agent connects

### Not Working
- ❌ **Outbound calls from +17678189426**: API returns success, room created, but phone doesn't ring

---

## 🔍 Investigation Summary

### 1. Database Configuration

Both phone numbers are correctly configured in the `phone_number_pool` table:

```sql
phoneNumber  | magnusDidId | livekitInboundTrunkId | livekitOutboundTrunkId
-------------+-------------+-----------------------+------------------------
+17678189426 | 2411        | ST_Ljiqz9CHiYUi       | ST_wtHm7jtDaJAs
+17678189267 | 2412        | ST_rVY7jNQB2ZLM       | ST_zjY8VpLRdM88
```

**Key Finding**: Different outbound trunk IDs
- +17678189426: `ST_wtHm7jtDaJAs` (not working)
- +17678189267: `ST_zjY8VpLRdM88` (working)

### 2. Flask API Testing

Tested outbound call API for +17678189426:

```bash
POST /api/user/calls/test-outbound
{
  "from_number": "+17678189426",
  "to_number": "+17672958382",
  "agent_id": "139d8d20-293d-4a1b-817f-73cc7f35b1ee"
}
```

**Result**:
```
✅ Status: 200 OK
✅ Room created: outbound-9f80a8a6-139d8d20-293d-4a1b-817f-73cc7f35b1ee
✅ Agent dispatched: tst0002
✅ Participant created: PA_YJhjthudFqrp
```

**Conclusion**: Flask API and LiveKit room creation working correctly. Issue is downstream.

### 3. Agent Process Status

**Agent Running**: PID 477701 (`python3 main.py start`)
- **Port**: 8081 (TCP)
- **Working Directory**: `/opt/livekit1/agents/tst0002`
- **Status**: Active

**Note**: Agent logs don't show outbound call job being received, suggesting the issue occurs before the agent gets involved.

### 4. Magnus Billing Comparison

**Attempted**: Compare Magnus DID configurations for 2411 vs 2412
**Result**: Magnus API returned "Exceeded 30 redirects" error
**Status**: Unable to query Magnus Billing configuration via API

### 5. LiveKit Trunk Configuration

**Attempted**: Query LiveKit outbound trunk configurations for comparison
**Status**: No list_outbound_trunks method available in Python SDK
**Conclusion**: Need to use LiveKit CLI or dashboard to inspect trunk configuration

---

## 🧩 Root Cause Analysis

### Most Likely Causes

1. **LiveKit Outbound Trunk Misconfiguration** (High Probability)
   - Trunk `ST_wtHm7jtDaJAs` may have incorrect SIP routing
   - Authentication credentials may be missing or incorrect
   - SIP domain/address may be wrong
   - Transport protocol mismatch (TCP vs UDP)

2. **Magnus Billing DID Configuration** (Medium Probability)
   - DID 2411 may not have proper outbound routing configured
   - SIP account may not be authorized for outbound calls
   - Billing/credit issues preventing call initiation

3. **Network/Firewall Issues** (Low Probability)
   - SIP ports blocked for specific trunk
   - NAT traversal issues
   - Route-specific firewall rules

---

## 🔧 Recommended Next Steps

### Immediate Actions

#### 1. Compare LiveKit Trunk Configurations

**Via LiveKit Dashboard**:
1. Log into LiveKit Cloud dashboard
2. Navigate to SIP Trunks
3. Compare trunk `ST_wtHm7jtDaJAs` vs `ST_zjY8VpLRdM88`:
   - SIP domain/address
   - Authentication credentials
   - Transport protocol
   - Allowed numbers list
   - Headers configuration

**Via LiveKit CLI** (if available):
```bash
# List all outbound trunks
lk sip outbound list

# Get specific trunk details
lk sip outbound get ST_wtHm7jtDaJAs
lk sip outbound get ST_zjY8VpLRdM88

# Compare output for differences
```

#### 2. Compare Magnus Billing DID Configurations

**Direct Database Query** (requires Magnus DB access):
```sql
-- Compare DID configurations
SELECT
    id, did, id_user, activated, reserved,
    voip_call, connection_charge, selling_rate
FROM pkg_did
WHERE id IN (2411, 2412);

-- Check SIP account permissions
SELECT
    id, username, id_user, allow_call, credit
FROM pkg_sip
WHERE id_user IN (
    SELECT id_user FROM pkg_did WHERE id IN (2411, 2412)
);
```

**Magnus Billing Web Interface**:
1. Log into Magnus Billing admin
2. Navigate to DIDs → List DIDs
3. Compare DID 2411 vs 2412:
   - Activation status
   - User assignment
   - Billing settings
   - Routing rules

#### 3. Test SIP Connectivity

```bash
# Test SIP connectivity from server
# (Requires sip-tools or similar)
sip-tester --from sip:17678189426@billing.epic.dm --to sip:17672958382@destination

# Check SIP port accessibility
nc -zv billing.epic.dm 5060
nc -zv billing.epic.dm 5061
```

#### 4. Enable LiveKit SIP Debug Logging

**If available**, enable debug logging for SIP calls to see detailed call flow:
```bash
# In LiveKit configuration
export LIVEKIT_LOG_LEVEL=debug
```

### Verification Steps

Once you've identified and fixed the trunk configuration:

1. **Test outbound call**:
```bash
curl -X POST http://localhost:5001/api/user/calls/test-outbound \
  -H "X-User-Email: giraud.eric@gmail.com" \
  -H "Content-Type: application/json" \
  -d '{
    "from_number": "+17678189426",
    "to_number": "+YOUR_PHONE_NUMBER",
    "agent_id": "139d8d20-293d-4a1b-817f-73cc7f35b1ee"
  }'
```

2. **Verify phone rings**:
- Phone should ring within 5 seconds
- Agent should answer and speak

3. **Check logs**:
```bash
# Flask logs
tail -50 /opt/livekit1/flask.log | grep -E "outbound|17678189426"

# Agent logs
tail -50 /opt/livekit1/agents/tst0002/agent.log | grep -E "outbound|agent_config"
```

---

## 📊 Configuration Comparison Checklist

Use this checklist when comparing the working vs non-working trunk:

### LiveKit Trunk Configuration
- [ ] SIP domain/address matches
- [ ] Authentication username matches
- [ ] Authentication password set and correct
- [ ] Transport protocol matches (TCP/UDP)
- [ ] Allowed numbers list configured
- [ ] Headers configuration matches
- [ ] Trunk is active/enabled

### Magnus Billing DID Configuration
- [ ] DID is activated
- [ ] DID is assigned to correct user
- [ ] User has credit/balance
- [ ] User is allowed to make outbound calls
- [ ] Voip_call setting is correct
- [ ] Routing rules configured

### Network/Infrastructure
- [ ] SIP ports (5060/5061) accessible
- [ ] No firewall rules blocking specific trunk
- [ ] DNS resolution working for SIP domain
- [ ] NAT traversal configured if needed

---

## 🎯 Quick Fix Options

If trunk configuration comparison is complex, consider these alternatives:

### Option 1: Clone Working Trunk
```bash
# Get working trunk config
lk sip outbound get ST_zjY8VpLRdM88 > working_trunk.json

# Create new trunk with same config but different number
# Edit working_trunk.json to change number to +17678189426
lk sip outbound create < modified_trunk.json

# Update database with new trunk ID
UPDATE phone_number_pool
SET "livekitOutboundTrunkId" = 'NEW_TRUNK_ID'
WHERE "phoneNumber" = '+17678189426';
```

### Option 2: Use Working Trunk Temporarily
```sql
-- Point broken number to working trunk (TEMPORARY FIX)
UPDATE phone_number_pool
SET "livekitOutboundTrunkId" = 'ST_zjY8VpLRdM88'
WHERE "phoneNumber" = '+17678189426';
```

**WARNING**: Option 2 may cause both numbers to use same trunk, which might not be correct long-term.

### Option 3: Recreate Trunk from Scratch
1. Delete existing trunk `ST_wtHm7jtDaJAs`
2. Create new trunk with correct configuration
3. Update database with new trunk ID

---

## 📝 Files Modified/Created

1. [compare_dids.py](compare_dids.py) - Magnus Billing DID comparison script
2. [check_outbound_trunks.py](check_outbound_trunks.py) - LiveKit trunk comparison script
3. [OUTBOUND_CALL_ISSUE_INVESTIGATION.md](OUTBOUND_CALL_ISSUE_INVESTIGATION.md) - This document

---

## 🎉 Success Criteria

The issue will be resolved when:
1. ✅ Outbound call from +17678189426 rings the destination number
2. ✅ Agent answers and speaks with EPIC Sales Agent voice/instructions
3. ✅ Call completes successfully without errors
4. ✅ Both inbound and outbound calls work reliably

---

**Next User Action Required**: Access LiveKit dashboard or CLI to compare trunk configurations for `ST_wtHm7jtDaJAs` vs `ST_zjY8VpLRdM88`.
