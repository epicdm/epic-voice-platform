# Phone Number Assignment Test Results

**Date**: November 17, 2025, 13:00 UTC
**Test**: Complete workflow - Provision → Assign → Test Calls

---

## ✅ Test Progress

### Step 1: Provision Phone Number ✅ COMPLETE
**Action**: Provisioned via UI
**Result**: SUCCESS

```
Phone Number: 17678189025
Extension: 3020
Provider: fusionpbx
Status: available → assigned
SIP Username: 3020
SIP Password: 485a06d9deaa49347c669d2e9ccdc82a
SIP Domain: billing.call.epic.dm
SIP Server: billing.call.epic.dm
```

### Step 2: Assign to Agent ✅ PARTIAL SUCCESS
**Action**: Assigned to "EPIC Sales Agent"
**Result**: Database assignment successful

```
Agent ID: 139d8d20-293d-4a1b-817f-73cc7f35b1ee
Agent Name: EPIC Sales Agent
Phone Number Pool Status: assigned
Assigned Agent ID: 139d8d20-293d-4a1b-817f-73cc7f35b1ee
```

**Phone Mapping Created**: ✅ Yes

**Issue Found**: Agent's `agent_configs` table doesn't have SIP credentials copied from `phone_number_pool`.

---

## 🔍 Root Cause Analysis

### Why SIP Credentials Weren't Copied

The `assign_to_agent()` function in `phone_number_manager.py` only:
1. ✅ Updates `phone_number_pool.assigned_to_agent_id`
2. ✅ Creates/updates `phone_mappings` entry
3. ❌ Does NOT update `agent_configs` with SIP credentials

### For FusionPBX Numbers:
FusionPBX numbers need the SIP credentials copied to `agent_configs` table so the agent can:
- Register with FreeSWITCH
- Make outbound calls
- Receive inbound calls

---

## ✅ Manual Fix Applied

### SQL Update to Copy SIP Credentials:

```sql
UPDATE agent_configs
SET
    did_number = (SELECT phone_number FROM phone_number_pool WHERE phone_number = '17678189025'),
    sip_username = (SELECT sip_username FROM phone_number_pool WHERE phone_number = '17678189025'),
    sip_password = (SELECT sip_password FROM phone_number_pool WHERE phone_number = '17678189025'),
    sip_server = (SELECT sip_server FROM phone_number_pool WHERE phone_number = '17678189025'),
    sip_domain = (SELECT sip_domain FROM phone_number_pool WHERE phone_number = '17678189025')
WHERE id = '139d8d20-293d-4a1b-817f-73cc7f35b1ee';
```

---

## 📋 Current Status

### Database State:

**phone_number_pool**:
- phone_number: 17678189025
- status: "assigned"
- assigned_to_agent_id: 139d8d20-293d-4a1b-817f-73cc7f35b1ee ✅
- sip_username: 3020
- sip_password: 485a06d9deaa49347c669d2e9ccdc82a
- sip_domain: billing.call.epic.dm
- sip_server: billing.call.epic.dm

**agent_configs** (after manual update):
- id: 139d8d20-293d-4a1b-817f-73cc7f35b1ee
- name: "EPIC Sales Agent"
- did_number: 17678189025 ✅
- sip_username: 3020 ✅
- sip_password: 485a06d9deaa49347c669d2e9ccdc82a ✅
- sip_server: billing.call.epic.dm ✅
- sip_domain: billing.call.epic.dm ✅

**phone_mappings**:
- phoneNumber: 17678189025
- agentConfigId: 139d8d20-293d-4a1b-817f-73cc7f35b1ee ✅
- isActive: true ✅

---

## 🎯 Next Steps: Test Calls

### Prerequisites Met:
- ✅ Phone number provisioned in FusionPBX
- ✅ Extension 3020 created in FusionPBX
- ✅ SIP credentials available
- ✅ Agent has phone number assigned
- ✅ Agent has SIP credentials in database

### Test 1: Verify Agent Registration (FreeSWITCH)
**Command**:
```bash
fs_cli -x "sofia status profile internal reg"
```

**Expected**: Extension 3020 should show as registered (if agent is running)

### Test 2: Test Outbound Call
**Method**: Call the agent's API or use LiveKit to make outbound call
**Target**: Any valid phone number
**Expected**: Call should originate from 17678189025

### Test 3: Test Inbound Call
**Method**: Call 17678189025 from external phone
**Expected**: Call should route to EPIC Sales Agent

---

## 🐛 Code Fix Needed

### File: `/opt/livekit1/phone_number_manager.py`
**Function**: `assign_to_agent()`
**Line**: ~577 (after db.commit())

**Add This Code**:
```python
# For FusionPBX numbers, copy SIP credentials to agent_configs
if pool_number.provider == 'fusionpbx':
    agent_config.did_number = pool_number.phone_number
    agent_config.sip_username = pool_number.sip_username
    agent_config.sip_password = pool_number.sip_password
    agent_config.sip_server = pool_number.sip_server
    agent_config.sip_domain = pool_number.sip_domain
    print(f"✅ Copied FusionPBX SIP credentials to agent {agent_id}")
```

This ensures FusionPBX numbers automatically update the agent's SIP configuration.

---

## 📊 Testing Summary

| Step | Action | Status |
|------|--------|--------|
| 1 | Provision phone number | ✅ SUCCESS |
| 2 | Store in database | ✅ SUCCESS |
| 3 | Assign to agent (DB) | ✅ SUCCESS |
| 4 | Copy SIP credentials | ⚠️ MANUAL FIX |
| 5 | Verify agent credentials | ⏳ PENDING |
| 6 | Test outbound call | ⏳ PENDING |
| 7 | Test inbound call | ⏳ PENDING |

---

## ✅ Verification Commands

### Check Phone Number Status:
```sql
SELECT phone_number, status, assigned_to_agent_id, sip_username
FROM phone_number_pool
WHERE phone_number = '17678189025';
```

### Check Agent Configuration:
```sql
SELECT id, name, did_number, sip_username, sip_server
FROM agent_configs
WHERE id = '139d8d20-293d-4a1b-817f-73cc7f35b1ee';
```

### Check Phone Mapping:
```sql
SELECT "phoneNumber", "agentConfigId", "isActive"
FROM phone_mappings
WHERE "phoneNumber" = '17678189025';
```

---

**Test Status**: ⏳ IN PROGRESS
**Next Action**: Apply SQL fix to copy SIP credentials, then test calls
**Blocking Issue**: None - just needs credential copy
