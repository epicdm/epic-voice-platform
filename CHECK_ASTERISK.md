# Check if SIP INVITE Reached Asterisk

## CLI Test Just Ran

**Time**: 16:09:18 (UTC)  
**Room**: test-1761062958  
**To Number**: +17672958382  
**From Number**: +17678183366  
**Trunk**: ST_sTo8gGpNbXzY → voice.epic.dm:5060 (TCP)

✅ **Agent Joined**: Confirmed  
✅ **Agent is Speaking**: TTS audio generated  
❓ **SIP INVITE Sent?**: Check on Asterisk server

---

## On Your Asterisk Server (voice.epic.dm)

Run **ONE** of these commands:

### Option 1: Live SIP traffic (best)
```bash
tcpdump -i any port 5060 -n -A
```

### Option 2: Check recent Asterisk logs
```bash
grep -i INVITE /var/log/asterisk/messages | tail -20
```

### Option 3: Check full Asterisk logs
```bash
grep "17672958382" /var/log/asterisk/full | tail -30
```

### Option 4: Check SIP debug (if enabled)
```bash
grep "17672958382" /var/log/asterisk/sip.log | tail -20
```

---

## What to Look For

✅ **SUCCESS - SIP INVITE Received**:
```
INVITE sip:+17672958382@voice.epic.dm;transport=tcp SIP/2.0
From: "+17678183366" <sip:+17678183366@...>
To: <sip:+17672958382@voice.epic.dm;transport=tcp>
```

Then Asterisk responds with:
```
401 Unauthorized  ← Auth challenge
403 Forbidden     ← Dialplan rejection (your issue to fix)
```

❌ **FAILURE - No SIP INVITE**:
- No logs at all
- Firewall blocking port 5060
- Wrong IP/DNS resolution

---

## Expected Behavior

Since CLI tests worked earlier and agent is joining:

1. ✅ LiveKit creates room
2. ✅ Agent joins room  
3. ✅ LiveKit sends SIP INVITE to voice.epic.dm:5060
4. ✅ Asterisk receives INVITE
5. ✅ Asterisk sends 401 Unauthorized
6. ✅ LiveKit re-sends INVITE with auth
7. ❌ **Asterisk sends 403 Forbidden** ← YOUR ISSUE

---

## Fix the 403 Error

Once you confirm SIP INVITE is reaching Asterisk, fix the dialplan:

### On Asterisk Server

**Edit**: `/etc/asterisk/extensions.conf`

```ini
[from-livekit]
exten => _+.,1,NoOp(LiveKit call to ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Wait(3)
 same => n,Hangup()
```

**Then reload**:
```bash
asterisk -rx "dialplan reload"
asterisk -rx "sip reload"
```

---

## Verify Fix

After fixing Asterisk, run CLI test again:
```bash
cd /opt/livekit1
./test_sip_cli.sh
```

**Expected Result**:
- ✅ Agent joins
- ✅ SIP INVITE sent
- ✅ Asterisk returns 200 OK (not 403!)
- ✅ Call connects
- ✅ You hear agent speaking

---

## Current Test Results

**Last CLI Test**: 16:09:18 UTC  
**Agent Status**: ✅ Joined room and speaking  
**Next Step**: Check Asterisk server for SIP INVITE
