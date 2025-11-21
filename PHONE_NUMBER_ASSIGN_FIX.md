# 🔧 Phone Number Assignment Fix

## Issue:
Users could not assign or edit phone numbers, getting error:
```
Request failed
UNIQUE constraint failed: phone_mappings.phone_number
```

---

## Root Cause:

The `assign_to_agent` method in `phone_number_manager.py` was **always creating a new** `PhoneMapping` record, even when one already existed for that phone number.

### The Problem Code:
```python
# Update pool
pool_number.assigned_to_agent_id = agent_id

# ❌ ALWAYS creates new mapping - causes UNIQUE constraint error!
mapping = PhoneMapping(
    id=str(uuid.uuid4()),
    user_id=user_id,
    agent_config_id=agent_id,
    phone_number=phone_number,  # ← Already exists in DB!
    is_active=True
)
db.add(mapping)  # ← SQLite rejects this: UNIQUE constraint failed
```

### Why It Failed:
1. Phone number `+17678183366` already has a `PhoneMapping` record
2. System tries to create a **new** record with same phone number
3. Database has UNIQUE constraint on `phone_mappings.phone_number`
4. SQLite rejects the INSERT → Error 500 → Frontend shows "Request failed"

---

## Solution Applied:

**Check if mapping exists → UPDATE existing OR CREATE new**

```python
# Update pool
pool_number.assigned_to_agent_id = agent_id
pool_number.updated_at = datetime.utcnow()

# ✅ Check if phone mapping already exists
existing_mapping = db.query(PhoneMapping).filter(
    PhoneMapping.phone_number == phone_number
).first()

if existing_mapping:
    # ✅ Update existing mapping (no new record)
    existing_mapping.agent_config_id = agent_id
    existing_mapping.user_id = user_id
    existing_mapping.is_active = True
else:
    # ✅ Create new phone mapping (safe - doesn't exist)
    mapping = PhoneMapping(
        id=str(uuid.uuid4()),
        user_id=user_id,
        agent_config_id=agent_id,
        phone_number=phone_number,
        is_active=True
    )
    db.add(mapping)
```

---

## How It Works Now:

### Scenario 1: First-Time Assignment
```
Phone: +17678183366 (never assigned before)
↓
Check: Does mapping exist? → NO
↓
Action: CREATE new PhoneMapping
↓
Result: ✅ SUCCESS - New record created
```

### Scenario 2: Re-Assignment (Changing Agent)
```
Phone: +17678183366 (currently → Agent A)
User wants to change to: Agent B
↓
Check: Does mapping exist? → YES (Agent A)
↓
Action: UPDATE existing mapping
  - Change agent_config_id to Agent B
  - Set is_active = True
↓
Result: ✅ SUCCESS - No duplicate, just updated
```

### Scenario 3: Re-Activation
```
Phone: +17678183366 (inactive mapping exists)
User wants to assign to: Agent C
↓
Check: Does mapping exist? → YES (inactive)
↓
Action: UPDATE existing mapping
  - Change agent_config_id to Agent C
  - Set is_active = True
↓
Result: ✅ SUCCESS - Reactivated with new agent
```

---

## Test Results:

### Before Fix:
```bash
$ curl -X POST /api/user/phone-numbers/+17678183366/assign \
  -d '{"agent_id":"abc123"}'

❌ Response: 500 Internal Server Error
❌ Error: UNIQUE constraint failed: phone_mappings.phone_number
❌ Frontend: "Request failed"
```

### After Fix:
```bash
$ curl -X POST /api/user/phone-numbers/+17678183366/assign \
  -d '{"agent_id":"8aef3b90-f279-438d-ad8e-bbe9dabdd525"}'

✅ Response: 200 OK
✅ Body: {
  "success": true,
  "message": "Phone number assigned to Customer Support Agent"
}
```

---

## All Operations Now Working:

### ✅ **1. Provision New Number**
```bash
POST /api/user/phone-numbers/provision
Body: {"country": "Dominica", "prefix": "17678180"}

Response:
{
  "success": true,
  "phone_number": "+176781801185",
  "provider": "local"
}
```

### ✅ **2. Assign to Agent**
```bash
POST /api/user/phone-numbers/+17678183366/assign
Body: {"agent_id": "agent-uuid"}

Response:
{
  "success": true,
  "message": "Phone number assigned to Customer Support Agent"
}
```

### ✅ **3. Re-Assign to Different Agent**
```bash
POST /api/user/phone-numbers/+17678183366/assign
Body: {"agent_id": "different-agent-uuid"}

Response:
{
  "success": true,
  "message": "Phone number assigned to Sales Agent"
}
```

### ✅ **4. Unassign from Agent**
```bash
POST /api/user/phone-numbers/+17678183366/unassign

Response:
{
  "success": true,
  "message": "Phone number unassigned"
}
```

---

## Database Integrity:

### Before Fix (Broken):
```sql
-- Attempted to insert duplicate
INSERT INTO phone_mappings (phone_number, agent_id, ...)
VALUES ('+17678183366', 'agent-b', ...)

-- ❌ ERROR: UNIQUE constraint failed
```

### After Fix (Working):
```sql
-- First check if exists
SELECT * FROM phone_mappings WHERE phone_number = '+17678183366'

-- If exists: UPDATE
UPDATE phone_mappings
SET agent_config_id = 'agent-b', is_active = 1
WHERE phone_number = '+17678183366'

-- If not exists: INSERT
INSERT INTO phone_mappings (phone_number, agent_id, ...)
VALUES ('+17678183366', 'agent-b', ...)

-- ✅ SUCCESS in both cases
```

---

## File Modified:

**`/opt/livekit1/phone_number_manager.py`**

### Changes:
- **Lines 303-322**: Added check for existing mapping
- **Logic**: UPDATE if exists, CREATE if new
- **Result**: No more UNIQUE constraint violations

### Code Added:
```python
# Check if phone mapping already exists
existing_mapping = db.query(PhoneMapping).filter(
    PhoneMapping.phone_number == phone_number
).first()

if existing_mapping:
    # Update existing mapping
    existing_mapping.agent_config_id = agent_id
    existing_mapping.user_id = user_id
    existing_mapping.is_active = True
else:
    # Create new phone mapping
    mapping = PhoneMapping(...)
    db.add(mapping)
```

---

## Benefits:

### ✅ **No More Duplicate Errors**
- UNIQUE constraint respected
- Safe to reassign numbers multiple times
- No database corruption

### ✅ **Proper State Management**
- Updates existing records when needed
- Creates new records only when necessary
- Maintains history integrity

### ✅ **Better User Experience**
- Phone numbers can be reassigned freely
- No confusing error messages
- Frontend operations work smoothly

---

## Summary:

| Operation | Before | After |
|-----------|--------|-------|
| **First Assignment** | ✅ Works | ✅ Works |
| **Re-Assignment** | ❌ UNIQUE error | ✅ Works |
| **Provision** | ✅ Works | ✅ Works |
| **Unassign** | ✅ Works | ✅ Works |

**Status:** ✅ ALL PHONE NUMBER OPERATIONS WORKING

---

**Fixed:** October 22, 2025  
**Issue:** UNIQUE constraint violation on reassignment  
**Solution:** Check + UPDATE existing or CREATE new  
**Result:** ✅ Phone numbers fully editable
