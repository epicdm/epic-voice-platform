# Inbound Call Routing Fix - EPIC Sales Agent

**Date**: October 28, 2025
**Issue**: Inbound calls to +17678189426 routed to wrong agent (tst0002 instead of EPIC Sales Agent)

---

## 🔍 Root Cause Analysis

### Problem #1: Regex Mismatch
**Room Name**: `sip-call___17678183742_gPdyALEyVKoB` (3 underscores)
**Regex Pattern**: `r'sip-call__(\d+)_'` (expected 2 underscores)
**Result**: Regex didn't match, phone extraction failed

### Problem #2: Wrong Phone Number
**Room Name Contains**: Caller's phone number (+17678183742)
**Need to Look Up**: Called number (DID: +17678189426)
**Result**: Even if regex worked, would query database for wrong number

### Problem #3: No Metadata Check
**Dispatch Rule Sets**: `phone_number` in metadata with called number
**Agent Code**: Never checked room metadata
**Result**: Couldn't access the called number we need

---

## ✅ Fixes Applied

### Fix #1: Flexible Regex Pattern
**File**: [agents/tst0002/agent_logic.py:63](agents/tst0002/agent_logic.py:63)

```python
# BEFORE (Broken)
match = re.search(r'sip-call__(\d+)_', room_name)  # Requires exactly 2 underscores

# AFTER (Fixed)
match = re.search(r'sip-call__+(\d+)_', room_name)  # Matches 2 or more underscores
```

**Why**: LiveKit may create room names with 2 or 3 underscores depending on configuration

### Fix #2: Use Room Metadata for Called Number
**File**: [agents/tst0002/agent_logic.py:85-121](agents/tst0002/agent_logic.py:85-121)

**Added Code**:
```python
# Log room metadata for debugging
if hasattr(ctx.room, 'metadata') and ctx.room.metadata:
    logger.info(f"Room metadata: {ctx.room.metadata}")

# Extract called number from room metadata (set by dispatch rule)
called_number = None
if hasattr(ctx.room, 'metadata') and ctx.room.metadata:
    try:
        import json
        metadata = json.loads(ctx.room.metadata)
        called_number = metadata.get('phone_number')
        if called_number:
            logger.info(f"📞 Called number from metadata: {called_number}")
    except Exception as e:
        logger.warning(f"Failed to parse room metadata: {e}")

# Look up agent config by called number (the DID)
if called_number:
    db_config = await load_agent_config_by_phone(called_number)
    routing_method = f"phone:{called_number}"
else:
    # Fallback to caller number if metadata not available
    logger.warning(f"No called number found in metadata, trying caller number")
    db_config = await load_agent_config_by_phone(caller_phone)
    routing_method = f"phone:{caller_phone}"
```

**Why**: The dispatch rule we created includes the called number in metadata, so we can retrieve it and use it for lookup

### Fix #3: Improved Logging
**File**: [agents/tst0002/agent_logic.py:98](agents/tst0002/agent_logic.py:98)

```python
# BEFORE (Confusing)
logger.info(f"📞 Incoming call to: {phone_number}")  # Actually the caller!

# AFTER (Clear)
logger.info(f"📞 Incoming call FROM: {caller_phone}")
logger.info(f"📞 Called number from metadata: {called_number}")
```

**Why**: Makes it clear which number is the caller and which is the called number

---

## 🔄 How It Works Now

### Inbound Call Flow
```
1. User calls +17678189426
   ↓
2. LiveKit SIP Trunk receives call
   ↓
3. Dispatch Rule SDR_HZm6joACCxvj matches
   ↓
4. Creates room: "sip-call___17678183742_<random>"
   - Room name contains CALLER number
   - Room metadata contains CALLED number (+17678189426)
   ↓
5. Routes to agent: "tst0002" (physical agent)
   ↓
6. Agent starts with ctx.room.name and ctx.room.metadata
   ↓
7. Agent extracts:
   - caller_phone = "+17678183742" (from room name)
   - called_number = "+17678189426" (from room metadata)
   ↓
8. Agent queries database:
   SELECT * FROM phone_mappings WHERE phoneNumber = '+17678189426'
   ↓
9. Finds: agentConfigId = '139d8d20-293d-4a1b-817f-73cc7f35b1ee'
   ↓
10. Loads EPIC Sales Agent configuration from database
   ↓
11. Agent answers call with EPIC's instructions, voice, model
```

---

## 🧪 Testing Instructions

### Test 1: Inbound Call (Primary Test)
1. **Call +1 (767) 818-9426** from your phone
2. **Wait** for agent to answer
3. **Listen** for EPIC Sales Agent greeting:
   > "Good morning/afternoon, I'm with EPIC Communications — Dominica's locally-owned IT & telecom partner..."

**Expected Logs**:
```bash
tail -f /opt/livekit1/agents/tst0002/agent.log | grep -E "Starting agent|Room metadata|FROM|Called number|Loaded agent config|EPIC"
```

Should show:
```
Starting agent: tst0002 for room: sip-call___17678183742_<random>
Room metadata: {"user_id": "...", "agent": "EPIC Sales Agent", "phone_number": "+17678189426"}
📞 Incoming call FROM: +17678183742
📞 Called number from metadata: +17678189426
Loaded agent config by phone: EPIC Sales Agent
🔀 Routing: phone:+17678189426
Using database config for agent: EPIC Sales Agent
```

### Test 2: Verify Database Lookup
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -c "SELECT \"phoneNumber\", \"agentConfigId\" FROM phone_mappings WHERE \"phoneNumber\" = '+17678189426';"
```

Should show:
```
  phoneNumber   |            agentConfigId
