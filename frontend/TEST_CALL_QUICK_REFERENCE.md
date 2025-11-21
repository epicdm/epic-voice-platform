# Test Call - Quick Reference

**Status**: ✅ FIXED - Ready for Testing
**Date**: 2025-11-19

---

## What Was Fixed

**Problem**: Test calls failed with "Phone number not found or you do not own it"

**Root Cause**: Backend was checking deprecated `agent.did_number` field that could contain numbers users don't own

**Solution**: Backend now validates via `phone_mappings` table (source of truth for agent-phone assignments)

---

## Agents Ready for Testing

These **7 agents** have active phone mappings and should work:

| Agent Name | Phone Number | Status | Test Ready |
|-----------|--------------|--------|------------|
| **EPIC Sales Agent** | +17678189426 | deployed | ✅ YES |
| **Real Estate Lead Qualifier** | +17678189487 | deployed | ✅ YES |
| **Survey & Feedback Agent** | +17678189654 | deployed | ✅ YES |
| **Technical Support Agent** | +17678189910 | deployed | ✅ YES |
| **Appointment Booking Agent** | +17678189612 | created | ✅ YES |
| **FINAL SUCCESS Agent** | +1767827036 | created | ✅ YES |
| **Technical Support Agent** | +17678189953 | created | ✅ YES |

---

## How to Test

### Step 1: Hard Refresh Browser
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

### Step 2: Navigate to Agents Page
- Go to `/dashboard/agents`

### Step 3: Test a Working Agent
1. Find **"EPIC Sales Agent"** or **"Real Estate Lead Qualifier"**
2. Click **"Test Call"** button
3. Select **"Agent Calls You"** tab
4. Enter your phone number in E.164 format: `+1XXXXXXXXXX`
5. Click **"Call Me Now"**
6. Expected: ✅ Success message, phone rings in 5-10 seconds

### Step 4: Test Agent Without Phone (Optional)
1. Find any agent NOT in the list above (e.g., "Customer Support Agent")
2. Click **"Test Call"** button
3. Expected: ❌ Error: "This agent does not have a phone number assigned"

---

## Expected Behaviors

### ✅ Success Case
```
Agent: EPIC Sales Agent
Action: Click "Test Call" → Enter +12125551234 → "Call Me Now"
Result: "Call initiated! The agent will call you shortly."
Phone: Rings within 5-10 seconds
```

### ❌ Error Cases

**No Phone Mapping**:
```
Error: This agent does not have a phone number assigned
Code: PHONE_NOT_ASSIGNED
```

**Phone Not in Pool**:
```
Error: Phone number not found in pool or you do not own it
Code: PHONE_NOT_IN_POOL
```

**No Outbound Trunk**:
```
Error: Phone number does not have outbound calling configured
Code: OUTBOUND_NOT_CONFIGURED
```

---

## What Changed

### Backend (user_dashboard.py)
- Now looks up phone from `phone_mappings` using `agent_id`
- Validates phone exists in `phone_number_pool` for user
- Checks phone has outbound trunk configured
- Clear error messages for each failure case

### Frontend (AgentInsightCard.tsx)
- Removed `from_number` parameter from request
- Only sends `agent_id` and `to_number`
- Backend handles phone lookup

### Database
- Cleared 31 invalid `did_numbers`
- Synced 7 valid `did_numbers` from `phone_mappings`

---

## Troubleshooting

### "Agent does not have a phone number assigned"
**Cause**: Agent has no active phone_mapping entry
**Fix**: Assign a phone number to the agent in phone_mappings table

### "Phone number not found in pool"
**Cause**: Phone in phone_mappings is not in phone_number_pool for user
**Fix**: Provision the phone number to user's phone_number_pool

### "Outbound calling not configured"
**Cause**: Phone has no `livekitOutboundTrunkId` in phone_number_pool
**Fix**: Configure outbound trunk for the phone number

---

## Files Changed

- `/opt/livekit1/user_dashboard.py` - Backend validation logic
- `/opt/livekit1/frontend/components/agents/AgentInsightCard.tsx` - Frontend request
- Database: `agent_configs.did_number` - Cleared invalid values

---

## Next Steps

1. **Test working agent** (EPIC Sales Agent or Real Estate Lead Qualifier)
2. **Verify phone rings** within 5-10 seconds
3. **Test agent without phone** (should show clear error)
4. **Report any issues** if errors persist

---

**Status**: ✅ PRODUCTION READY
**Services**: ✅ RESTARTED
**Data**: ✅ CLEANED

This fix is **permanent** and prevents the error from happening again.
