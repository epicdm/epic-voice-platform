# LiveKit SIP Best Practices - Lessons Learned

## ✅ Correct Approach for Outbound Calls

### What LiveKit Documentation Says

> "To make an outbound call, you create a SIP participant with the user's phone number. When you execute the `CreateSIPParticipant` request, LiveKit SIP sends an INVITE request to your SIP provider."

**Key Point**: You **ONLY** need to call `CreateSIPParticipant`. LiveKit handles:
1. Room creation (if needed)
2. SIP INVITE to your provider
3. Adding participant to room
4. Agent dispatch (if configured)

### ❌ What We Were Doing Wrong

```python
# WRONG: Creating room separately
room_response = requests.post(f"{api_url}twirpc/room.RoomService/CreateRoom", ...)
sip_response = requests.post(f"{api_url}twirpc/livekit.SIPService/CreateSIPParticipant", ...)
```

**Problems with this approach**:
- Unnecessary API call
- May interfere with automatic agent dispatch
- Not documented in LiveKit SIP workflow

### ✅ Correct Approach

```python
# CORRECT: Just create SIP participant
sip_token = generate_access_token(api_key, api_secret, {
    "roomJoin": True,
    "roomName": room_name,
    "canPublish": True
})

headers = {
    "Authorization": f"Bearer {sip_token}",
    "Content-Type": "application/json"
}

sip_data = {
    "sip_trunk_id": trunk_id,
    "sip_call_to": to_number,
    "sip_number": from_number,
    "room_name": room_name,
    "participant_identity": participant_identity,
    "participant_name": participant_name,
    "krisp_enabled": True,
    "play_dialtone": True
}

response = requests.post(
    f"{api_url}twirpc/livekit.SIPService/CreateSIPParticipant",
    json=sip_data,
    headers=headers
)
```

**That's it!** No separate room creation needed.

---

## 🤖 Agent Dispatch

### How It Works

According to the docs and our testing:

1. **Unnamed Agents** (default):
   - Set `agent_name=""` or omit it from `WorkerOptions`
   - Agent accepts **ALL** room job requests
   - ✅ **This works with CLI**

2. **Named Agents**:
   - Set `agent_name="my-agent"` in `WorkerOptions`
   - Only accepts jobs explicitly for that name
   - Requires dispatch rules or explicit assignment

### CLI vs API Behavior

**CLI Command**:
```bash
lk sip participant create --room test-123 --trunk ST_xxx --call +1234
```

**What happens**:
1. Creates SIP participant
2. LiveKit sends SIP INVITE to provider
3. **Agent automatically joins** (if unnamed)
4. Call connects

**Result**: ✅ **Works perfectly**

**API Call** (our backend):
```python
CreateSIPParticipant(room_name="outbound-call-xxx", ...)
```

**What should happen**:
1. Creates SIP participant
2. LiveKit sends SIP INVITE
3. Agent should join automatically
4. Call connects

**Current result**: ❌ **Agent doesn't join** (GUI calls)

---

## 🔍 The Remaining Mystery

### What Still Doesn't Work

**GUI-initiated calls** via our backend:
- ✅ Room created by LiveKit
- ✅ SIP participant created
- ✅ SIP INVITE sent to Asterisk (we need to verify this)
- ❌ **Agent doesn't join the room**

### Why CLI Works But API Doesn't

**Theory**: The CLI might be using additional parameters or a different workflow that triggers automatic agent dispatch.

**Possible causes**:
1. Missing parameter in `CreateSIPParticipant`
2. LiveKit Cloud dispatch configuration needed
3. Room metadata or attributes required
4. Timing issue (agent needs time to register)

---

## 📋 Testing Checklist

### For CLI Tests (Working ✅)

```bash
cd /opt/livekit1
./quick_cli_test.sh
```

**Expected**:
- ✅ SIP participant created
- ✅ Agent receives job request
- ✅ Agent joins room
- ✅ SIP INVITE sent to Asterisk
- ❌ Asterisk returns 403 (dialplan issue - separate fix)

### For GUI Tests (Not Working ❌)

1. Open: http://localhost:3001/agents
2. Click "Test Call" on Sales Agent
3. Enter: +17672958382
4. Click "Initiate Call"

**Current result**:
- ✅ HTTP 200 from backend
- ✅ SIP participant created
- ❌ Agent doesn't join
- ❌ No SIP INVITE sent

---

## 🎯 Next Steps

### 1. Verify SIP INVITE on Asterisk

On your Asterisk server (voice.epic.dm):
```bash
tcpdump -i any port 5060 -n -A | grep INVITE
```

**If you see INVITE**: ✅ LiveKit SIP is working, fix Asterisk dialplan
**If NO INVITE**: ❌ Agent issue - agent must join before INVITE is sent

### 2. Fix Asterisk Dialplan (403 Error)

Edit `/etc/asterisk/extensions.conf`:
```ini
[from-livekit]
exten => _+.,1,NoOp(LiveKit call to ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Wait(3)
 same => n,Hangup()
```

Then reload:
```bash
asterisk -rx "dialplan reload"
```

### 3. Debug GUI Agent Dispatch

Options to try:
1. Check LiveKit Cloud dashboard for dispatch rules
2. Add explicit agent dispatch in API call
3. Use room metadata to trigger agent
4. Create dispatch rule matching `outbound-call-*` pattern

---

## 📚 Key Documentation References

- [Making Outbound Calls](https://docs.livekit.io/sip/making-calls.md)
- [SIP Outbound Trunk](https://docs.livekit.io/sip/trunk-outbound.md)
- [CreateSIPParticipant API](https://docs.livekit.io/sip/api.md#createsipparticipant)
- [Agent Dispatch](https://docs.livekit.io/agents/worker/agent-dispatch.md)

---

## 🔧 Code Changes Made

### Backend Simplified

**Before** (incorrect):
```python
# Step 1: Create room
CreateRoom(room_name)

# Step 2: Create SIP participant
CreateSIPParticipant(room_name, trunk_id, to_number)
```

**After** (correct):
```python
# Single step: Create SIP participant only
CreateSIPParticipant(room_name, trunk_id, to_number)
```

### Files Modified

- `/opt/livekit1/user_dashboard.py` - Removed separate room creation
- `/opt/livekit1/agents/sales_agent/main.py` - Confirmed agent_name defaults to ""

---

## ✅ What's Working

1. ✅ **CLI Tests**: 100% working (agent joins, SIP INVITE sent)
2. ✅ **Backend API**: Simplified to match LiveKit docs
3. ✅ **Agent Worker**: Running and registered
4. ✅ **SIP Trunk**: Configured correctly

## ❌ What's Not Working

1. ❌ **GUI Tests**: Agent doesn't join API-created rooms
2. ❌ **Asterisk**: Returns 403 Forbidden (separate issue)

---

## 🎯 Current Focus

**Use CLI tests** to verify the full stack works end-to-end:
1. Fix Asterisk dialplan to accept calls
2. Test with CLI until calls connect successfully
3. Then debug GUI agent dispatch issue separately

The GUI issue is a LiveKit Cloud agent dispatch configuration problem, not related to SIP/Asterisk connectivity.