----------------+--------------------------------------
 +17678189426   | 139d8d20-293d-4a1b-817f-73cc7f35b1ee
```

### Test 3: Verify Agent Config
```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -c "SELECT id, name, status FROM agent_configs WHERE id = '139d8d20-293d-4a1b-817f-73cc7f35b1ee';"
```

Should show:
```
                  id                  |       name       |  status
--------------------------------------+------------------+----------
 139d8d20-293d-4a1b-817f-73cc7f35b1ee | EPIC Sales Agent | deployed
```

---

## 📊 Previous vs Current Behavior

### Before Fix
```
Incoming call to +17678189426
  ↓
Room: sip-call___17678183742_<random>
  ↓
Agent: Could not extract phone number (regex mismatch)
  ↓
Falls back to default: tst0002 config ❌
  ↓
User hears: Generic tst0002 agent response
```

### After Fix
```
Incoming call to +17678189426
  ↓
Room: sip-call___17678183742_<random>
Metadata: {"phone_number": "+17678189426"}
  ↓
Agent: Extracts called number from metadata ✅
  ↓
Queries DB: phone_mappings WHERE phoneNumber = '+17678189426'
  ↓
Loads: EPIC Sales Agent config ✅
  ↓
User hears: EPIC sales pitch with correct voice/instructions
```

---

## 🐛 Troubleshooting

### If Still Routes to Wrong Agent

1. **Check Agent Logs**:
```bash
tail -50 /opt/livekit1/agents/tst0002/agent.log | grep -E "Room metadata|Called number|Loaded agent config"
```

Look for:
- ✅ "Room metadata" line should show phone_number
- ✅ "Called number from metadata" should show +17678189426
- ✅ "Loaded agent config by phone: EPIC Sales Agent"

2. **Check Dispatch Rule Metadata**:
```python
python3 -c "
import asyncio
from livekit_telephony import LiveKitTelephonyManager

async def check():
    lt = LiveKitTelephonyManager()
    result = await lt.list_dispatch_rules()
    for rule in result.get('rules', []):
        if rule.get('rule_id') == 'SDR_HZm6joACCxvj':
            print(f'Metadata: {rule.get(\"metadata\")}')

asyncio.run(check())
"
```

Should show: `{"user_id": "...", "agent": "EPIC Sales Agent", "phone_number": "+17678189426"}`

3. **Check Room Metadata During Call**:
Look for this line in logs right after "Starting agent":
```
Room metadata: {"source": "inbound_call", "user_id": "...", "phone_number": "+17678189426"}
```

### If Regex Still Fails

The regex now matches `__+` (2 or more underscores), so it should work for:
- `sip-call__17678183742_<random>` (2 underscores)
- `sip-call___17678183742_<random>` (3 underscores)
- `sip-call____17678183742_<random>` (4+ underscores)

If it still fails, check the exact room name format in logs.

### If Database Lookup Fails

```bash
# Verify phone mapping exists
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  -c "SELECT * FROM phone_mappings WHERE \"phoneNumber\" = '+17678189426';"

# Should return 1 row with agentConfigId = '139d8d20-293d-4a1b-817f-73cc7f35b1ee'
```

If no rows, re-assign the phone number:
```bash
curl -X POST http://localhost:5001/api/user/phone-numbers/+17678189426/assign \
  -H "X-User-Email: giraud.eric@gmail.com" \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "139d8d20-293d-4a1b-817f-73cc7f35b1ee"}'
```

---

## 📝 Files Modified

### 1. [/opt/livekit1/agents/tst0002/agent_logic.py](agents/tst0002/agent_logic.py)
**Lines Changed**: 63, 85-121

**Changes**:
- Line 63: Updated regex to `r'sip-call__+(\d+)_'` (flexible underscore matching)
- Lines 85-87: Added room metadata logging
- Lines 93-121: Complete rewrite of inbound call routing logic:
  - Extract caller phone from room name
  - Extract called number from room metadata
  - Use called number for database lookup
  - Improved logging for debugging

### 2. Agent Restart
- Killed old agent process (PID 422846)
- Started new agent process (PID 475462)
- Agent now running with updated code

---

## ✅ Verification Checklist

### Before Testing
- [x] Agent process restarted (PID 475462)
- [x] Updated code loaded (agent_logic.py with metadata parsing)
- [x] Dispatch rule exists (SDR_HZm6joACCxvj)
- [x] Phone mapping exists (+17678189426 → EPIC Sales Agent)
- [x] Agent config deployed (EPIC Sales Agent status=deployed)

### After Testing (User to Complete)
- [ ] Inbound call connects
- [ ] Agent answers with EPIC Sales Agent voice/greeting
- [ ] Logs show correct routing (called number from metadata)
- [ ] Database lookup successful (EPIC Sales Agent config loaded)

---

## 🎉 Expected Outcome

**When you call +1 (767) 818-9426:**

1. ✅ **Call connects** immediately (no ring-no-answer)
2. ✅ **Agent answers** within 1-2 seconds
3. ✅ **EPIC greeting** plays with correct voice and instructions:
   > "Good morning/afternoon, I'm with EPIC Communications — Dominica's locally-owned IT & telecom partner. We help businesses and individuals stay connected and productive by offering reliable internet + voice services backed by local support, professional PC and hardware repair, maintenance and upgrades, and powerful business-software solutions built on Odoo..."

4. ✅ **Logs confirm** routing:
   ```
   📞 Incoming call FROM: +17678183742
   📞 Called number from metadata: +17678189426
   Loaded agent config by phone: EPIC Sales Agent
   🔀 Routing: phone:+17678189426
   ```

---

**Status**: ✅ Fixes applied, agent restarted, ready for testing
**Next Step**: User to test inbound call to +1 (767) 818-9426
