# SIP Status Detection Fix - COMPLETE ✅

**Date:** 2025-11-20
**User:** epicsmarters@gmail.com
**Issue:** Agents showing "NOT_PROVISIONED" despite having phone numbers assigned

---

## 🐛 Root Cause

Phone numbers were assigned in `phone_number_pool` table via `assignedToAgentId`, but the `agent_configs.did_number` field was **NULL**.

The backend code was only checking `phone_number_pool` when `agent.did_number` existed, causing agents with phone assignments to incorrectly show as "not_provisioned".

---

## ✅ Fix Applied

Updated `/opt/livekit1/backend/sip_status_api.py` with **dual-strategy lookup**:

### Strategy 1: Lookup by Phone Number
```python
if phone_number:
    phone_pool = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.phone_number == phone_number
    ).first()
```

### Strategy 2: Lookup by Agent Assignment (NEW)
```python
if not phone_pool:
    phone_pool = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.assigned_to_agent_id == agent_id
    ).first()
```

Both endpoints updated:
- Single agent status: `/api/user/agents/<id>/sip-status`
- Bulk agent status: `/api/user/agents/sip-status/bulk`

---

## 📊 Your Agent Status (epicsmarters@gmail.com)

| Phone Number | Agent ID | Status | Phone Detected | SIP Username | Explanation |
|--------------|----------|--------|----------------|--------------|-------------|
| **+17678189659** | 50ff393e | ✅ **ERROR** | ✅ Yes | ✅ +17678189659 | **FIXED** - Now detected! |
| **+17678189504** | 1ec56668 | ✅ **ERROR** | ✅ Yes | ✅ +17678189504 | **FIXED** - Now detected! |
| **+17678189677** | 8b7f8d81 | ⚠️ NOT_PROVISIONED | ✅ Yes | ❌ Empty | Missing SIP credentials |
| **+17678189958** | b90dae31 | ⚠️ NOT_PROVISIONED | ✅ Yes | ❌ Empty | Missing SIP credentials |

---

## 🎯 Status Meanings

### ✅ ERROR Status (Working Correctly)
- **Meaning:** Phone number is assigned, SIP credentials exist, but trunk is NOT registered
- **Phone Numbers:** +17678189659, +17678189504
- **Next Step:** Start LiveKit agent to register SIP trunk with EPIC Voice
- **This is expected** - SIP registration happens when agent runs

### ⚠️ NOT_PROVISIONED Status (Needs Action)
- **Meaning:** Phone number is assigned, but NO SIP credentials created in Magnus Billing
- **Phone Numbers:** +17678189677, +17678189958
- **Next Step:** Create SIP accounts in Magnus Billing for these numbers

---

## 🔧 How to Fix NOT_PROVISIONED Numbers

For **+17678189677** and **+17678189958**, you need to provision SIP accounts:

### Option 1: Via Backend API
```bash
# Provision SIP account for phone number
curl -X POST http://localhost:5001/api/sip/provision \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+17678189677",
    "agent_id": "8b7f8d81-90bc-4988-952c-a3e6b1b11b0f"
  }'
```

### Option 2: Via UI
1. Go to **Phone Numbers** page
2. Click **Edit** on the phone number
3. Click **Provision SIP Account**
4. Save changes

### Option 3: Database Update (Manual)
```sql
UPDATE phone_number_pool
SET "magnusSipUsername" = '+17678189677'
WHERE "phoneNumber" = '+17678189677';

UPDATE phone_number_pool
SET "magnusSipUsername" = '+17678189958'
WHERE "phoneNumber" = '+17678189958';
```

---

## 🧪 Testing Commands

### Test Single Agent
```bash
curl -s "http://localhost:5001/api/user/agents/50ff393e-c787-4c35-9ce5-2d9752b5b7de/sip-status" | python3 -m json.tool
```

### Test All Your Agents
```bash
for agent_id in 50ff393e-c787-4c35-9ce5-2d9752b5b7de 1ec56668-757b-4bec-8192-3642c77db12f 8b7f8d81-90bc-4988-952c-a3e6b1b11b0f b90dae31-13bf-40e5-86fd-464432ab9751; do
  echo "Testing $agent_id..."
  curl -s "http://localhost:5001/api/user/agents/$agent_id/sip-status" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"  Status: {d['overall_status']}, Phone: {d.get('phone_number', 'NULL')}, SIP: {d.get('sip_username', 'NULL')}\")"
done
```

### Check Database
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT \"phoneNumber\", \"assignedToAgentId\", \"magnusSipUsername\"
   FROM phone_number_pool
   WHERE \"phoneNumber\" IN ('+17678189677', '+17678189958', '+17678189659', '+17678189504');"
```

---

## 🎉 Summary

### What Was Fixed:
✅ Backend now detects phone numbers assigned via `assignedToAgentId`
✅ Agents with phone numbers no longer show "NOT_PROVISIONED" (unless truly not provisioned)
✅ Both single and bulk endpoints updated
✅ Phone numbers now display correctly in UI

### What Works Now:
- ✅ **+17678189659**: Shows "ERROR" status with phone and SIP username
- ✅ **+17678189504**: Shows "ERROR" status with phone and SIP username

### What Needs Action:
- ⚠️ **+17678189677**: Provision SIP account (magnusSipUsername is empty)
- ⚠️ **+17678189958**: Provision SIP account (magnusSipUsername is empty)

### Next Steps:
1. **Refresh your browser** (Ctrl+Shift+R) to see the updated status
2. **Provision SIP accounts** for the two numbers missing credentials
3. **Start LiveKit agents** to register SIP trunks and change status from "error" to "registered"

---

## 📝 Technical Details

### Files Modified:
- `/opt/livekit1/backend/sip_status_api.py` (lines 103-130, 277-351)

### Deployment:
- Backend: ✅ Restarted (Flask on port 5001)
- Frontend: ✅ Running (Next.js on port 3000)
- Database: ✅ No schema changes needed

### Git Commit:
```
commit a7082f2
Fix SIP status detection for agents without did_number field
```

---

**Issue Resolved:** ✅ Backend now correctly detects phone numbers via both `did_number` and `assignedToAgentId`
**User Impact:** Your agents will now show correct provisioning status
**Action Required:** Provision SIP accounts for +17678189677 and +17678189958
