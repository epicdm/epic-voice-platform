# 🚀 Agent Deployment Guide

## ✅ **Deployment Fix Applied**

I've fixed the deployment error handler so you'll now see actual error messages instead of silent failures.

---

## 🎯 **How Agent Deployment Works:**

### **Step-by-Step Process:**

1. **User clicks "Deploy" button** on an agent
2. **Backend creates agent directory** from template (if needed)
3. **Copies .env file** with LiveKit credentials
4. **Installs dependencies** (`pip3 install -r requirements.txt`)
5. **Starts agent process** (`python3 main.py start`)
6. **Waits for LiveKit Cloud connection** (15 seconds max)
7. **Marks as deployed** if successful

---

## 🔧 **Prerequisites for Deployment:**

### **1. LiveKit Credentials Required** ⚠️

Check your `/opt/livekit1/.env` file has:

```bash
# LiveKit Cloud Configuration
LIVEKIT_URL='wss://your-project.livekit.cloud'
LIVEKIT_API_KEY='your-api-key'
LIVEKIT_API_SECRET='your-api-secret'
```

**How to get these:**
1. Go to: https://cloud.livekit.io
2. Create a project (or use existing)
3. Go to Settings → Keys
4. Copy: URL, API Key, API Secret
5. Update `.env` file

### **2. Template Agent Exists**

The system uses `/opt/livekit1/agents/sales_agent` as a template.

**Check it exists:**
```bash
ls -la /opt/livekit1/agents/sales_agent/
```

**Should contain:**
- `main.py` - Agent entry point
- `agent_logic.py` - Agent behavior
- `requirements.txt` - Python dependencies
- `config.py` - Configuration
- `db_config.py` - Database setup

---

## 🧪 **Test Deployment:**

### **Option 1: Via Web UI**

1. **Go to Agents page**
2. **Click "Deploy"** on any agent
3. **Wait 15-20 seconds**
4. **Check status:**
   - ✅ Green "Deployed" = Success
   - ❌ Red "Created" = Failed

### **Option 2: Via API (Shows Error Details)**

```bash
# Deploy Healthcare Screening Agent
curl -X POST http://localhost:5001/api/user/agents/bd14ffab-7923-4f0c-8ed8-17d6afd1af47/deploy

# Check response:
{
  "success": false,
  "error": "actual error message here",
  "message": "Deployment failed. Check server logs for details."
}
```

### **Option 3: Check Flask Logs**

```bash
# Watch logs in real-time
tail -f /opt/livekit1/flask.log

# Or check recent errors
tail -100 /opt/livekit1/flask.log | grep -A 10 "Deployment failed"
```

---

## ❌ **Common Deployment Errors:**

### **Error 1: Template Agent Not Found**
```
Error: Template agent not found
```

**Cause:** `/opt/livekit1/agents/sales_agent` doesn't exist

**Solution:**
```bash
# Check if template exists
ls /opt/livekit1/agents/sales_agent/

# If missing, need to create template or fix path
```

### **Error 2: LiveKit Connection Failed**
```
Error: Agent started but failed to connect to LiveKit Cloud
Message: Please check your LiveKit credentials and network connectivity
```

**Cause:** 
- Invalid LiveKit credentials in `.env`
- No internet connection
- LiveKit Cloud is down
- Firewall blocking websocket connection

**Solution:**
```bash
# 1. Check .env has valid credentials
cat /opt/livekit1/.env | grep LIVEKIT

# 2. Test connection
curl -s https://your-project.livekit.cloud

# 3. Check agent logs
tail -50 /opt/livekit1/agents/healthcare_screening_agent/agent.log
```

### **Error 3: Dependencies Installation Failed**
```
Warning: Dependency installation had issues
```

**Cause:** Missing Python packages or pip errors

**Solution:**
```bash
# Manually install dependencies
cd /opt/livekit1/agents/sales_agent
pip3 install -r requirements.txt

# Check for errors
```

### **Error 4: Agent Process Died Immediately**
```
Error: Agent failed to start. Check logs.
```

**Cause:**
- Python syntax error in agent code
- Missing required environment variables
- Port already in use

**Solution:**
```bash
# Check agent logs
cat /opt/livekit1/agents/healthcare_screening_agent/agent.log

# Try running manually
cd /opt/livekit1/agents/healthcare_screening_agent
python3 main.py start
```

---

## 🔍 **Troubleshooting Steps:**

