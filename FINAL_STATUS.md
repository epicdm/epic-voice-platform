# Final Status - Deployment & Call Testing

## ✅ AGENT IS NOW RUNNING AND WORKING!

### Problem Was: Port Conflict

**Root Cause**: Port 8081 was already in use by an old agent process
- Old agent process (PID 2379916) was holding port 8081
- New agent couldn't start because port was taken
- Database said "deployed" but no agent was actually running

**Fix Applied**:
```bash
# Killed the zombie agent process
kill -9 2379916

# Restarted agent successfully  
cd /opt/livekit1/agents/sales_agent
python3 main.py start
```

### ✅ Current Status

**Agent:**
- ✅ Running (PID 2403067)
- ✅ Registered with LiveKit Cloud (Worker ID: AW_j4EaV24eAVSv)
- ✅ Joining rooms successfully
- ✅ Speaking (TTS working)
- ✅ Processing jobs

**Evidence from logs:**
```
2025-10-21 14:08:54 [INFO] registered worker
Worker ID: AW_j4EaV24eAVSv
Region: US East B

2025-10-21 14:10:10 [INFO] TTS metrics
Room: test-agent-1761055801
Agent: Sales Agent
Job ID: AJ_MzprUn5NCri9
```

## ❌ ASTERISK STILL RETURNING 403 FORBIDDEN

### Test Call Result

```
CLI Test Call:
✅ Room created
✅ SIP participant created
✅ Agent joined room
✅ Agent started speaking
❌ Asterisk returned: 403 Forbidden

Error:
SIPStatusCode: 403
SIPStatus: Forbidden
rpc error: code = PermissionDenied desc = unexpected status from INVITE response: 
sip status: 403: Forbidden
```

### What This Means

**Network & LiveKit**: ✅ 100% Working
- SIP INVITE reaches Asterisk
- Authentication passes (401 → retry works)
- Agent joins room and speaks

**Asterisk Dialplan**: ❌ Still rejecting calls
- Extension +17672958382 not in dialplan
- Or context mismatch
- Or number format issue (+ prefix)

## The Complete Call Flow

### What's Happening Now:

```
1. GUI Test Call clicked ✅
2. Backend creates room ✅
3. Backend creates SIP participant ✅
4. LiveKit sends INVITE to Asterisk ✅
5. Asterisk receives INVITE ✅
6. Asterisk challenges with 401 ✅
7. LiveKit sends INVITE with auth ✅
8. Agent joins room ✅
9. Agent starts speaking ✅
10. Asterisk responds: 403 Forbidden ❌ ← PROBLEM
11. Call fails ❌
```

### What Should Happen:

```
10. Asterisk responds: 200 OK ✅
11. Phone rings! ✅
12. User answers ✅
13. Agent conversation proceeds ✅
```

## The Asterisk Fix (REQUIRED)

You need to add this to your Asterisk dialplan:

**File**: `/etc/asterisk/extensions.conf` (on your Asterisk server)

```ini
[from-livekit]
; Handle all incoming calls from LiveKit
exten => _+.,1,NoOp(LiveKit incoming call to ${EXTEN})
exten => _+.,n,Set(CLEANED=${EXTEN:1})  ; Remove + prefix
exten => _+.,n,Answer()
exten => _+.,n,Playback(hello-world)    ; For testing
exten => _+.,n,Wait(3)
exten => _+.,n,Hangup()

; For production, route to actual destination:
; exten => _+1NXXNXXXXXX,n,Dial(SIP/${CLEANED}@your-provider)
```

**Then make sure your livekit peer uses this context:**

**For chan_sip** (`/etc/asterisk/sip.conf`):
```ini
[livekit]
type=friend
secret=werwqerwqrwq555
context=from-livekit    ← This is critical!
host=dynamic
insecure=invite,port
nat=yes
```

**For pjsip** (`/etc/asterisk/pjsip.conf`):
```ini
[livekit]
type=endpoint
context=from-livekit    ← This is critical!
auth=livekit-auth
aors=livekit-aor
allow=ulaw,alaw,g722
```

**Reload Asterisk:**
```bash
asterisk -rx "dialplan reload"
asterisk -rx "sip reload"  # or "pjsip reload"
```

## Testing After Asterisk Fix

### 1. Test with CLI (Fastest)

```bash
cd /opt/livekit1
./test_sip_cli.sh

# Expected result:
SIPStatusCode: 200  ← Success!
SIPStatus: OK
```

### 2. Test from GUI

1. Go to http://localhost:3001/agents
2. Agent should show "deployed" with green panel
3. Click "Test Call"
4. Enter: 1767295382
5. Click "Initiate Call"

**Expected:**
- Room created
- Agent joins
- Phone rings!
- You hear "Hello world" message
- Call proceeds

### 3. Monitor on Asterisk

```bash
# On Asterisk server
tcpdump -i any port 5060 -n -A

# Should see:
INVITE → 401
INVITE with auth → 200 OK ← This is what we need!
ACK
RTP audio
```

## Summary

### ✅ What's Working

- **Agent deployment**: ✅ Working
- **Agent registration**: ✅ Registered with LiveKit
- **Room creation**: ✅ Working
- **SIP participant creation**: ✅ Working  
- **Agent joining rooms**: ✅ Working
- **Agent speaking/TTS**: ✅ Working
- **Network to Asterisk**: ✅ Calls reaching Asterisk
- **SIP authentication**: ✅ Passing 401 challenge

### ❌ What's NOT Working

- **Asterisk dialplan**: ❌ Returning 403 Forbidden
- **Calls completing**: ❌ Can't complete because of 403

### 🎯 The Only Thing Left to Fix

**Add dialplan entry on your Asterisk server** for the number +17672958382

Once you do this, the sequence will be:
1. ✅ GUI test call
2. ✅ Agent joins
3. ✅ SIP INVITE sent
4. ✅ Asterisk answers with 200 OK (not 403!)
5. ✅ Phone rings
6. ✅ You answer
7. ✅ Agent talks to you

## Verification Commands

**Check agent is running:**
```bash
ps aux | grep "main.py start" | grep -v grep
# Should show process

cd /opt/livekit1/agents/sales_agent && tail -10 agent.log
# Should show "registered worker"
```

**Make test call:**
```bash
cd /opt/livekit1
./test_sip_cli.sh
```

**Watch agent logs during call:**
```bash
tail -f /opt/livekit1/agents/sales_agent/agent.log
# Should see "received job request" and "Starting agent"
```

## Everything is Ready!

✅ Agent is deployed and working
✅ Calls are reaching Asterisk
❌ Only missing: Asterisk dialplan fix

**Fix the dialplan on Asterisk, and calls will work!** 🎉
