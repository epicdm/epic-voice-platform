# LiveKit Cloud Dashboard Access Guide

## Your Current Setup

**Project:** ai-agent  
**URL:** wss://ai-agent-dl6ldsi8.livekit.cloud  
**Mode:** Self-hosted (dev mode on your server)

## Available Dashboard Features

### 1. 📞 Rooms Dashboard (Active Now!)
**URL:** https://cloud.livekit.io/projects/p_/rooms

**What you can see:**
- Active SIP calls in real-time
- Participants in each room
- Audio/video tracks
- Connection quality
- Bandwidth usage

**Perfect for:** Monitoring live calls while your agent is running

### 2. 🔧 Project Settings
**URL:** https://cloud.livekit.io/projects/p_/settings

**What you can do:**
- View API keys and secrets
- Configure webhooks
- Set up egress (recording)
- Manage SIP trunks
- View usage and billing

### 3. 📊 Analytics (If enabled)
**URL:** https://cloud.livekit.io/projects/p_/analytics

**What you can see:**
- Call volume over time
- Average call duration
- Error rates
- Geographic distribution

### 4. 📱 SIP Configuration
**URL:** https://cloud.livekit.io/projects/p_/sip

**What you can manage:**
- Inbound trunks (your phone number: +17678183366)
- Dispatch rules
- SIP participant settings
- Test SIP connections

## To Get FULL Agent Dashboard

If you want the complete agent monitoring (CPU, memory, logs, error tracking), you need to deploy to LiveKit Cloud:

```bash
# Step 1: Make sure you have a livekit.toml
cd /opt/livekit1
lk agent config

# Step 2: Deploy your agent
lk agent deploy

# Step 3: Access full dashboard
# https://cloud.livekit.io/projects/p_/agents
```

**However**, for your use case (SIP trunking on headless server), **keep running locally** because:
- ✅ No cold start delays on incoming calls
- ✅ Full control over the agent
- ✅ Can customize freely
- ✅ Better for production SIP use

## Recommended Monitoring Stack (Local + Cloud)

### Use LiveKit Cloud Dashboard For:
1. **Active call monitoring** - See calls as they happen
2. **SIP configuration** - Manage trunks and routing
3. **Billing & usage** - Track costs
4. **Room history** - See past sessions

### Use Your Local Dashboard For:
1. **Agent control** - Start/stop/restart
2. **Configuration** - Edit API keys and settings
3. **Process monitoring** - CPU, memory, uptime
4. **Quick access** - No login needed

### Use Command Line For:
1. **Quick status checks** - `lk room list`
2. **SIP management** - `lk sip dispatch list`
3. **Debugging** - Direct log access

## Quick Links

- **Rooms (Active Calls):** https://cloud.livekit.io/projects/p_/rooms
- **SIP Management:** https://cloud.livekit.io/projects/p_/sip
- **Project Settings:** https://cloud.livekit.io/projects/p_/settings
- **Local Dashboard:** http://localhost:5000 (your custom one)
- **Documentation:** https://docs.livekit.io/agents/

## Current Status Check

Check if your agent is handling calls:
```bash
# See active rooms
lk room list

# See SIP trunks
lk sip inbound list

# See dispatch rules
lk sip dispatch list

# Check agent process
ps aux | grep livekit_basic_agent
```

## Next Steps

1. ✅ **Visit the Rooms Dashboard** - See your calls in action
2. ✅ **Bookmark the SIP page** - Quick access to trunk management  
3. ✅ **Test a call** - Watch it appear in real-time on the dashboard
4. ⚠️ **Consider deploying later** - Only if you want auto-scaling

---

**Bottom Line:** Your current setup is perfect for SIP use. The LiveKit Cloud dashboard shows your active calls and SIP config, which is exactly what you need!
