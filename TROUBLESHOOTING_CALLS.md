# Troubleshooting: Calls Not Reaching Asterisk

## The Problem
You're seeing "Outbound call initiated" messages but no SIP INVITE reaches your Asterisk PBX.

## Root Cause: NO AGENT DEPLOYED

The #1 issue is that **no agent is currently deployed to LiveKit Cloud**.

When you make a call:
1. ✅ Frontend sends request to backend
2. ✅ Backend calls LiveKit API to create room
3. ✅ LiveKit API creates room successfully  
4. ✅ LiveKit API creates SIP participant
5. ❌ **BUT: No agent process is running to handle the call**
6. ❌ **Result: LiveKit may not send SIP INVITE without an active agent**

## Verification

```bash
# Check if any agent is running
ps aux | grep "agents/" | grep python | grep -v grep

# Expected: Should see python processes for agents
# Actual: NO PROCESSES (This is the problem\!)

# Check LiveKit rooms
cd /opt/livekit1 && lk room list

# Expected: Should see active rooms when calls are made
# Actual: Empty (rooms close immediately without agent)
```

## Solution Steps

### Step 1: Deploy the Agent

1. Go to http://localhost:3001/agents
2. Find your agent (e.g., "Sales Agent")
3. Click **"Deploy to Cloud"**
4. Wait 15 seconds for deployment
5. Verify status shows "deployed" with green indicator

### Step 2: Verify Agent is Running

```bash
# Check agent processes
ps aux | grep "agents/sales_agent"

# Should see multiple python processes
# Example output:
# root  12345  python3 /opt/livekit1/agents/sales_agent/main.py

# Check agent logs
tail -f /opt/livekit1/agents/sales_agent/*.log

# Should see:
# - "registered worker" message
# - Connection to LiveKit Cloud
# - "ready to accept tasks"
```

### Step 3: Test the Call Again

1. Click "Test Call" on the deployed agent
2. Enter phone number: +17672958382
3. Click "Initiate Call"

### Step 4: Monitor on Asterisk

On your Asterisk server, watch for incoming SIP:

```bash
# Watch SIP activity
tcpdump -i any port 5060 -n -vv

# Or in Asterisk CLI
asterisk -rvvv

# You should see:
# - SIP INVITE from LiveKit Cloud
# - From: sip:livekit@voice.epic.dm
# - To: sip:17672958382@voice.epic.dm
```

## Why Agent Deployment Matters

LiveKit works differently than traditional SIP:

### Without Deployed Agent:
```
LiveKit Cloud → Creates room → Creates SIP participant → [NO AGENT] → Room closes
                                                            ↓
                                                    NO SIP INVITE SENT
```

### With Deployed Agent:
```
LiveKit Cloud → Creates room → Agent joins room → Creates SIP participant → SIP INVITE
                                      ↓                                           ↓
                                  Ready to talk  ←───────────────────  Asterisk receives call
```

## Current Configuration

```yaml
LiveKit Project: ai-agent-dl6ldsi8
LiveKit URL: wss://ai-agent-dl6ldsi8.livekit.cloud

SIP Outbound Trunk:
  ID: ST_sTo8gGpNbXzY
  Name: epic-agent-outbound
  Address: voice.epic.dm:5060
  Transport: TCP
  Auth: livekit / werwqerwqrwq555
  Number: +17678183366

VoIP Server:
  Domain: voice.epic.dm
  IP: 206.53.141.41
  Port: 5060 (Verified accessible)
  Status: ✅ UP and reachable
```

## Expected Call Flow

1. **Frontend** → Backend API `/api/sip/outbound-call`
2. **Backend** → LiveKit API `CreateRoom`
3. **Backend** → LiveKit API `CreateSIPParticipant`
4. **LiveKit Agent** (deployed) → Joins room automatically
5. **LiveKit Cloud** → Sends SIP INVITE to voice.epic.dm:5060
6. **Asterisk** → Receives INVITE, routes to extension
7. **Phone** → Rings
8. **User** → Answers
9. **Agent** → Starts conversation

## Debugging Commands

```bash
# 1. Check agent deployment status
cd /opt/livekit1
python3 -c "
import sqlite3
conn = sqlite3.connect('voice_agents.db')
cursor = conn.cursor()
cursor.execute('SELECT name, status, file_path FROM agent_configs')
for row in cursor.fetchall():
    print(f'Agent: {row[0]}, Status: {row[1]}, Path: {row[2]}')
"

# 2. Check LiveKit rooms in real-time
lk room list --watch

# 3. Check SIP trunk connectivity
nc -zv voice.epic.dm 5060

# 4. Monitor backend logs
tail -f /opt/livekit1/backend.log | grep -i "sip\|outbound\|create"

# 5. Check for agent processes
ps aux | grep python | grep agents
```

## Common Issues & Solutions

### Issue: "Call initiated" but nothing happens
**Cause**: No agent deployed
**Solution**: Deploy agent first

### Issue: Agent won't deploy
**Cause**: Missing dependencies or env vars
**Solution**: Check agent logs, verify .env file

### Issue: Agent deploys but disconnects
**Cause**: Wrong LiveKit credentials
**Solution**: Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET

### Issue: SIP INVITE reaches Asterisk but no audio
**Cause**: RTP/media issues  
**Solution**: Check firewall, LiveKit Cloud IPs

## Next Steps

1. ✅ **Deploy the agent** (Primary fix)
2. ✅ Verify agent is connected to LiveKit Cloud
3. ✅ Test call and monitor Asterisk logs
4. ✅ Check for SIP INVITE arrival
5. ✅ Debug from there if needed

## Need More Help?

Capture logs during a test call:

```bash
# Terminal 1: Backend logs
tail -f /opt/livekit1/backend.log

# Terminal 2: Agent logs (after deployment)
tail -f /opt/livekit1/agents/sales_agent/*.log

# Terminal 3: Asterisk SIP capture
tcpdump -i any port 5060 -w /tmp/sip-capture.pcap

# Then make the test call and share these logs
```
