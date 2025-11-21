# GUI vs CLI Call Debugging

## The Problem

**CLI Test**: ✅ Agent joins room, call reaches Asterisk (403 but SIP INVITE sent)
**GUI Test**: ❌ Agent does NOT join room, NO SIP INVITE sent to Asterisk

## Evidence

### Backend Logs Show GUI Calls ARE Created

```
14:32:53 - Room created: outbound-call-96ddd9ec-2eb0-4b0b-8d37-219b77837427
14:32:53 - SIP participant created successfully (HTTP 200)
14:33:30 - Room created: outbound-call-ff03f865-2837-48ca-b775-8399a19f14fc
14:33:30 - SIP participant created successfully (HTTP 200)
```

### Agent Logs Show Only CLI Calls

```
14:10:03 - received job request: test-agent-1761055801 ← CLI test
14:36:27 - received job request: test-1761057386 ← CLI test

NO job requests for:
❌ outbound-call-96ddd9ec-2eb0-4b0b-8d37-219b77837427
❌ outbound-call-ff03f865-2837-48ca-b775-8399a19f14fc
```

## Root Cause Analysis

### Why Agent Joins CLI Rooms But Not GUI Rooms

The difference is in **how the rooms are created**:

**CLI Call** (`lk sip participant create --room test-1761057386`):
1. Creates room
2. Creates SIP participant
3. LiveKit dispatches the room to available agents
4. Agent receives job request ✅
5. Agent joins room ✅
6. SIP INVITE sent ✅

**GUI Call**:
1. Backend creates room ✅
2. Backend creates SIP participant ✅
3. **LiveKit does NOT dispatch to agent** ❌
4. No job request ❌
5. Agent never joins ❌
6. Room times out and closes ❌
7. NO SIP INVITE sent ❌

## The Missing Piece: Agent Dispatch

When we create a SIP participant via the API, LiveKit needs to know **which agent worker** should handle the call.

### Current API Call (user_dashboard.py)

```python
sip_data = {
    "sip_trunk_id": sip_trunk_id,
    "sip_call_to": to_number,
    "sip_number": from_number,
    "room_name": room_name,
    "participant_identity": participant_identity,
    "participant_name": participant_name,
    "krisp_enabled": True,
    "wait_until_answered": False,
    "play_dialtone": True
}
```

**Missing**: No agent specification or dispatch rule!

## The Solution

We need to tell LiveKit which agent should handle these rooms. There are two approaches:

### Option 1: Add Dispatch Rule to Agent Worker

Configure the agent to automatically join rooms with specific patterns:

**File**: `/opt/livekit1/agents/sales_agent/main.py`

```python
def main():
    logger.info(f"Starting {AGENT_NAME} worker...")
    
    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        # Auto-join rooms that match these patterns
        room_filters=[
            "outbound-call-*",  # Join all outbound call rooms
            "test-*"            # Join test rooms (for CLI)
        ]
    )
    
    cli.run_app(options)
```

### Option 2: Add Agent Name to API Call

Specify the agent when creating the SIP participant:

**File**: `/opt/livekit1/user_dashboard.py`

```python
sip_data = {
    "sip_trunk_id": sip_trunk_id,
    "sip_call_to": to_number,
    "sip_number": from_number,
    "room_name": room_name,
    "participant_identity": participant_identity,
    "participant_name": participant_name,
    "agent_name": agent_name,  # ← ADD THIS
    "krisp_enabled": True,
    "wait_until_answered": False,
    "play_dialtone": True
}
```

### Option 3: Use Dispatch Rules in LiveKit Cloud (RECOMMENDED)

Configure LiveKit Cloud to automatically route rooms to agents based on patterns. This is done via:
- LiveKit Cloud dashboard
- Or via API with dispatch rules

**But this requires LiveKit Cloud configuration, not just code changes.**

## Recommended Fix: Option 1 (Room Filters)

This is the simplest and most reliable approach.

### Implementation

1. **Edit `/opt/livekit1/agents/sales_agent/main.py`**:

```python
def main():
    """Start the LiveKit agent worker"""
    logger.info(f"Starting {AGENT_NAME} worker...")
    
    options = WorkerOptions(
        entrypoint_fnc=entrypoint,
        # Auto-join any room that matches these patterns
        room_filters=[
            "outbound-call-*",  # All GUI outbound calls
            "test-*",           # CLI test calls
            "voice-chat-*"      # Any voice chat rooms
        ]
    )
    
    cli.run_app(options)
```

2. **Restart the agent**:

```bash
pkill -9 -f "/opt/livekit1/agents/sales_agent"
cd /opt/livekit1/agents/sales_agent
python3 main.py start > agent.log 2>&1 &
```

3. **Test GUI call again**

### Expected Result After Fix

```
1. User clicks "Test Call" in GUI
2. Backend creates room: outbound-call-XXXXX
3. Backend creates SIP participant
4. Agent worker sees room matches "outbound-call-*"
5. Agent dispatches job request ✅
6. Agent joins room ✅
7. LiveKit sends SIP INVITE to Asterisk ✅
8. (Asterisk still returns 403 - separate issue)
```

## Why CLI Works Without Room Filters

The CLI explicitly specifies `--room test-XXXXX`, which:
1. Creates the room
2. Creates SIP participant
3. LiveKit Cloud has default behavior to dispatch to ANY available agent when using CLI
4. Agent receives job and joins

But when using the API programmatically (GUI), LiveKit is more strict and requires either:
- Room filters in agent configuration
- Explicit agent_name in SIP create request
- Dispatch rules configured in LiveKit Cloud

## Summary

**Problem**: Agent has no room filter, so LiveKit Cloud doesn't dispatch GUI-created rooms to it.

**Solution**: Add room_filters to WorkerOptions in main.py

**Pattern**: `outbound-call-*` to match all GUI outbound calls

**After fix**: Agent will automatically join GUI rooms and SIP INVITE will be sent to Asterisk.
