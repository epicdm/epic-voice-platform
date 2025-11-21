# CLI vs GUI Comparison

## ✅ CLI Test (WORKS - Asterisk gets INVITE)

```bash
# Step 1: Create room
lk room create test-$TIMESTAMP

# Step 2: Create SIP participant
lk sip participant create \
  --room test-$TIMESTAMP \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity "cli-test-$TIMESTAMP" \
  --name "CLI Test Call"
```

**Result**: ✅ Asterisk receives SIP INVITE

---

## ❌ GUI/Backend Test (DOESN'T WORK - No INVITE to Asterisk)

### Current Backend Code:

```python
# Step 1: Create room
room_url = f"{api_url}twirpc/livekit.RoomService/CreateRoom"
room_data = {"name": room_name}
requests.post(room_url, json=room_data, headers=room_headers)

# Step 2: Create SIP participant
sip_url = f"{api_url}twirpc/livekit.SIPService/CreateSIPParticipant"
sip_data = {
    "sip_trunk_id": sip_trunk_id,      # ST_sTo8gGpNbXzY
    "sip_call_to": to_number,          # +17672958382
    "sip_number": from_number,         # +17678183366
    "room_name": room_name,            # outbound-call-xxx
    "participant_identity": participant_identity,
    "participant_name": participant_name
}
requests.post(sip_url, json=sip_data, headers=headers)
```

**Result**: ❌ Asterisk does NOT receive SIP INVITE

---

## 🔍 Possible Issues

### 1. Field Name Differences?
- CLI uses: `--call` → API field: `sip_call_to` ✅
- CLI uses: `--number` → API field: `sip_number` ✅
- CLI uses: `--trunk` → API field: `sip_trunk_id` ✅

### 2. Transport Issue?
- Trunk transport: **TCP** ✅ (fixed)
- Asterisk expects: **TCP** ✅

### 3. Room Pre-existence?
- CLI: Creates room FIRST ✅
- Backend: Creates room FIRST ✅ (now fixed)

### 4. Auth Token Permissions?
Our token:
```python
{"roomJoin": True, "roomName": room_name, "canPublish": True}
```

Maybe needs different permissions?

### 5. API URL Format?
```python
api_url = "https://ai-agent-dl6ldsi8.livekit.cloud/"
sip_url = f"{api_url}twirpc/livekit.SIPService/CreateSIPParticipant"
```

Is this correct?

---

## 🧪 Next Debug Steps

### A. Capture CLI API Call
Run CLI with network capture to see exact API request

### B. Enable Debug Logging
Check LiveKit Cloud dashboard for:
- SIP participant creation events
- Error logs
- SIP INVITE attempts

### C. Check LiveKit Cloud Dashboard
1. Go to: https://cloud.livekit.io/
2. Check "Telephony" → "Logs"
3. Look for SIP participant creation
4. See if INVITE was attempted

### D. Verify Trunk Status
```bash
lk sip outbound list
```

Make sure:
- Address: voice.epic.dm ✅
- Transport: TCP ✅
- Auth: 17678183366 / *** ✅
- Number: +17678183366 ✅

---

## 🎯 Current Status

**CLI Test**:
- ✅ Room created
- ✅ SIP participant created
- ✅ INVITE sent to Asterisk
- ✅ Agent joins (if call connects)

**GUI Test**:
- ✅ Room created
- ✅ SIP participant API returns 200 OK
- ❌ NO INVITE sent to Asterisk
- ❌ Agent never joins

**The disconnect happens AFTER CreateSIPParticipant returns 200 OK but BEFORE LiveKit sends the INVITE.**

This suggests:
1. LiveKit accepts the request
2. But fails silently when trying to actually place the call
3. Possibly due to wrong parameters in the request

---

## 💡 Check LiveKit Cloud Dashboard

**Go to dashboard and check:**
- Recent SIP participant creation attempts
- Any error logs
- SIP trunk status
- Regional routing

The answer is likely in the LiveKit Cloud logs!
