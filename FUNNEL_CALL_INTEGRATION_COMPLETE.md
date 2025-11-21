# 🎉 Funnel Call Integration Complete!

## Summary

LiveKit call initiation has been successfully integrated into the funnel CALL nodes. The system now **actually initiates real AI voice calls** when executing funnels with CALL nodes.

---

## ✅ What Was Implemented

### 1. Call Service (`/opt/livekit1/backend/funnel_engine/call_service.py`)
**Purpose**: Handles LiveKit SIP call initiation for CALL nodes

**Key Features**:
- Creates LiveKit room for each call
- Initiates SIP participant (outbound call)
- Stores call context (room_name, sip_call_id, participant_id)
- Supports execution_id tracking for webhook correlation

**Usage**:
```python
from backend.funnel_engine.call_service import CallService

call_service = CallService(db)
call_result = call_service.initiate_call(
    agent_id="7b885e98-8cfe-4d8a-947c-9eb24ad678e0",
    to_number="+17678189426",
    from_number="+17678183366",  # Optional
    execution_id="efb0b4d9-27de-4f5d-a536-dbea609215c9",
    node_id="51d38ebe-6c88-4021-b9f9-3afd1d2ca4ef"
)
```

### 2. Updated Executor (`/opt/livekit1/backend/funnel_engine/executor.py`)
**What Changed**: `_execute_call_node()` method now **actually initiates calls**

**Flow**:
1. ✅ Validates agent_id and phone number
2. ✅ Checks if call already initiated (idempotency)
3. ✅ Calls `CallService.initiate_call()` to create LiveKit room + SIP participant
4. ✅ Stores call details in `execution.context`
5. ✅ Returns "pending" status (waiting for webhook)
6. ✅ On re-processing: checks for call_outcome from webhook
7. ✅ Returns actual outcome once webhook received

### 3. Webhook Handlers (`/opt/livekit1/backend/funnel_engine/webhooks.py`)
**Purpose**: Receive call completion callbacks from LiveKit

**Endpoints**:
- **`POST /api/funnels/webhooks/call-completed`**
  - Custom webhook for manual call completion notifications
  - Updates `execution.context["call_outcome"]`
  - Re-queues CALL node for processing outcome

- **`POST /api/funnels/webhooks/livekit-event`**
  - Handles LiveKit's native room events
  - Auto-determines outcome based on call duration
  - Extracts execution_id from room name (format: `funnel-{exec_id[:8]}-{uuid}`)

**Webhook Payload Example**:
```json
{
  "execution_id": "efb0b4d9-27de-4f5d-a536-dbea609215c9",
  "room_name": "funnel-efb0b4d9-10d1829a-44da-4912-bfdc-9f360e7b15d8",
  "sip_call_id": "SCL_9sFoF6cQUXLG",
  "outcome": "answered",  // "answered", "no_answer", "voicemail", "failed"
  "duration": 120,
  "call_log_id": "uuid"
}
```

---

## 🧪 Test Results

### Test Case 3: Complete Funnel (CALL → DELAY → EMAIL)

**Funnel**: `4c3f3c10-19d6-4474-a22b-291945e9fd24`
**Execution**: `efb0b4d9-27de-4f5d-a536-dbea609215c9`

**Worker Logs**:
```
[INFO] CALL NODE: agent=7b885e98-8cfe-4d8a-947c-9eb24ad678e0,
                    phone=+17678189426,
                    execution=efb0b4d9-27de-4f5d-a536-dbea609215c9

[INFO] Initiating call: to=+17678189426, from=+17678183366,
                        room=funnel-efb0b4d9-10d1829a-44da-4912-bfdc-9f360e7b15d8

[INFO] Creating LiveKit room: funnel-efb0b4d9-10d1829a-44da-4912-bfdc-9f360e7b15d8
[INFO] ✅ Room created

[INFO] Creating SIP participant (calling +17678189426)
[INFO] ✅ SIP call initiated!
       SIP Call ID: SCL_9sFoF6cQUXLG
       Participant ID: PA_sVruHLHknidi
       Room: funnel-efb0b4d9-10d1829a-44da-4912-bfdc-9f360e7b15d8

[INFO] ✅ Call initiated: room=funnel-efb0b4d9-..., sip_call_id=SCL_9sFoF6cQUXLG
[INFO] ⏳ Call pending (waiting for completion webhook)
```

