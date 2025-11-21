# 🚀 Quick Reference Guide

## Start Services

```bash
# Start Backend
cd /opt/livekit1
nohup python3 -u user_dashboard.py > backend.log 2>&1 &

# Start Agent
cd /opt/livekit1/agents/sales_agent
nohup python3 main.py > agent.log 2>&1 &

# Start Frontend (development)
cd /opt/livekit1/frontend
npm run dev
```

## Stop Services

```bash
# Stop Backend
pkill -f user_dashboard.py

# Stop Agent
pkill -f "python3 main.py"

# Stop Frontend
# Press Ctrl+C in terminal
```

## Check Status

```bash
# Check if running
ps aux | grep -E "user_dashboard|main.py" | grep -v grep

# Check logs
tail -f /opt/livekit1/backend.log
tail -f /opt/livekit1/agents/sales_agent/agent.log

# Check LiveKit rooms
lk room list

# Check SIP trunks
lk sip outbound list
lk sip inbound list
```

## Test Calls

### Outbound Call (GUI)
1. Open: http://localhost:3001/agents
2. Click "Test Call" on agent
3. Enter number: +17672958382
4. Click "Initiate Call"

### Outbound Call (CLI)
```bash
cd /opt/livekit1
./test_sip_cli.sh
```

### Incoming Call
Just dial your Asterisk number from any phone!

## Troubleshooting

### Agent Not Joining
```bash
# Restart agent
pkill -f "python3 main.py"
cd /opt/livekit1/agents/sales_agent
nohup python3 main.py > agent.log 2>&1 &

# Check logs
tail -50 agent.log | grep -i error
```

### Call Not Connecting
```bash
# Check trunk status
lk sip outbound list

# Check backend logs
tail -50 /opt/livekit1/backend.log | grep -i error

# Check Asterisk (on PBX server)
tail -f /var/log/asterisk/full | grep INVITE
```

## URLs

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **External**: http://66.118.37.6:3001

## Important Files

```
/opt/livekit1/.env                          # Config
/opt/livekit1/user_dashboard.py             # Backend
/opt/livekit1/agents/sales_agent/main.py    # Agent
/opt/livekit1/voice_agents.db               # Database
```

## Key Configuration

**LiveKit Trunk**: ST_sTo8gGpNbXzY
**Transport**: TCP (must match Asterisk!)
**From Number**: +17678183366
**Agent Name**: "" (empty = accepts all rooms)

## Emergency Reset

```bash
# Restart everything
cd /opt/livekit1
./restart_all.sh
```
