# Multi-Layer SIP Status System - User Guide

**Version:** 1.0
**Date:** 2025-11-20
**Feature:** Layered status monitoring for AI agent call readiness

---

## 🎯 What Problem Does This Solve?

### Before:
```
Status: ERROR ❌
```
**Problem:** You don't know WHY calls are failing!
- Is the SIP trunk down?
- Is the agent offline?
- Is something being provisioned?

### After:
```
📞 Call Readiness: ✗ NOT READY

🌐 SIP Trunk: ✅ REGISTERED
🤖 Agent Process: ❌ OFFLINE

🚫 Blocking Issues:
  • Agent process is not running
```
**Solution:** You know EXACTLY what's wrong and how to fix it!

---

## 📊 The 3-Layer System

### Layer 1️⃣: SIP Trunk Infrastructure
**What it checks:** Can Magnus Billing route calls to LiveKit?

**Status Values:**
- ✅ **REGISTERED**: SIP trunk is UP, infrastructure ready
- ⏳ **PROVISIONING**: Being set up (10-15 seconds after adding number)
- ❌ **NOT REGISTERED**: SIP trunk connection is DOWN
- ⚠️ **ERROR**: Configuration problem
- ⚪ **NOT_PROVISIONED**: No phone number assigned yet

**What you'll see:**
- Magnus Billing registration status
- IP address and port
- Latency (ms)
- Last seen timestamp
- LiveKit trunk configuration

---

### Layer 2️⃣: Agent Process Status
**What it checks:** Is the AI agent application running?

**Status Values:**
- ✅ **ONLINE**: Agent process running and ready
- ❌ **OFFLINE**: Agent process not running
- ⏳ **STARTING**: Agent is starting up

**What you'll see:**
- Process running: Yes/No
- Process ID (PID)
- Uptime: How long agent has been running
- CPU usage: Percentage
- Memory usage: MB
- Last heartbeat: When agent last responded

---

### Layer 3️⃣: Call Readiness
**What it checks:** Can this agent receive calls RIGHT NOW?

**Status Values:**
- ✅ **READY**: Everything is working, can receive calls
- ❌ **NOT READY**: Something is blocking calls
- ⏳ **PROVISIONING**: System is being set up

**What you'll see:**
- **Blocking Issues**: List of problems preventing calls
- **Warnings**: Non-critical issues to address
- **Message**: Human-readable status explanation

---

## 🎭 Real-World Scenarios

### Scenario 1: Everything Working ✅
```
📞 Call Readiness: ✓ READY
Message: Agent is ready to receive calls

🌐 SIP Trunk: ✅ REGISTERED
Health Score: 100/100
Magnus: Registered at 1.2.3.4:5060
LiveKit: Trunk ST_xxx configured

🤖 Agent Process: ✓ ONLINE
PID: 12345
Uptime: 2h 15m
CPU: 2.5%
Memory: 150 MB
```

**What this means:** Your agent can receive calls! ✅

---

### Scenario 2: SIP Trunk Problem ⚠️
```
📞 Call Readiness: ✗ NOT READY
Message: 1 issue(s) preventing calls

🌐 SIP Trunk: ❌ NOT REGISTERED
Health Score: 0/100
Magnus: Not registered
Last seen: 1970-01-01 00:00:00

🤖 Agent Process: ✓ ONLINE
PID: 12345
Uptime: 2h 15m

🚫 Blocking Issues:
  • SIP trunk not registered with EPIC Voice
```

**What this means:** Infrastructure problem - SIP trunk is down

**How to fix:**
1. Check Magnus Billing configuration
2. Verify SIP credentials in phone_number_pool
3. Check LiveKit trunk configuration
4. Wait a few minutes and refresh (may auto-recover)

---

### Scenario 3: Agent Offline (Most Common) 🤖
```
📞 Call Readiness: ✗ NOT READY
Message: 1 issue(s) preventing calls

🌐 SIP Trunk: ✅ REGISTERED
Health Score: 100/100
Magnus: Registered

🤖 Agent Process: ❌ OFFLINE
Process Running: No
PID: None

🚫 Blocking Issues:
  • Agent process is not running
```

**What this means:** Application problem - agent is not running

**How to fix:**
1. Go to agent directory: `cd /opt/livekit1/agents/your-agent/`
2. Start the agent: `python agent.py dev &`
3. Or use systemd: `systemctl start your-agent`
4. Refresh status in UI to verify

---

### Scenario 4: Provisioning (First 10-15 seconds) ⏳
```
📞 Call Readiness: ⏳ PROVISIONING
Message: SIP trunk is being set up. Please wait 10-15 seconds.

🌐 SIP Trunk: ⏳ PROVISIONING
Health Score: 0/100

🤖 Agent Process: ❌ OFFLINE

🚫 Blocking Issues:
  • SIP trunk is being provisioned (10-15 seconds)
```

**What this means:** System is setting up - this is normal!

**What to do:**
- **Wait 10-15 seconds** for SIP trunk to become available
- Refresh the page
- Status will change to "REGISTERED" or "ERROR" once complete

---

