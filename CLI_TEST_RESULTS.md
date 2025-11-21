# CLI Test Results - SIP Outbound Call

## Test Executed

**Date**: Oct 21, 2025 1:39 PM UTC
**Method**: LiveKit CLI direct test

### Commands Run:

```bash
# 1. Create test room
lk room create cli-test-room
# Result: ✅ Room created (ID: RM_f92xe7pkJXaJ)

# 2. Create SIP participant (outbound call)
lk sip participant create \
  --room cli-test-room \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity sip-test-participant \
  --name "Test SIP Call"

# Result: ✅ SIP Participant Created
```

### LiveKit Response:

```json
{
  "sipTrunkId": "ST_sTo8gGpNbXzY",
  "sipCallTo": "+17672958382",
  "sipNumber": "+17678183366",
  "roomName": "cli-test-room",
  "participantIdentity": "sip-test-participant",
  "participantName": "Test SIP Call"
}
```

**Call Details:**
- SIP Call ID: `SCL_Pmpr7XoQoRto`
- Participant ID: `PA_om7qiCcHMVJx`
- Room: `cli-test-room`

### Room Status Check:

```bash
lk room list
```

**Result:**
```
Room: cli-test-room
Participants: 0
Publishers: 0
```

**Analysis**: Room exists but has 0 participants, meaning the SIP call either:
- Failed to connect
- Was not answered
- SIP INVITE was rejected or never sent

## Critical Question: Did Asterisk Receive the SIP INVITE?

### On Your Asterisk Server, Check:

**Method 1: Real-time SIP monitor**
```bash
# Run this on your Asterisk server
tcpdump -i any port 5060 -n -A -s 0

# Look for:
# - SIP INVITE messages
# - From: LiveKit or voice.epic.dm
# - To: 17672958382
```

**Method 2: Asterisk CLI**
```bash
# On Asterisk server
asterisk -rvvv

# Then run:
sip show channels
sip show peers
pjsip show endpoints  # If using PJSIP

# Check for any activity around time: 13:39 UTC
```

**Method 3: Asterisk SIP logs**
```bash
# Check Asterisk logs for SIP INVITE
grep -i "INVITE" /var/log/asterisk/messages
grep -i "17672958382" /var/log/asterisk/full
```

## Possible Outcomes

### Scenario 1: Asterisk DID receive INVITE

**If you see the INVITE in tcpdump or Asterisk logs:**

✅ **Good News**: LiveKit → Asterisk connection works!
❌ **Issue**: Call handling or routing problem in Asterisk

**Next Steps:**
- Check Asterisk dialplan for extension 17672958382
- Verify SIP authentication (username: livekit, password: werwqerwqrwq555)
- Check if Asterisk rejected the INVITE (403, 404, 486 response)

### Scenario 2: Asterisk did NOT receive INVITE

**If you see NO SIP traffic from LiveKit:**

❌ **Issue**: LiveKit → Asterisk connection problem

**Possible Causes:**

1. **Firewall blocking port 5060**
   ```bash
   # On Asterisk server, check firewall
   iptables -L -n | grep 5060
   ufw status
   ```

2. **DNS issue with voice.epic.dm**
   ```bash
   # From this server (testbed)
   dig voice.epic.dm
   nslookup voice.epic.dm
   
   # Expected: Should resolve to 206.53.141.41
   ```

3. **LiveKit Cloud cannot reach voice.epic.dm**
   - LiveKit Cloud IP might be blocked
   - Need to whitelist LiveKit Cloud IPs in Asterisk firewall

4. **SIP Trunk configuration issue**
   - Trunk points to wrong address
   - Authentication failing
   - Transport mismatch (TCP vs UDP)

## Diagnostic Commands

**Run these on the testbed server:**

