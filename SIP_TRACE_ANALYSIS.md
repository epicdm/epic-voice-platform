# SIP Trace Analysis - 403 Forbidden Issue

## ✅ GOOD NEWS: Network is Working!

SIP INVITE **IS** reaching your Asterisk server from LiveKit Cloud!

## SIP Flow Captured

```
LiveKit Cloud (161.115.177.82:35408) → Asterisk (206.53.141.41:5060)

1. INVITE → 401 Unauthorized (Auth challenge)
2. INVITE with Auth → 403 Forbidden (REJECTED!)
3. ACK
```

## Key Details from Trace

**From:** "+17678183366" <sip:+17678183366@3m4yki5jezn.sip.livekit.cloud:9000>
**To:** <sip:+17672958382@voice.epic.dm;transport=tcp>
**LiveKit IP:** 161.115.177.82
**Via:** SIP/2.0/TCP 10.24.12.26:35408
**Call-ID:** VLZd3mEafbehNUfeeyGCt3ebPltE3

## Problem: 403 Forbidden

### What This Means

✅ **Authentication worked** - Got past 401, so username/password is correct
❌ **Call is being rejected** - Asterisk refuses to route the call

### Common Causes of 403 Forbidden

#### 1. **Extension Not in Dialplan**
The number `+17672958382` doesn't match any dialplan pattern.

**Check:**
```bash
# On Asterisk server
asterisk -rx "dialplan show" | grep -E "17672958382|_X\."

# Look for patterns that would match this number
```

#### 2. **Context Mismatch**
The SIP peer `livekit` is assigned to a context that doesn't have routing for this number.

**Check:**
```bash
# For chan_sip
asterisk -rx "sip show peer livekit"
# Look for: Context: <context_name>

# For pjsip  
asterisk -rx "pjsip show endpoint livekit"
# Look for: Context: <context_name>
```

#### 3. **ACL/IP Restriction**
The peer might have IP restrictions preventing calls from LiveKit Cloud IPs.

**Check peer config for:**
- `permit=` or `deny=` lines
- `acl=` settings
- IP-based restrictions

#### 4. **Number Format Issue**
Asterisk expects `17672958382` but receiving `+17672958382`

**The + sign might be causing issues!**

## Recommended Fixes

### Fix 1: Add Dialplan Entry (MOST LIKELY FIX)

Edit your dialplan (usually `/etc/asterisk/extensions.conf`):

```ini
[from-livekit]  ; Or whatever context the livekit peer uses

; Handle numbers with + prefix
exten => _+1NXXNXXXXXX,1,NoOp(LiveKit Incoming Call to ${EXTEN})
exten => _+1NXXNXXXXXX,n,Set(CLEANED=${EXTEN:1})  ; Remove the +
exten => _+1NXXNXXXXXX,n,Dial(SIP/${CLEANED}@your-trunk)  ; Or wherever to route
exten => _+1NXXNXXXXXX,n,Hangup()

; Or if you want to handle this specific number for testing
exten => +17672958382,1,NoOp(Test call from LiveKit)
exten => +17672958382,n,Answer()
exten => +17672958382,n,Playback(hello-world)
exten => +17672958382,n,Hangup()

; Also handle without + prefix
exten => _1NXXNXXXXXX,1,NoOp(LiveKit Incoming Call to ${EXTEN})
exten => _1NXXNXXXXXX,n,Dial(SIP/${EXTEN}@your-trunk)
exten => _1NXXNXXXXXX,n,Hangup()
```

Then reload:
```bash
asterisk -rx "dialplan reload"
```

### Fix 2: Update SIP Peer Context

Make sure the `livekit` peer is in the right context:

**For chan_sip** (`/etc/asterisk/sip.conf`):
```ini
[livekit]
type=friend
secret=werwqerwqrwq555
context=from-livekit  ; Make sure this context has the dialplan
host=dynamic
nat=yes
canreinvite=no
qualify=yes
insecure=invite  ; Might help with auth
```

**For pjsip** (`/etc/asterisk/pjsip.conf`):
```ini
[livekit]
type=endpoint
context=from-livekit  ; Make sure this context has the dialplan
auth=livekit-auth
aors=livekit-aor
allow=ulaw,alaw,g722
transport=transport-tcp

[livekit-auth]
type=auth
auth_type=userpass
username=livekit
password=werwqerwqrwq555

[livekit-aor]
type=aor
contact=sip:livekit@161.115.177.82:9000  ; LiveKit Cloud IP from trace
```

