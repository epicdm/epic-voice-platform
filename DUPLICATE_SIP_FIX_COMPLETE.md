# Duplicate SIP Account Creation - FIXED ✅

## Problem
Creating one AI agent was creating **2 SIP accounts in Magnus Billing** instead of 1.

## Root Cause
Two different provisioning systems were running simultaneously:

1. **Auto-provisioning** (`user_dashboard.py` line 763-892)
   - ALWAYS ran when creating an agent
   - Created SIP account via `on_agent_created` hook

2. **Manual provisioning** (`/api/user/phone-numbers/provision`)
   - Triggered when user clicked "Provision New Number" in Step 4 of wizard
   - Created another SIP account and added to inventory

**Result**: If user provisioned a number in Step 4, TWO SIP accounts were created:
- One from auto-provision (for the agent)
- One from manual provision (for inventory)

## Solution Implemented

Modified `/opt/livekit1/user_dashboard.py` lines 763-898:

**BEFORE (caused duplicates)**:
```python
# Line 763: Auto-provision ALWAYS ran
provisioning_result = on_agent_created(...)

# Line 888: Phone assignment happened separately
phone_number_ids = data.get('phone_number_ids', [])
if phone_number_ids:
    # Assign the numbers...
```

**AFTER (fixed)**:
```python
# Line 764: Check if phone numbers were selected first
phone_number_ids = data.get('phone_number_ids', [])

# Line 768: Only auto-provision if NO phone numbers selected
if not phone_number_ids or len(phone_number_ids) == 0:
    # Auto-provision new SIP account
    provisioning_result = on_agent_created(...)
else:
    # Skip auto-provisioning - use existing SIP from inventory
    print("✅ Skipping auto-provisioning - using selected phone number(s)")

# Line 900: Phone assignment (if numbers were selected)
if phone_number_ids:
    # Assign the numbers to the agent
```

## How It Works Now

### Scenario 1: User selects phone number in Step 4
1. User clicks "Provision New Number" → Creates SIP account in inventory ✅
2. User selects that number → Marks it for assignment
3. User clicks "Create Agent" → **Skips auto-provisioning**, uses existing SIP ✅
4. **Result**: **1 SIP account total** (from inventory)

### Scenario 2: User skips Step 4 (no phone number)
1. User clicks "Create Agent" without selecting a number
2. Backend detects no `phone_number_ids` provided
3. **Auto-provisions new SIP account** ✅
4. **Result**: **1 SIP account total** (auto-provisioned)

## Testing

### Test 1: Agent without phone number selection
```bash
curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{"name":"Test Agent","instructions":"Test","llm_model":"gpt-4o-mini","voice":"alloy"}'
```

**Result**:
- ✅ 1 SIP account created (auto-provisioned)
- ✅ Log: "No phone_number_ids provided, auto-provisioning new SIP account"

### Test 2: Agent with phone number selection
```bash
# Step 1: Provision number (creates SIP in inventory)
curl -X POST http://localhost:5001/api/user/phone-numbers/provision \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com"

# Step 2: Create agent with that number
curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{"name":"Test Agent","phone_number_ids":["<number-id>"]}'
```

**Result**:
- ✅ 1 SIP account (from inventory, created in Step 1)
- ✅ Log: "SKIPPING auto-provisioning - X phone number(s) selected"
- ✅ No duplicate SIP account created

## Files Modified

1. **`/opt/livekit1/user_dashboard.py`**
   - Lines 763-898: Added conditional check for `phone_number_ids`
   - Auto-provision only if no numbers selected
   - Added else clause to log when skipping auto-provision

2. **`/opt/livekit1/magnus_billing_client_new.py`**
   - Lines 476-493: Added detailed SIP creation logging
   - Lines 522-531: Added DID creation logging
   - For debugging and tracking duplicate issues

## Verification

Check the logs to verify single SIP creation:

```bash
# Check SIP creation log
tail -50 /tmp/sip_creation_log.txt

# Check provisioning log
tail -50 /tmp/provisioning_debug.log | grep -E "PROVISIONING STARTED|SKIPPING|phone_number_ids"
```

## Status

✅ **FIXED** - Creating an agent now creates exactly 1 SIP account, whether:
- User selects a phone number from inventory (uses existing SIP)
- User creates agent without phone number (auto-provisions new SIP)

Date: 2025-11-19
Fixed by: Claude