### **Step 1: Check LiveKit Credentials**

```bash
# View current credentials
cd /opt/livekit1
grep LIVEKIT .env

# Should show:
# LIVEKIT_URL='wss://...'
# LIVEKIT_API_KEY='...'
# LIVEKIT_API_SECRET='...'
```

### **Step 2: Test Manual Deployment**

```bash
# Go to agent directory
cd /opt/livekit1/agents/healthcare_screening_agent

# Copy .env
cp /opt/livekit1/.env .

# Install dependencies
pip3 install -r requirements.txt

# Try starting manually
python3 main.py start

# Watch for errors in output
```

### **Step 3: Check Agent Logs**

```bash
# View agent logs
tail -50 /opt/livekit1/agents/healthcare_screening_agent/agent.log

# Look for:
# - "registered worker" = Success!
# - "Connection refused" = LiveKit issue
# - Python errors = Code issue
```

### **Step 4: Check Flask Logs**

```bash
# Check deployment logs
tail -100 /opt/livekit1/flask.log | grep -E "(Deploy|deploy|ERROR)"

# Look for specific errors
```

---

## 📋 **Agent Directory Structure:**

After deployment, each agent has:

```
/opt/livekit1/agents/healthcare_screening_agent/
├── main.py              ← Entry point
├── agent_logic.py       ← Agent behavior
├── config.py            ← Configuration
├── db_config.py         ← Database setup
├── requirements.txt     ← Dependencies
├── .env                 ← LiveKit credentials (copied)
└── agent.log            ← Runtime logs
```

---

## ✅ **Successful Deployment Looks Like:**

### **Flask Logs:**
```
📁 Creating agent files from template: /opt/livekit1/agents/healthcare_screening_agent
📦 Installing dependencies for Healthcare Screening Agent...
⏳ Waiting for agent Healthcare Screening Agent to connect to LiveKit Cloud...
✅ Deployed agent Healthcare Screening Agent to LiveKit Cloud (PID: 12345)
📝 Logs: /opt/livekit1/agents/healthcare_screening_agent/agent.log
```

### **Agent Logs:**
```
INFO:livekit.agents:registered worker
INFO:livekit:Connected to LiveKit Cloud
INFO:agent:Agent ready for calls
```

### **Web UI:**
```
Agent Status: 🟢 Deployed
Last Updated: Just now
```

---

## 🚨 **Quick Fix Checklist:**

Before deploying, verify:

- [ ] `.env` file has valid LiveKit credentials
- [ ] Internet connection working
- [ ] Template agent exists (`/opt/livekit1/agents/sales_agent/`)
- [ ] No other process using same agent name
- [ ] Python3 and pip3 installed
- [ ] Flask server running

---

## 🎯 **Next Steps:**

### **1. Update LiveKit Credentials (If Needed)**

```bash
nano /opt/livekit1/.env

# Update these lines:
LIVEKIT_URL='wss://your-actual-project.livekit.cloud'
LIVEKIT_API_KEY='your-actual-api-key'
LIVEKIT_API_SECRET='your-actual-api-secret'

# Save and restart Flask
pkill -f user_dashboard.py
cd /opt/livekit1
python3 user_dashboard.py
```

### **2. Try Deploying Again**

1. Refresh browser
2. Go to Agents page
3. Click "Deploy" on an agent
4. Check Flask logs: `tail -f /opt/livekit1/flask.log`
5. Wait 15-20 seconds
6. Check status

### **3. If Still Failing**

Share the error message from:
- Flask logs: `tail -100 /opt/livekit1/flask.log`
- Agent logs: `cat /opt/livekit1/agents/[agent_name]/agent.log`

---

## 📞 **What Happens After Deployment:**

Once deployed, the agent:
1. ✅ Connects to LiveKit Cloud
2. ✅ Registers as available worker
3. ✅ Listens for incoming calls
4. ✅ Handles calls automatically
5. ✅ Logs all activity to `agent.log`

**To make a test call:**
- Call the phone number assigned to the agent
- Agent should answer and respond

---

## ✅ **Summary:**

| Item | Status |
|------|--------|
| **Deployment error handler** | ✅ Fixed |
| **Error messages** | ✅ Now visible |
| **Template agent** | ✅ Exists |
| **LiveKit credentials** | ⚠️ Need to verify |
| **Ready to test** | ✅ Yes |

---

**Try deploying an agent again and let me know what error message you see!** 🚀