Then reload:
```bash
# For chan_sip
asterisk -rx "sip reload"

# For pjsip
asterisk -rx "pjsip reload"
```

### Fix 3: Strip + in Dialplan

If you can't change the incoming format, strip the + in dialplan:

```ini
[from-livekit]
; Strip leading + from all extensions
exten => _+.,1,NoOp(Stripping + from ${EXTEN})
exten => _+.,n,Goto(from-livekit,${EXTEN:1},1)

; Then handle the cleaned number
exten => _1NXXNXXXXXX,1,NoOp(Cleaned number: ${EXTEN})
exten => _1NXXNXXXXXX,n,Dial(SIP/${EXTEN}@your-trunk)
exten => _1NXXNXXXXXX,n,Hangup()
```

### Fix 4: Allow IP in Peer Config

Add LiveKit Cloud IPs to allowed list:

**chan_sip:**
```ini
[livekit]
; ... other settings ...
permit=161.115.177.82/32  ; From the SIP trace
permit=10.24.12.26/32     ; Internal LiveKit IP from Via header
```

**pjsip:**
```ini
[livekit-acl]
type=acl
deny=0.0.0.0/0
permit=161.115.177.82/32
permit=10.24.12.26/32

[livekit]
type=endpoint
; ... other settings ...
acl=livekit-acl
```

## Quick Test Configuration

**Minimal working config for testing** (`/etc/asterisk/extensions.conf`):

```ini
[from-livekit]
; Simple test - answer and play message
exten => _+.,1,NoOp(LiveKit call to ${EXTEN})
exten => _+.,n,Answer()
exten => _+.,n,Wait(1)
exten => _+.,n,Playback(hello-world)
exten => _+.,n,Wait(2)
exten => _+.,n,Hangup()

; Same for numbers without +
exten => _X.,1,NoOp(LiveKit call to ${EXTEN})
exten => _X.,n,Answer()
exten => _X.,n,Wait(1)
exten => _X.,n,Playback(hello-world)
exten => _X.,n,Wait(2)
exten => _X.,n,Hangup()
```

Then:
```bash
asterisk -rx "dialplan reload"
# Test again with: ./test_sip_cli.sh
```

## Debugging Commands

**Check current peer configuration:**
```bash
# chan_sip
asterisk -rx "sip show peer livekit"

# pjsip
asterisk -rx "pjsip show endpoint livekit"
asterisk -rx "pjsip show auth livekit-auth"
```

**Check dialplan for matches:**
```bash
asterisk -rx "dialplan show from-livekit"

# Test if extension would match
asterisk -rx "dialplan show +17672958382@from-livekit"
```

**Monitor in real-time:**
```bash
# Start Asterisk CLI
asterisk -rvvvv

# Make test call, watch for:
# - Which context the call enters
# - Extension match attempts
# - Reason for 403
```

**Enable SIP debug:**
```bash
asterisk -rx "sip set debug on"
# or
asterisk -rx "pjsip set logger on"

# Make test call
# Then disable:
asterisk -rx "sip set debug off"
```

## Expected Result After Fix

After fixing the dialplan/context:

```
1. INVITE → 401 Unauthorized
2. INVITE with Auth → 200 OK (accepted!)
3. ACK
4. RTP audio stream established
5. Call proceeds normally
```

You should see in tcpdump:
```
SIP INVITE
401 Unauthorized  
INVITE with auth
200 OK ← This is what we want!
ACK
```

## Summary

✅ **What's Working:**
- Network connectivity (LiveKit → Asterisk)
- SIP trunk configuration
- Authentication (got past 401)

❌ **What's NOT Working:**
- Dialplan/routing for +17672958382
- Asterisk rejecting call with 403 Forbidden

🎯 **Fix:**
1. Add dialplan entry in the correct context
2. Make sure livekit peer uses that context
3. Handle + prefix in number format
4. Test again

## Test After Fix

```bash
# On testbed server
cd /opt/livekit1
./test_sip_cli.sh

# On Asterisk server, watch tcpdump
# Should now see 200 OK instead of 403 Forbidden
```

Once you get 200 OK, the GUI calls will work automatically!