**Status**: ✅ **CALL SUCCESSFULLY INITIATED!**

---

## 🔄 Complete Funnel Flow

### Execution Flow (CALL → DELAY → EMAIL)

1. **Worker picks up CALL node from queue**
   - First attempt: Call not initiated
   - Calls `CallService.initiate_call()`
   - LiveKit creates room + SIP participant
   - Phone rings at +17678189426 📞
   - Stores call context in execution
   - Returns `"pending"` status
   - Worker marks stage as "pending (async operation)"

2. **Worker re-processes CALL node** (polling every ~60s)
   - Checks `execution.context["call_outcome"]`
   - If not set: returns `"pending"` again (still waiting)
   - If set: returns actual outcome (`"answered"`, `"no_answer"`, etc.)

3. **LiveKit sends webhook when call ends**
   - POST to `/api/funnels/webhooks/livekit-event`
   - Webhook extracts execution_id from room_name
   - Updates `execution.context["call_outcome"] = "answered"` (or other outcome)
   - Re-queues CALL node for immediate processing

4. **Worker processes CALL node with outcome**
   - Sees `execution.context["call_outcome"] = "answered"`
   - Returns `"answered"` as outcome
   - Executor uses outcome to determine next edge
   - If "answered" → DELAY node queued
   - If "no_answer" → EMAIL node queued (skip delay)

5. **DELAY node executes** (if call answered)
   - Waits 30 seconds
   - Queues EMAIL node

6. **EMAIL node executes**
   - Sends follow-up email via SMTP
   - Completes execution

---

## 📋 Next Steps to Make Fully Functional

### 1. Configure LiveKit Webhook URL

Add webhook in LiveKit Cloud Console:
```
https://ai.epic.dm/api/funnels/webhooks/livekit-event
```

**Events to subscribe**:
- `room_started`
- `room_finished`
- `participant_joined`
- `participant_left`

### 2. (Optional) Create Custom Call Completion Handler

If you want more control over call outcomes (not just duration-based), you can:
- Add call outcome tracking in existing `CallLog` system
- POST to `/api/funnels/webhooks/call-completed` when call ends
- Include detailed outcome (answered/voicemail/no_answer/busy/failed)

**Example**:
```python
# In your call completion handler
requests.post('https://ai.epic.dm/api/funnels/webhooks/call-completed', json={
    "execution_id": "efb0b4d9-27de-4f5d-a536-dbea609215c9",
    "room_name": "funnel-efb0b4d9-...",
    "sip_call_id": "SCL_9sFoF6cQUXLG",
    "outcome": "answered",  # or "no_answer", "voicemail", "failed"
    "duration": 120,
    "call_log_id": "uuid"
})
```

### 3. Test End-to-End Flow

1. Run test script: `python3 /opt/livekit1/test_case_3_complete_funnel.py`
2. **Answer the phone** when it rings at +17678189426
3. **Talk to the AI agent** (should be tst0002 agent)
4. **Hang up**
5. **Check your email** at giraud.eric@gmail.com
   - If you answered: Email arrives ~30 seconds after call ends
   - If you didn't answer: Email arrives immediately

---

## 🎯 What's Working vs What's Placeholder

### ✅ Fully Functional
1. **Funnel Creation** - API creates funnels, nodes, edges
2. **Funnel Activation** - Syncs to n8n (hybrid mode)
3. **Execution Triggering** - Start funnel with contact data
4. **CALL Node Initiation** - **Actually calls phone via LiveKit!** ✨
5. **EMAIL Node** - Sends real emails via Mailtrap SMTP
6. **DELAY Node** - Time-based delays work
7. **Worker Processing** - Queue-based execution
8. **Conditional Flow** - Edges based on outcomes

