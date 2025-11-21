# GUI Test Call Issue - Complete Summary

## ✅ What WORKS

**CLI Test Calls**: 100% Working
```bash
cd /opt/livekit1
lk sip participant create --room test-123 --trunk ST_sTo8gGpNbXzY --call +17672958382 --number +17678183366
```
- ✅ Room created
- ✅ SIP participant created
- ✅ Agent automatically joins
- ✅ SIP INVITE sent to Asterisk
- ❌ Asterisk returns 403 (dialplan issue - separate problem)

## ❌ What DOESN'T WORK

**GUI Test Calls**: Failing
```
User clicks "Test Call" → Enters phone number → Clicks "Initiate Call"
```
- ✅ Room created (HTTP 200)
- ✅ SIP participant created (HTTP 200)
- ❌ **Agent does NOT join**
- ❌ Room closes immediately (empty_timeout)
- ❌ NO SIP INVITE sent to Asterisk

## Root Cause

**The agent worker doesn't receive job requests for GUI-created rooms.**

### What We Tried

1. **Removed agent_name filtering**: Didn't work
2. **Added CreateDispatch API call**: Returns 200 OK but agent still doesn't receive job
3. **Specified specific agent_name**: Broke everything (even CLI stopped working)
4. **Reverted to default config**: CLI works again, GUI still doesn't

### The Difference

**CLI Command** (`lk sip participant create`):
- Internally handles agent dispatch logic
- Agent automatically receives job request ✅

**Manual API Calls** (our backend):
```python
1. RoomService.CreateRoom() ✅
2. SIPService.CreateSIPParticipant() ✅  
3. AgentDispatchService.CreateDispatch() ← Returns 200 but doesn't dispatch!
```

## Current State

**Agent**: Running and registered (Worker ID: AW_KhZTj2swovX3)
**Backend**: Running on :5001
**Frontend**: Running on :3001
**Database**: Status = deployed

**Status**:
- CLI test: ✅ Works perfectly
- GUI test: ❌ Agent doesn't join rooms

## The Problem

LiveKit Cloud's `AgentDispatchService.CreateDispatch` API:
- Returns HTTP 200 OK ✅
- But agent never receives the job request ❌

This suggests either:
1. We're calling the API incorrectly
2. Additional configuration is needed in LiveKit Cloud
3. There's a different API/method for automatic dispatch
4. The agent needs to be configured differently to receive dispatches

## Possible Solutions (Not Yet Implemented)

### Option 1: LiveKit Cloud Dispatch Rules
Configure automatic dispatch rules in LiveKit Cloud dashboard:
- **Room pattern**: `outbound-call-*`
- **Agent**: Any available agent

This would make LiveKit automatically dispatch matching rooms to agents.

### Option 2: Agent Room Subscription
Modify the agent to subscribe to specific room patterns and auto-join:
- Could watch for rooms matching `outbound-call-*`
- Manually join when detected

### Option 3: Find Correct API Usage
Research the correct way to use AgentDispatchService or find an alternative API that properly triggers agent dispatch.

### Option 4: Use SIP Participant Metadata
Maybe SIPService.CreateSIPParticipant supports metadata or parameters that trigger automatic agent dispatch.

## Recommendation

Since fixing Asterisk's 403 error is the stated priority, I recommend:

1. **First**: Fix the Asterisk dialplan (add extension for +17672958382)
2. **Then**: Use CLI tests to verify calls work end-to-end with Asterisk
3. **Finally**: Circle back to fix GUI dispatch issue

**Reason**: The CLI test already proves the full stack works (when agent joins). The GUI issue is specifically about LiveKit's agent dispatch system, which might require LiveKit Cloud configuration changes or different API usage that we haven't discovered yet.

## Testing Commands

**Verify Agent Status**:
```bash
ps aux | grep "main.py start" | grep -v grep
cd /opt/livekit1/agents/sales_agent && tail -5 agent.log | grep "registered worker"
```

**CLI Test (Works)**:
```bash
cd /opt/livekit1
./test_sip_cli.sh
```

**Check Agent Activity**:
```bash
cd /opt/livekit1/agents/sales_agent
tail -f agent.log | grep "received job request"
```

**GUI Test (Currently Fails)**:
1. Browser: http://localhost:3001/agents
2. Click "Test Call" on Sales Agent
3. Enter: 17672958382
4. Click "Initiate Call"
5. Check agent logs - will see NO "received job request"

## Next Steps

You mentioned you'll fix the 403 error on Asterisk first. That's the right approach.

Once Asterisk is fixed:
1. Use CLI tests to verify full call flow works
2. Then we can debug the GUI dispatch issue separately

The GUI issue is a LiveKit Cloud agent dispatch configuration problem, not related to SIP/Asterisk.
