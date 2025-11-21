# GUI Call Not Reaching Asterisk - Root Cause Found

## The Real Problem

When creating outbound calls via the GUI:
1. ✅ Room is created successfully
2. ✅ SIP participant is created successfully  
3. ❌ **Agent never receives a job request**
4. ❌ Room closes immediately (empty_timeout)
5. ❌ No SIP INVITE sent to Asterisk

## What We Tried

### Attempt 1: Remove agent_name filter
- Changed agent_name from requiring specific name to empty string
- **Result**: Still didn't work

### Attempt 2: Add CreateDispatch API call
- Added explicit agent dispatch after SIP participant creation
- **Result**: Dispatch created (200 OK), but agent still didn't receive job

### Attempt 3: Use specific agent name
- Set agent_name="sales-agent" in worker
- Set agent_name="sales-agent" in dispatch
- **Result**: Broke CLI tests too! Agent receives NOTHING now.

## The Core Issue

**LiveKit Agents with `agent_name` set will ONLY accept jobs explicitly for that name.**

**But**: The automatic job dispatch system doesn't seem to be working properly with our setup.

## The Solution

We need to use **RoomServiceC agent dispatch** correctly. The issue is that merely creating a dispatch isn't enough - we need to ensure:

1. Agent is truly "unnamed" (default `agent_name`)
2. OR we need to use LiveKit's automatic agent dispatch
3. OR we need to join the room directly from within the agent

Let me try approach #3: Have the GUI test directly trigger the agent to join a specific room.
