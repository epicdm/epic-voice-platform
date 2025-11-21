# Deploy & Undeploy Workflow - Complete Guide

## Current Status: ✅ CLEANED UP

All orphaned agents have been removed from LiveKit Cloud and database has been reset.

## The Complete Workflow

### Phase 1: Pre-Deployment (Clean State)

**Verify Clean State:**
```bash
# 1. Check no agents running locally
ps aux | grep python | grep agents
# Expected: NO RESULTS

# 2. Check LiveKit Cloud status
cd /opt/livekit1 && lk agent list
# Expected: "No agents found"

# 3. Check database
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute('SELECT name, status FROM agent_configs')
for name, status in cursor.fetchall():
    print(f'{name}: {status}')
"
# Expected: All agents show "created"
```

### Phase 2: Agent Deployment

**Steps to Deploy:**

1. **Go to UI**: http://localhost:3001/agents

2. **Click "Deploy to Cloud"** on one agent (e.g., Sales Agent)

3. **Backend Process** (automatic):
   - Changes status to 'deploying'
   - Runs: `python3 main.py start` in agent directory
   - Waits up to 15 seconds for LiveKit registration
   - Checks logs for "registered worker" message

4. **Success Indicators**:
   - Status changes to '3deployed' in database
   - Green "LiveKit Deployment" panel appears on agent card
   - Process is running locally
   - Agent registered in LiveKit Cloud

**Verify Deployment:**
```bash
# 1. Check local process
ps aux | grep "agents/sales_agent"
# Expected: Multiple Python processes

# 2. Check LiveKit Cloud
lk agent list
# Expected: Shows agent worker with ID

# 3. Check agent logs
tail -50 /opt/livekit1/agents/sales_agent/*.log
# Expected: See "registered worker" and "connected to LiveKit"

# 4. Check database
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute('SELECT name, status FROM agent_configs WHERE name=\"Sales Agent\"')
print(cursor.fetchone())
"
# Expected: ('Sales Agent', 'deployed')
```

### Phase 3: Making Calls (Agent Deployed)

**Prerequisites:**
- ✅ Agent status = 'deployed'
- ✅ Green deployment panel visible on UI
- ✅ Agent process running locally
- ✅ Agent registered in LiveKit Cloud

**Call Flow:**

1. **Click "Test Call"** on deployed agent

2. **Enter Phone Number**: +17672958382

3. **Backend Process**:
   - Creates LiveKit room
   - Creates SIP participant
   - LiveKit sends INVITE to voice.epic.dm:5060

4. **Agent Joins**:
   - Deployed agent detects new room
   - Agent joins automatically
   - Ready to handle conversation

5. **SIP Call**:
   - LiveKit sends SIP INVITE
   - Asterisk receives INVITE
   - Phone rings
   - User answers
   - Agent starts conversation

**Verify Call is Working:**
```bash
# On Asterisk server:
tcpdump -i any port 5060 -n -A

# Expected to see:
# SIP INVITE from LiveKit Cloud
# To: sip:17672958382@voice.epic.dm
# From: sip:livekit@voice.epic.dm
```

**Check LiveKit Room:**
```bash
# During active call:
lk room list

# Expected: See room with 2 participants
# - Agent (publisher)
# - SIP participant
```

### Phase 4: Undeploy Agent

**Steps to Undeploy:**

1. **Click "Remove from Cloud"** button on deployed agent

2. **Backend Process** (automatic):
   - Changes status to 'undeploying'
   - Runs: `pkill -9 -f <agent_directory>`
   - Waits 1 second for termination
   - Verifies no processes remain
   - Changes status to 'created'

3. **Success Indicators**:
   - Status changes to 'created'
   - "Deploy to Cloud" button reappears
   - No local processes running
   - Agent deregistered from LiveKit Cloud

**Verify Undeployment:**
```bash
# 1. Check no local processes
ps aux | grep "agents/sales_agent"
# Expected: NO RESULTS

# 2. Check LiveKit Cloud
lk agent list
# Expected: "No agents found" OR agent is gone

# 3. Check database
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute('SELECT name, status FROM agent_configs WHERE name=\"Sales Agent\"')
print(cursor.fetchone())
"
# Expected: ('Sales Agent', 'created')

# 4. Try to list rooms
lk room list
# Expected: Empty (no active rooms)
```

## Common Issues & Solutions

### Issue 1: Agent Shows "Deployed" but Process Not Running

