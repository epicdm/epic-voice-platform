# Asterisk SIP INVITE Check - Critical Diagnostics

## CLI Test Complete ✅

**Test Result**: LiveKit Cloud accepted the SIP participant creation request.

**Call ID**: SCL_Pmpr7XoQoRto
**Room**: cli-test-room
**To**: +17672958382
**From**: +17678183366
**Trunk**: ST_sTo8gGpNbXzY (voice.epic.dm:5060 TCP)

## Network Verification from Testbed

✅ **voice.epic.dm is reachable from testbed server**:
```
Connection to voice.epic.dm (206.53.141.41) 5060 port [tcp/sip] succeeded!
```

⚠️ **But testbed server ≠ LiveKit Cloud servers!**

## The Critical Question

**Did your Asterisk server receive a SIP INVITE from LiveKit Cloud?**

### How to Check (Run on Asterisk Server)

**Method 1: Real-time tcpdump** (BEST METHOD)
```bash
# On your Asterisk server (voice.epic.dm / 206.53.141.41)
# Run this in one terminal:
tcpdump -i any port 5060 -n -A -s 0

# Keep it running, then in another terminal on testbed:
./test_sip_cli.sh

# Watch tcpdump output for:
# - SIP INVITE
# - From: LiveKit Cloud IP
# - To: 17672958382
```

**Method 2: Asterisk CLI**
```bash
# On Asterisk server
asterisk -rvvv

# Watch for:
sip show channels
# or
pjsip show channels

# Look for any activity around the test time
```

**Method 3: Asterisk Logs**
```bash
# Check full log
tail -100 /var/log/asterisk/full | grep -i invite

# Check messages log
tail -100 /var/log/asterisk/messages | grep -i invite

# Search for the test number
grep "17672958382" /var/log/asterisk/full
```

## Likely Scenarios

### Scenario A: You SEE the SIP INVITE 

**Symptoms:**
- tcpdump shows SIP INVITE arriving
- Asterisk logs show incoming INVITE
- Call fails or gets rejected

**Diagnosis**: ✅ Network is working, ❌ Asterisk configuration issue

**Possible Causes:**
1. **Authentication Failure**
   - Username: livekit
   - Password: werwqerwqrwq555
   - Check Asterisk peer configuration

2. **Dialplan Issue**
   - Extension 17672958382 not defined
   - No route to handle the call

3. **SIP Response Code**
   - Look for: 403 (Forbidden), 404 (Not Found), 486 (Busy)
   - Fix Asterisk configuration accordingly

**Fix:**
```bash
# On Asterisk server, check peer config
asterisk -rx "sip show peers" | grep -i livekit
# or for PJSIP:
asterisk -rx "pjsip show endpoints" | grep -i livekit

# Check if peer is defined with username: livekit
# Password must match: werwqerwqrwq555
```

### Scenario B: You DON'T SEE any SIP INVITE 

**Symptoms:**
- tcpdump shows NO traffic from LiveKit
- Asterisk logs show nothing
- No SIP activity at all

**Diagnosis**: ❌ Network/firewall issue - LiveKit Cloud cannot reach your Asterisk

**Possible Causes:**

#### 1. Firewall Blocking LiveKit Cloud
```bash
# On Asterisk server, check firewall rules
iptables -L -n -v | grep 5060

# Common issue: Firewall only allows specific IPs
# LiveKit Cloud IPs are NOT in the allow list
```

**Fix:**
```bash
# Allow SIP from internet (TEMPORARY TEST)
iptables -I INPUT -p tcp --dport 5060 -j ACCEPT
iptables -I INPUT -p udp --dport 5060 -j ACCEPT

# Or with ufw:
ufw allow 5060/tcp
ufw allow 5060/udp

# Test again, then secure properly after
```

#### 2. NAT/Port Forwarding Issue
- If Asterisk is behind NAT/router
- Port 5060 needs to be forwarded
- Public IP might be different

**Check:**
```bash
# On Asterisk server
curl ifconfig.me
# Does this match 206.53.141.41?

# Check if voice.epic.dm resolves correctly
dig voice.epic.dm
nslookup voice.epic.dm
```

