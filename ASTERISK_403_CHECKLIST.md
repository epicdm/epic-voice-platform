# Asterisk 403 Forbidden - Complete Checklist

## 🔍 What 403 Forbidden Means

Asterisk **received** the SIP INVITE but **rejected** it. Common causes:

1. ❌ **No matching SIP peer** (IP/host mismatch)
2. ❌ **Extension not found** in dialplan context
3. ❌ **Authentication failed**
4. ❌ **Wrong peer type** (should be 'friend' or 'peer')

---

## ✅ Your Current SIP Peer Config

```ini
type=friend                           ✅ Correct (allows inbound)
host=3m4yki5jezn.sip.livekit.cloud   ✅ LiveKit SIP endpoint
defaultuser=17678183366               ✅ Your phone number
authuser=17678183366                  ✅ Auth username
secret=werwqerwqrwq555                ✅ Password
context=billing                       ⚠️  Calls go to [billing]
transport=tcp                         ✅ Correct
port=5060                            ✅ Standard SIP port
permit=0.0.0.0/0.0.0.0               ✅ Allows all IPs
```

---

## 🔧 Step-by-Step Fixes

### Step 1: Check SIP Peer Registration

On your **Asterisk server**, run:
```bash
asterisk -rx "sip show peers" | grep livekit
```

**Expected output**:
```
3m4yki5jezn.sip.livekit.cloud    (Unmonitored)
```

**If NOT listed**: 
- ❌ Peer configuration has syntax errors
- Fix: Check `/etc/asterisk/sip.conf` for typos

### Step 2: Verify Context Exists

Check if `[billing]` context exists:
```bash
asterisk -rx "dialplan show billing"
```

**Expected**: Shows extensions in the billing context

**If empty or not found**:
- ❌ Context doesn't exist
- Fix: Add dialplan to `/etc/asterisk/extensions.conf`

### Step 3: Add Extension Pattern

Edit `/etc/asterisk/extensions.conf` and add to `[billing]`:

```ini
[billing]
; Match any number starting with +
exten => _+.,1,NoOp(Incoming call to ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Wait(2)
 same => n,Hangup()

; Also match numbers WITHOUT + (just in case)
exten => _X.,1,NoOp(Incoming call to ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Wait(2)
 same => n,Hangup()
```

Then reload:
```bash
asterisk -rx "dialplan reload"
```

### Step 4: Check Asterisk Logs During Call

**Start watching logs** (keep this running):
```bash
tail -f /var/log/asterisk/full | grep -i "INVITE\|403\|Forbidden\|17672958382"
```

**Make a test call from LiveKit**, then check the log output.

---

## 🚨 Common Error Messages & Fixes

### Error: "No matching peer found"
**Cause**: LiveKit's IP doesn't match the peer host

**Fix**: Change your peer config:
```ini
; Option 1: Match by host (current)
host=3m4yki5jezn.sip.livekit.cloud

; Option 2: Match by IP (if Option 1 doesn't work)
host=dynamic
insecure=port,invite     ; Allow calls without authentication
```

### Error: "Extension not found"
**Cause**: Number doesn't match any extension in `[billing]`

**Fix**: Add catch-all pattern:
```ini
[billing]
exten => _.,1,NoOp(Catch all: ${EXTEN})
 same => n,Answer()
 same => n,Playback(hello-world)
 same => n,Hangup()
```

### Error: "Authentication failed"
**Cause**: Username/password mismatch

**Fix**: Verify credentials match your LiveKit trunk config:
```bash
# In your Asterisk SIP peer:
authuser=17678183366
secret=werwqerwqrwq555

# Must match LiveKit outbound trunk settings
```

### Error: "Request from not authorized"
**Cause**: Peer security settings too strict

**Fix**: Add these to your peer config:
```ini
insecure=port,invite
qualify=no
nat=yes
```

---

## 🧪 Test Commands

### On LiveKit Server
```bash
cd /opt/livekit1
./quick_cli_test.sh
```

### On Asterisk Server (voice.epic.dm)

**Terminal 1** - Watch logs:
```bash
tail -f /var/log/asterisk/full | grep -i INVITE
```

**Terminal 2** - Watch SIP traffic:
```bash
tcpdump -i any port 5060 -n -A | grep -A 10 INVITE
```

---

## 🎯 Verification Checklist

- [ ] SIP peer shows in `sip show peers`
- [ ] `[billing]` context exists in dialplan
- [ ] Extension pattern `_+.` or `_.` exists in `[billing]`
- [ ] Dialplan reloaded after changes
- [ ] SIP peer type is `friend` or `peer`
- [ ] `permit=0.0.0.0/0.0.0.0` allows all IPs
- [ ] Can see INVITE in tcpdump
- [ ] Asterisk log shows call attempt (not just silence)

---

## 🔬 Advanced Debugging

### Enable SIP Debug
```bash
asterisk -rx "sip set debug on"
asterisk -rx "core set verbose 10"
```

Then make a test call and watch `/var/log/asterisk/full`

### Disable SIP Debug (after testing)
```bash
asterisk -rx "sip set debug off"
asterisk -rx "core set verbose 3"
```

---

## 📋 Quick Fix Template

**Add this to `/etc/asterisk/extensions.conf`**:

```ini
[billing]
; Accept ANY incoming call and play message
exten => _.,1,NoOp(LiveKit call: From ${CALLERID(num)} To ${EXTEN})
 same => n,Answer()
 same => n,Wait(1)
 same => n,Playback(hello-world)
 same => n,Wait(2)
 same => n,Playback(goodbye)
 same => n,Hangup()
```

**Reload**:
```bash
asterisk -rx "dialplan reload"
```

**Test**:
```bash
cd /opt/livekit1
./quick_cli_test.sh
```

---

## ✅ Success Indicators

When it works, you'll see:
1. ✅ Asterisk log shows: `INVITE` received
2. ✅ Asterisk log shows: `200 OK` sent (not 403)
3. ✅ Agent speaks and you hear audio
4. ✅ Call stays connected

---

## 🆘 Still Getting 403?

**Capture and share**:
1. Full SIP peer config (redact password)
2. Relevant dialplan `[billing]` section
3. Last 50 lines from: `tail -50 /var/log/asterisk/full`
4. Output of: `asterisk -rx "dialplan show billing"`

This will help identify the exact issue!