**Symptoms:**
- Database status = 'deployed'
- No local processes
- LiveKit shows old worker

**Solution:**
```bash
# Run cleanup script
./cleanup_and_verify.sh

# Refresh browser
# Click "Deploy to Cloud" again
```

### Issue 2: Can't Undeploy Agent

**Symptoms:**
- Clicking "Remove from Cloud" doesn't work
- Process still running after undeploy
- Status stuck in 'undeploying'

**Solution:**
```bash
# Manually kill processes
pkill -9 -f "agents/sales_agent"

# Reset database
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute('UPDATE agent_configs SET status=\"created\" WHERE name=\"Sales Agent\"')
conn.commit()
"

# Refresh browser
```

### Issue 3: Calls Not Reaching Asterisk

**Check List:**
```bash
# 1. Is agent deployed?
ps aux | grep agents
lk agent list

# 2. Is room created?
lk room list  # During call

# 3. Is SIP trunk configured?
lk sip outbound list

# 4. Can you reach Asterisk?
nc -zv voice.epic.dm 5060

# 5. Check backend logs
tail -50 /opt/livekit1/backend.log | grep -i "sip\|outbound"
```

**Most Common Cause:** Agent not deployed!
- Deploy agent first
- Then test calls
- Verify agent joins room during call

### Issue 4: Multiple Agents in LiveKit Cloud

**Symptoms:**
- LiveKit shows multiple workers
- Only one agent should be deployed
- Old agents not cleaned up

**Solution:**
```bash
# Kill ALL agent processes
pkill -9 -f "agents/"

# Reset ALL agent statuses
python3 -c "
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute('UPDATE agent_configs SET status=\"created\"')
conn.commit()
print(f'Reset {cursor.rowcount} agents')
"

# Wait 30 seconds for LiveKit to detect disconnection
sleep 30

# Verify cleanup
lk agent list
# Should show: "No agents found"
```

## Best Practices

### DO:
- ✅ Deploy ONE agent at a time
- ✅ Wait 15+ seconds for deployment to complete
- ✅ Verify deployment status before making calls
- ✅ Undeploy agents when not in use
- ✅ Run cleanup script if things get messy

### DON'T:
- ❌ Deploy multiple agents simultaneously
- ❌ Make calls before agent is deployed
- ❌ Close browser during deployment
- ❌ Kill agent processes manually (use UI)
- ❌ Edit agent files while deployed

## Testing Checklist

Before making a test call, verify:

```bash
# Checklist
[ ] Agent status in database = 'deployed'
[ ] Green deployment panel visible in UI
[ ] Local process running: ps aux | grep agents
[ ] LiveKit shows agent: lk agent list
[ ] SIP trunk configured: lk sip outbound list
[ ] Asterisk reachable: nc -zv voice.epic.dm 5060
[ ] Backend running: ps aux | grep user_dashboard

# If all checked, proceed with test call
```

## Monitoring During Test Call

**Terminal 1: Agent Logs**
```bash
tail -f /opt/livekit1/agents/sales_agent/*.log
```

**Terminal 2: Backend Logs**
```bash
tail -f /opt/livekit1/backend.log
```

**Terminal 3: LiveKit Status**
```bash
watch -n 2 'lk room list'
```

**Terminal 4: Asterisk SIP (on Asterisk server)**
```bash
tcpdump -i any port 5060 -n -A
```

## Success Criteria

A successful deployment and call should show:

1. **Deployment**: Green panel, process running, LiveKit registered
2. **Call Initiation**: Room created, "Outbound call initiated" message
3. **Agent Join**: Agent detects room and joins within 2 seconds
4. **SIP Invite**: Asterisk receives INVITE from LiveKit
5. **Ring**: Phone rings
6. **Answer**: Agent starts conversation when answered

## Quick Reference Commands

```bash
# Check everything
./cleanup_and_verify.sh

# Manual cleanup
pkill -9 -f "agents/"
python3 -c "import sqlite3; conn = sqlite3.connect('/opt/livekit1/voice_agents.db'); conn.execute('UPDATE agent_configs SET status=\"created\"'); conn.commit()"

# Verify agent status
lk agent list

# Verify rooms
lk room list

# Check SIP trunk
lk sip outbound list

# Test Asterisk connectivity
nc -zv voice.epic.dm 5060

# Monitor logs
tail -f /opt/livekit1/backend.log /opt/livekit1/agents/sales_agent/*.log
```