### ⏳ Needs Configuration
1. **Call Outcome Webhooks** - Configure LiveKit webhook URL
2. **Auto-determination Logic** - Currently uses duration > 5s = "answered"
   - You may want to integrate with more sophisticated call outcome detection

### 📝 Optional Enhancements
1. **SMS Nodes** - Waiting for custom SMS gateway
2. **Voicemail Detection** - More advanced outcome classification
3. **Call Recording Storage** - Link recordings to funnel executions
4. **Retry Logic** - Auto-retry failed calls

---

## 📊 Files Modified

### Created
- `/opt/livekit1/backend/funnel_engine/call_service.py` - Call initiation service
- `/opt/livekit1/backend/funnel_engine/webhooks.py` - Webhook handlers
- `/opt/livekit1/test_case_3_complete_funnel.py` - Test script

### Modified
- `/opt/livekit1/backend/funnel_engine/executor.py` - Updated `_execute_call_node()`
- `/opt/livekit1/user_dashboard.py` - Registered webhook blueprint

---

## 🚀 How to Use

### Create a Funnel with CALL Node

```python
import requests

# 1. Create funnel
funnel = requests.post('http://localhost:5001/api/funnels', json={
    "name": "Sales Follow-up",
    "description": "Call prospect, then send email"
}, headers={"X-User-Email": "admin@epic.dm"}).json()

# 2. Add CALL node
call_node = requests.post(f'http://localhost:5001/api/funnels/{funnel["id"]}/nodes', json={
    "label": "Sales Call",
    "node_type": "call",
    "config": {
        "agent_id": "7b885e98-8cfe-4d8a-947c-9eb24ad678e0",  # tst0002 agent
        "max_duration": 300,
        "record": True
    },
    "position": {"x": 100, "y": 100}
}, headers={"X-User-Email": "admin@epic.dm"}).json()

# 3. Add EMAIL node
email_node = requests.post(f'http://localhost:5001/api/funnels/{funnel["id"]}/nodes', json={
    "label": "Follow-up Email",
    "node_type": "email",
    "config": {
        "from_email": "noreply@epic.dm",
        "subject": "Thanks for the call!",
        "body": "Thanks for speaking with us..."
    },
    "position": {"x": 300, "y": 100}
}, headers={"X-User-Email": "admin@epic.dm"}).json()

# 4. Connect nodes
requests.post(f'http://localhost:5001/api/funnels/{funnel["id"]}/edges', json={
    "source_node_id": call_node["node_id"],
    "target_node_id": email_node["node_id"],
    "condition": "answered"
}, headers={"X-User-Email": "admin@epic.dm"})

# 5. Activate funnel
requests.put(f'http://localhost:5001/api/funnels/{funnel["id"]}', json={
    "status": "active"
}, headers={"X-User-Email": "admin@epic.dm"})

# 6. Execute funnel
requests.post(f'http://localhost:5001/api/funnels/{funnel["id"]}/start', json={
    "contact_data": {
        "phone": "+17678189426",
        "email": "giraud.eric@gmail.com",
        "name": "John Doe"
    }
}, headers={"X-User-Email": "admin@epic.dm"})
```

---

## 🎉 Success!

Your funnel system now **actually makes real AI voice calls** via LiveKit! When you create a funnel with a CALL node and execute it:

1. 📞 **Phone rings** at the target number
2. 🤖 **AI agent talks** to the person
3. ✅ **Call completes** with outcome
4. 🔄 **Funnel continues** based on outcome (answered/no_answer)
5. 📧 **Email sends** as follow-up

**Test it out** by running `/opt/livekit1/test_case_3_complete_funnel.py` and answering the phone!