#### 3. LiveKit Cloud IP Range Unknown
- Your firewall might need LiveKit Cloud IPs whitelisted
- Contact LiveKit or check their documentation
- Alternative: Open port 5060 to internet (less secure)

#### 4. Transport Protocol Mismatch
- Trunk configured for TCP
- Asterisk might be UDP only

**Fix:** Try changing trunk to UDP:
```bash
# Delete current trunk
lk sip outbound delete ST_sTo8gGpNbXzY

# Create new with UDP (see below)
```

## Alternative Configuration: Use IP Instead of Domain

If DNS is the issue, try using IP directly:

```bash
# Delete current trunk
cd /opt/livekit1
lk sip outbound delete ST_sTo8gGpNbXzY

# Create trunk config file
cat > trunk-ip.json << 'JSON'
{
  "name": "epic-agent-outbound-ip",
  "address": "206.53.141.41:5060",
  "transport": "UDP",
  "numbers": ["+17678183366"],
  "auth_username": "livekit",
  "auth_password": "werwqerwqrwq555"
}
JSON

# Create new trunk
lk sip outbound create --request trunk-ip.json

# Test again
./test_sip_cli.sh
```

## Alternative Configuration: Try UDP Transport

```bash
cd /opt/livekit1

# Delete TCP trunk
lk sip outbound delete ST_sTo8gGpNbXzY

# Create UDP trunk
cat > trunk-udp.json << 'JSON'
{
  "name": "epic-agent-outbound-udp",
  "address": "voice.epic.dm:5060",
  "transport": "UDP",
  "numbers": ["+17678183366"],
  "auth_username": "livekit",
  "auth_password": "werwqerwqrwq555"
}
JSON

# Create trunk
lk sip outbound create --request trunk-udp.json

# Get new trunk ID
lk sip outbound list

# Update .env file with new trunk ID
# Then test again
```

## Debugging Steps Summary

1. ✅ **Start tcpdump on Asterisk server** (CRITICAL!)
   ```bash
   tcpdump -i any port 5060 -n -A -s 0
   ```

2. ✅ **Make test call from testbed**
   ```bash
   cd /opt/livekit1
   ./test_sip_cli.sh
   ```

3. ✅ **Watch tcpdump output**
   - See INVITE? → Go to Scenario A
   - No INVITE? → Go to Scenario B

4. ✅ **Check firewall on Asterisk**
   ```bash
   iptables -L -n -v | grep 5060
   ufw status
   ```

5. ✅ **Temporarily open port 5060** (if blocked)
   ```bash
   iptables -I INPUT -p tcp --dport 5060 -j ACCEPT
   iptables -I INPUT -p udp --dport 5060 -j ACCEPT
   ```

6. ✅ **Test again after firewall change**

7. ✅ **Try UDP instead of TCP** (if still failing)

8. ✅ **Try IP address instead of domain** (if still failing)

## Expected Working tcpdump Output

If everything is working, you should see:

```
IP 123.45.67.89.xxxx > 206.53.141.41.5060: SIP: INVITE sip:17672958382@voice.epic.dm SIP/2.0
Via: SIP/2.0/TCP 123.45.67.89:xxxx;branch=z9hG4bK...
From: <sip:17678183366@voice.epic.dm>;tag=...
To: <sip:17672958382@voice.epic.dm>
Call-ID: ...
Contact: <sip:livekit@123.45.67.89:xxxx>
User-Agent: LiveKit
```

Where 123.45.67.89 is a LiveKit Cloud IP address.

## Next Steps

1. **RIGHT NOW**: Start tcpdump on your Asterisk server
2. **Then**: Run `./test_sip_cli.sh` on testbed
3. **Report back**: Did you see SIP INVITE or not?
4. **Based on result**: We'll fix either Asterisk config or network/firewall

## Quick Commands Reference

```bash
# On Asterisk server:
tcpdump -i any port 5060 -n -A

# On testbed server:
cd /opt/livekit1
./test_sip_cli.sh

# Check trunk config:
lk sip outbound list

# Verify connectivity (from testbed):
nc -zv voice.epic.dm 5060

# Check Asterisk peers:
asterisk -rx "sip show peers"
asterisk -rx "pjsip show endpoints"
```

The key is determining whether LiveKit Cloud can reach your Asterisk at all. Once we know that, we can fix the appropriate layer.
