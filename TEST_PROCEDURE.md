# LiveKit → VoIP Server Test Procedure

## ✅ Configuration Status

### VERIFIED - Working Components:
1. ✅ **VoIP Server is UP**: voice.epic.dm (206.53.141.41) is reachable on port 5060
2. ✅ **LiveKit Cloud Configuration**: Trunk ST_sTo8gGpNbXzY properly configured
3. ✅ **SIP Authentication**: Username: livekit, Password: werwqerwqrwq555
4. ✅ **Database Cleaned**: Phone mappings updated with trunk IDs
5. ✅ **API Endpoints**: Backend and frontend servers running correctly

### Configuration Details:
```
OUTBOUND TRUNK (ST_sTo8gGpNbXzY):
  - Address: voice.epic.dm
  - Transport: TCP
  - Auth: livekit / werwqerwqrwq555
  - Number: +17678183366

INBOUND TRUNK (ST_xkAxBhmf4pbR):
  - Number: +17678183366
  - Dispatch Rule: sip-call-* rooms
```

## ⚠️ Remaining Issue

**NO DEPLOYED AGENTS** - You need to deploy an agent to handle the calls

## 🧪 Step-by-Step Test Procedure

### Step 1: Deploy an Agent
1. Go to http://localhost:3001/agents
2. Find the "Sales Agent" (ID: fedf402c-03e5-45fb-8844-d283cac93e11)
3. Click "Deploy to Cloud"
4. Wait for deployment confirmation (~15 seconds)
5. Verify status changes to "deployed"

### Step 2: Make a Test Call
```bash
cd /opt/livekit1

# Test call to your number
curl -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382",
    "from_number": "+17678183366"
  }'
```

### Step 3: Monitor on VoIP Server
On your Asterisk/FreePBX server, run:
```bash
# Watch SIP activity
asterisk -rx "sip show channels"

# Monitor real-time SIP messages
asterisk -rvvv

# Check SIP peers
asterisk -rx "sip show peers"

# Or use tcpdump to see SIP packets
tcpdump -i any port 5060 -n -vv
```

### Step 4: Check LiveKit Logs
```bash
cd /opt/livekit1

# Check backend logs
tail -f verbose_backend.log

# Check LiveKit room status
lk room list

# Check active SIP calls (if any)
lk sip participant list
```

## 🔍 Expected Behavior

### When Call is Initiated:
1. **Frontend**: Shows "Call initiated" toast
2. **Backend**: Logs show:
   - `✅ Creating room: outbound-call-XXXXX`
   - `✅ Creating SIP Participant to call +17672958382`
   - HTTP 200 responses from LiveKit API

3. **LiveKit**: Creates room and SIP participant
4. **VoIP Server**: Should receive SIP INVITE from LiveKit
   ```
   From: LiveKit <sip:livekit@voice.epic.dm>
   To: <sip:17672958382@voice.epic.dm>
   ```

5. **Call Flow**:
   - LiveKit sends INVITE to voice.epic.dm:5060
   - Your VoIP server receives and routes to extension 17672958382
   - Phone rings
   - When answered, agent joins and starts conversation

## 🐛 Debugging Commands

### If calls still don't reach your VoIP server:

```bash
# 1. Check if VoIP server is receiving ANY SIP traffic
tcpdump -i any -n port 5060

# 2. Check VoIP server SIP configuration
# On FreePBX/Asterisk:
asterisk -rx "sip show settings" | grep -i "udp\|tcp"

# 3. Check firewall rules
iptables -L -n | grep 5060

# 4. Test SIP connectivity from this server
nc -zv voice.epic.dm 5060

# 5. Monitor LiveKit API responses in real-time
cd /opt/livekit1
tail -f verbose_backend.log | grep -i "sip\|create\|participant"
```

### LiveKit Verification:
```bash
# Check trunk configuration
lk sip outbound list --json

# Test trunk connectivity (if lk has test command)
lk sip test --trunk ST_sTo8gGpNbXzY

# List all rooms (should see outbound-call-* rooms)
lk room list
```

## 📋 Troubleshooting Checklist

- [ ] Agent is deployed and shows "deployed" status
- [ ] VoIP server is listening on port 5060
- [ ] voice.epic.dm resolves to your VoIP server IP
- [ ] VoIP server accepts connections from LiveKit Cloud IPs
- [ ] SIP authentication credentials match on both sides
- [ ] No firewall blocking port 5060 traffic
- [ ] VoIP server logs show incoming INVITE requests
- [ ] LiveKit backend logs show successful API calls

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Backend logs show HTTP 200 from LiveKit
2. ✅ VoIP server logs show incoming SIP INVITE
3. ✅ Phone +17672958382 rings
4. ✅ When answered, AI agent speaks

## 📞 Contact for Support

If calls still don't reach your VoIP server after following this procedure:
1. Capture tcpdump on your VoIP server: `tcpdump -i any port 5060 -w sip_capture.pcap`
2. Share the .pcap file for analysis
3. Provide VoIP server logs during the test call