```bash
# 1. Verify voice.epic.dm is reachable
nc -zv voice.epic.dm 5060
# Expected: Connection to voice.epic.dm 5060 port [tcp/*] succeeded!

# 2. Test SIP OPTIONS
echo -e "OPTIONS sip:voice.epic.dm SIP/2.0\r
\nVia: SIP/2.0/TCP $(hostname);branch=z9hG4bK776asdhds\r\nMax-Forwards: 70\r\nTo: <sip:voice.epic.dm>\r\nFrom: <sip:test@testbed>;tag=1928301774\r\nCall-ID: test@testbed\r\nCSeq: 1 OPTIONS\r\nContact: <sip:test@testbed>\r\nContent-Length: 0\r\n\r\n" | nc voice.epic.dm 5060

# 3. Check if LiveKit can resolve DNS
# (This is on LiveKit Cloud side - we can't test directly)

# 4. Verify trunk configuration
lk sip outbound list
# Confirm: Address = voice.epic.dm, Transport = TCP
```

## LiveKit Cloud Firewall Requirements

LiveKit Cloud needs to connect TO your Asterisk server on:
- **Port**: 5060 (TCP)
- **Protocol**: SIP
- **Direction**: Outbound from LiveKit Cloud → Inbound to your Asterisk

**Required on Asterisk server:**
```bash
# Allow incoming SIP from anywhere (or specific LiveKit IPs)
iptables -A INPUT -p tcp --dport 5060 -j ACCEPT
iptables -A INPUT -p udp --dport 5060 -j ACCEPT

# Or using ufw
ufw allow 5060/tcp
ufw allow 5060/udp
```

## Next Steps Based on Results

### If Asterisk RECEIVED the INVITE:

1. Check Asterisk response code (tcpdump will show)
2. Fix Asterisk dialplan/authentication
3. GUI calls should work once Asterisk is fixed

### If Asterisk DID NOT receive INVITE:

**Check in this order:**

1. **Firewall on Asterisk server**
   - Allow port 5060 from internet
   - Whitelist LiveKit Cloud IPs if possible

2. **DNS Resolution**
   - Ensure voice.epic.dm resolves correctly
   - Try using IP address instead of domain in trunk

3. **LiveKit Trunk Config**
   - Update trunk to use IP: 206.53.141.41:5060
   - Test again with CLI

4. **Transport Protocol**
   - Try UDP instead of TCP
   - Some firewalls block SIP over TCP

## Commands to Update Trunk (If DNS/Transport Issues)

```bash
# Get current trunk config
lk sip outbound list

# Delete old trunk
lk sip outbound delete ST_sTo8gGpNbXzY

# Create new trunk with IP address
lk sip outbound create trunk-config.json
# Where trunk-config.json contains:
# {
#   "trunk": {
#     "name": "epic-agent-outbound-ip",
#     "address": "206.53.141.41:5060",
#     "transport": "UDP",  # Try UDP first
#     "numbers": ["+17678183366"],
#     "auth_username": "livekit",
#     "auth_password": "werwqerwqrwq555"
#   }
# }
```

## Summary

✅ **What We Know Works:**
- LiveKit CLI accepts SIP participant creation
- Room is created successfully
- LiveKit Cloud is reachable and responding

❓ **What We Need to Verify:**
- Did SIP INVITE actually reach voice.epic.dm:5060?
- Is Asterisk receiving ANY SIP traffic from LiveKit Cloud?

🎯 **Action Required:**
**On your Asterisk server, run tcpdump NOW and make another test call:**

```bash
# Terminal 1 (Asterisk server):
tcpdump -i any port 5060 -n -A -s 0 -w /tmp/sip-capture.pcap

# Terminal 2 (This server):
lk sip participant create --room test2 --trunk ST_sTo8gGpNbXzY --call +17672958382 --number +17678183366

# Then check Terminal 1 for SIP INVITE
# Or analyze: tcpdump -r /tmp/sip-capture.pcap -A
```

The capture file will definitively show if LiveKit is sending SIP traffic or not.