### Scenario 5: Both Problems ❌❌
```
📞 Call Readiness: ✗ NOT READY
Message: 2 issue(s) preventing calls

🌐 SIP Trunk: ❌ NOT REGISTERED

🤖 Agent Process: ❌ OFFLINE

🚫 Blocking Issues:
  • SIP trunk not registered with EPIC Voice
  • Agent process is not running
```

**What this means:** Both layers have problems - fix both!

**How to fix:**
1. Fix SIP trunk first (infrastructure layer)
2. Then start agent process (application layer)
3. Refresh to verify both are working

---

## 🚨 Understanding Blocking Issues

### Common Blocking Issues:

| Issue | Layer | Meaning | Fix |
|-------|-------|---------|-----|
| "No SIP trunk provisioned for this agent" | SIP | No phone number assigned | Assign phone number to agent |
| "SIP trunk not registered with EPIC Voice" | SIP | Magnus connection down | Check Magnus Billing config |
| "Agent process is not running" | Agent | Application offline | Start agent process |
| "SIP trunk is being provisioned" | SIP | Setup in progress | Wait 10-15 seconds |

---

## ⚠️ Understanding Warnings

Warnings are **non-critical** issues that don't prevent calls but should be addressed:

| Warning | Meaning | Action |
|---------|---------|--------|
| "High latency: 250ms" | Slow SIP connection | Check network, may affect call quality |
| "SIP trunk health score is low: 50/100" | Degraded performance | Investigate SIP trunk issues |

---

## 📱 Where to See This Status

### 1. Agents Page
- View status for all agents at once
- Quick overview with status badges
- Click agent card to see detailed status

### 2. Agent Inspector
- Open agent inspector (click any agent)
- Go to "SIP Status" tab
- See full layered breakdown with all details

### 3. API Access
```bash
# Get status for specific agent
curl http://localhost:5001/api/user/agents/{agent_id}/sip-status

# Response includes all 3 layers:
{
  "sip_trunk": { ... },
  "agent": { ... },
  "call_readiness": { ... }
}
```

---

## 🔄 Status Refresh

**Auto-refresh:** Status automatically refreshes every 30 seconds

**Manual refresh:** Click the refresh button (🔄) in SIP Status panel

**During provisioning:** Refresh every 5 seconds to watch progress

---

## 🎯 Quick Troubleshooting Guide

### "Why aren't my calls working?"

**Step 1:** Check Call Readiness
- ✅ **READY** → Should work, test with a call
- ❌ **NOT READY** → Check blocking issues

**Step 2:** Identify The Layer
- 🌐 **SIP Trunk issue** → Infrastructure problem
- 🤖 **Agent offline** → Application problem
- ⏳ **Provisioning** → Wait 10-15 seconds

**Step 3:** Read Blocking Issues
- Lists specific problems
- Follow issue-specific fixes above

---

## 💡 Pro Tips

### Tip 1: Watch for Provisioning
When you assign a phone number to an agent:
1. Status shows "PROVISIONING" for 10-15 seconds
2. This is **normal** - SIP trunk is being set up
3. Don't panic! Just wait and refresh
4. Will change to "REGISTERED" when ready

### Tip 2: Agent Resource Monitoring
When agent is ONLINE, you can see:
- **CPU usage** - Should be < 10% when idle
- **Memory** - Typical: 100-200 MB
- **Uptime** - How long agent has been stable

High CPU or memory? Agent might need restart.

### Tip 3: Use Refresh Button
Click 🔄 in SIP Status panel to:
- Get latest status immediately
- Verify fixes you just made
- Check if provisioning completed

### Tip 4: Check Both Layers
**Even if one layer is green, check the other!**
- SIP ✅ + Agent ❌ = Calls won't work
- SIP ❌ + Agent ✅ = Calls won't work
- **BOTH must be green for calls to work**

---

## 📝 Terminology

| Term | Definition |
|------|------------|
| **SIP Trunk** | Connection between Magnus Billing and LiveKit for routing calls |
| **Agent Process** | The Python application running your AI agent |
| **Call Readiness** | Overall status combining both layers |
| **Blocking Issue** | Critical problem preventing calls |
| **Warning** | Non-critical issue to address |
| **Health Score** | 0-100 rating of SIP trunk quality |
| **Provisioning** | Setup process (10-15 seconds) when adding phone number |

---

## 🎉 Benefits of Layered Status

✅ **Immediate Clarity** - See exactly what's wrong
✅ **Better Troubleshooting** - Know which layer to fix
✅ **No Surprises** - See provisioning status during setup
✅ **Resource Monitoring** - Track agent performance
✅ **Proactive Alerts** - Fix warnings before they become critical

---

## 🆘 Need Help?

**Scenario:** Status says "READY" but calls still fail
- Check phone number is correct
- Verify Magnus Billing has credits
- Check firewall rules for SIP ports (5060)
- Review agent logs for errors

**Scenario:** Status stuck on "PROVISIONING" for > 30 seconds
- Refresh the page
- Check Magnus Billing API is responding
- Verify LiveKit credentials are correct
- Contact support if issue persists

**Scenario:** Agent shows "ONLINE" but actually crashed
- Refresh status (auto-detects within 30 seconds)
- Check agent logs for crash reason
- Restart agent process
- Status will update to reflect actual state

---

**This layered status system transforms generic errors into actionable information!** 🚀

Now you always know exactly what's blocking your calls and how to fix it.
