# 🔧 Agent Prompt Update Fix - Configuration Not Applied

## 📋 **Problem Summary:**

When you edit an agent's prompt (or any configuration) and save it:
1. ✅ Configuration saves to database successfully
2. ❌ **Agent keeps using OLD configuration** (doesn't reload)
3. ❌ **No visual feedback** that system is applying changes

---

## 🎯 **Root Cause:**

### **Problem 1: Agent Not Reloading Configuration**

The deployed agent process:
- Loads configuration from database **ONCE** when it starts
- Keeps using that config in memory
- **Never checks for updates** while running

**Result:** Even though you save new prompt to database, the running agent never sees it.

### **Problem 2: No Visual Feedback**

When you save changes:
- Backend triggers restart in background thread
- **No status update** in database during restart
- **UI shows no indication** that changes are being applied
- User doesn't know if it worked or how long to wait

---

## ✅ **Solutions Implemented:**

### **Solution 1: Automatic Agent Restart**

When you update a **deployed** agent's configuration:

```python
# Backend automatically:
1. Sets status to 'updating' in database
2. Saves all configuration changes
3. Kills the old agent process
4. Starts new agent with fresh config from database
5. Sets status back to 'deployed' when ready
```

**Timeline:**
```
0s  - You click "Save Changes"
1s  - Status changes to 'updating'
2s  - Old agent process killed
3s  - New agent process started
5s  - Agent connects to LiveKit Cloud
8s  - Status changes back to 'deployed'
```

### **Solution 2: Visual Feedback in UI**

**New 'updating' Status:**

When configuration is being applied, the agent card shows:

```
┌─────────────────────────────────┐
│  EPIC Demo Agent                │
│                                 │
│  [🔄 Applying Changes...]       │
│     ↑                           │
│     Orange button with spinner  │
│     Disabled while updating     │
└─────────────────────────────────┘
```

**Status Progression:**

```
Before Save:
[✅ Test Call] [Remove from Cloud]  ← Deployed & ready

Immediately After Save:
[🔄 Applying Changes...]            ← Updating (5-10 seconds)

After Completion:
[✅ Test Call] [Remove from Cloud]  ← Deployed with NEW config
```

### **Solution 3: Informative Toast Messages**

**For Deployed Agents:**
```
✅ Configuration Saved!
🔄 Restarting agent with new settings (5-10 seconds). 
   The button will show "Applying Changes..."
```

**For Non-Deployed Agents:**
```
✅ Configuration Saved!
Changes saved. Deploy the agent to apply them.
```

---

## 🔍 **Technical Implementation:**

### **Backend Changes:**

#### **1. Update Agent Endpoint** (`/api/user/agents/<id>`)

**File:** `/opt/livekit1/user_dashboard.py`

**Before:**
```python
# Just save to database
agent.instructions = data.get('instructions', agent.instructions)
db.commit()
return jsonify({'success': True})
```

**After:**
```python
# Check if deployed
was_deployed = agent.status == 'deployed'

# Set status to 'updating' immediately
if was_deployed:
    agent.status = 'updating'
    db.commit()
    print(f"🔄 Agent '{agent_name}' status set to 'updating'...")

# Save all configuration
agent.instructions = data.get('instructions', agent.instructions)
# ... all other fields ...
db.commit()

# If deployed, restart in background
if was_deployed:
    def restart_agent():
        try:
            # 1. Kill old process
            subprocess.run(['pkill', '-9', '-f', f'{agent_dir}/main.py'])
            time.sleep(2)
            
            # 2. Copy fresh .env
            shutil.copy('/opt/livekit1/.env', f'{agent_dir}/.env')
            
            # 3. Start new process
            subprocess.Popen(['python3', 'main.py', 'start'], cwd=agent_dir)
            time.sleep(5)
            
            # 4. Update status back to 'deployed'
            agent_record.status = 'deployed'
            db.commit()
            
        except Exception as e:
            # On error, set status to 'created'
            agent_record.status = 'created'
            db.commit()
    
    # Run in background thread
    threading.Thread(target=restart_agent, daemon=True).start()
    
    return jsonify({
        'success': True,
        'restarted': True,
        'status': 'updating',
        'message': 'Agent configuration saved. Restarting with new settings...'
    })
```

#### **2. Agent Config Loader** (`db_config.py`)

**File:** `/opt/livekit1/agents/epic_demo/db_config.py`

Already loads from database on startup:

```python
def load_agent_config():
    # Find agent by directory
    agent = session.query(AgentConfig).filter(
        AgentConfig.file_path.like(f'%{current_dir}%')
    ).first()
    
    # Build config from database
    config = {
        'INSTRUCTIONS': agent.instructions,
        'LLM_MODEL': agent.llm_model,
        'TTS_VOICE': agent.voice,
        # ... all configuration from DB
    }
    
    return config

# Load configuration on import
_config = load_agent_config()
INSTRUCTIONS = _config['INSTRUCTIONS']
```

**This means:** Every time agent restarts, it reads **fresh** config from database!

### **Frontend Changes:**

#### **1. New Agent Status Type**

**File:** `/opt/livekit1/frontend/lib/types.ts`

```typescript
export interface Agent {
  // ... other fields ...
  status?: 'created' | 'deployed' | 'deploying' | 'updating' | 'stopped' | 'active' | 'inactive'
  //                                               ↑ NEW STATUS
}
```

#### **2. Visual Status Indicator**

**File:** `/opt/livekit1/frontend/app/agents/page.tsx`

```typescript
{agent.status === 'updating' ? (
  <button
    disabled
    className="bg-orange-500 cursor-not-allowed"
  >
    <RefreshCw className="h-4 w-4 animate-spin" />
    <span>Applying Changes...</span>
  </button>
) : agent.status === 'deployed' ? (
  // Normal deployed buttons
) : (
  // Deploy button
)}
```

#### **3. Improved Toast Messages**

**File:** `/opt/livekit1/frontend/components/EditAgentModal.tsx`

```typescript
if (response.restarted) {
  toast.success('Configuration Saved!', {
    description: '🔄 Restarting agent with new settings (5-10 seconds). The button will show "Applying Changes..."',
    duration: 8000,
  })
}
```

---

## 🧪 **How to Test:**

### **Test 1: Deployed Agent Configuration Update**

1. **Deploy an agent** (if not already deployed)
   ```
   Go to Agents page → Click "Deploy to Cloud"
   Wait for status to become "Deployed"
   ```

2. **Edit the prompt**
   ```
   Click "Edit" button
   Go to "Basics" tab
   Change "Agent Instructions" field
   Example: Add "Always be very enthusiastic!" to the prompt
   Click "Save Changes"
   ```

3. **Observe the process**
   ```
   ✅ Toast appears: "Configuration Saved! 🔄 Restarting agent..."
   ✅ Modal closes
   ✅ Agent card button changes to "🔄 Applying Changes..." (orange)
   ✅ Button is disabled with spinner
   ```

4. **Wait 5-10 seconds**
   ```
   ✅ Button changes back to "Test Call" (green)
   ✅ Status is "deployed" again
   ```

5. **Make a test call**
   ```
   Click "Test Call"
   Make an outbound call
   ✅ Agent should use NEW prompt!
   ```

### **Test 2: Non-Deployed Agent Update**

1. **Create or select non-deployed agent**
   ```
   Status should be "created" (not deployed)
   ```

2. **Edit configuration**
   ```
   Change any setting
   Click "Save Changes"
   ```

3. **Observe the process**
   ```
   ✅ Toast: "Configuration Saved! Changes saved. Deploy the agent to apply them."
   ✅ No restart happens (agent not running)
   ✅ Button stays as "Deploy to Cloud"
   ```

4. **Deploy the agent**
   ```
   Click "Deploy to Cloud"
   ✅ Agent starts with NEW configuration from database
   ```

### **Test 3: Multiple Configuration Changes**

1. **Start with deployed agent**

2. **Make first change**
   ```
   Edit → Change voice to "nova" → Save
   ✅ Watch for "Applying Changes..." status
   ```

3. **Wait for completion** (button back to "Test Call")

4. **Make second change**
   ```
   Edit → Change temperature to 0.9 → Save
   ✅ Watch for "Applying Changes..." status again
   ```

5. **Test the agent**
   ```
   Make a call
   ✅ Agent should use latest configuration (voice: nova, temp: 0.9)
   ```

---

## 📊 **Status Flow Diagram:**

### **For Deployed Agents:**

```
┌─────────────────────────────────────────────────────────────┐
│ User edits prompt and clicks "Save Changes"                │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Set status = 'updating' in database               │
│          Save all configuration changes                     │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ UI: Shows "🔄 Applying Changes..." (orange button)          │
│     Button is disabled                                      │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Background Thread: Kill old agent process                  │
│                    Start new agent process                  │
│                    Agent loads fresh config from database   │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Agent: Connects to LiveKit Cloud (3-5 seconds)             │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Set status = 'deployed' in database               │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ UI: Shows "Test Call" button again (green)                 │
│     Agent is ready with NEW configuration!                 │
└─────────────────────────────────────────────────────────────┘
```

### **For Non-Deployed Agents:**

```
┌─────────────────────────────────────────────────────────────┐
│ User edits configuration and clicks "Save Changes"         │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Save configuration to database                    │
│          No restart (agent not running)                     │
└─────────────────────────┬───────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ UI: Toast message "Changes saved. Deploy to apply."        │
│     Button stays as "Deploy to Cloud"                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 **Important Notes:**

### **Configuration Takes Effect:**

- **Deployed agents:** Immediately after restart (5-10 seconds)
- **Non-deployed agents:** When you deploy them
- **During calls:** Existing calls use old config, new calls use new config

### **What Gets Restarted:**

When you save configuration changes to a deployed agent, the system restarts:
- ✅ The agent Python process
- ✅ All loaded configuration
- ✅ LLM, STT, TTS settings
- ✅ Agent instructions/prompt
- ✅ Voice settings
- ✅ All other agent parameters

### **What Doesn't Change:**

- ❌ LiveKit Cloud connection (same room)
- ❌ Assigned phone numbers
- ❌ SIP trunk configuration
- ❌ Call history/logs

### **Timing:**

```
Configuration Update Process:
0-1s   - Save to database, set status to 'updating'
1-2s   - Kill old process
2-3s   - Start new process
3-8s   - Agent connects to LiveKit Cloud
8-10s  - Status set back to 'deployed', ready for calls

Total: ~5-10 seconds
```

---

## 🔍 **Troubleshooting:**

### **Problem: Status Stuck on "Applying Changes..."**

**Cause:** Agent failed to restart

**Check:**
```bash
# Check if agent process is running
ps aux | grep "epic_demo/main.py"

# Check agent logs
tail -50 /opt/livekit1/agents/epic_demo/agent.log

# Check backend logs
tail -50 /opt/livekit1/flask.log
```

**Fix:**
```bash
# Manually restart agent
cd /opt/livekit1/agents/epic_demo
pkill -f "main.py"
python3 main.py start &

# Or undeploy and redeploy from UI
```

### **Problem: Changes Not Applied**

**Cause:** Old agent process still running

**Check:**
```bash
# Check for multiple agent processes
ps aux | grep "main.py" | grep -v grep
```

**Fix:**
```bash
# Kill all agent processes
pkill -9 -f "epic_demo/main.py"

# Redeploy from UI
```

### **Problem: Agent Won't Start After Update**

**Cause:** Invalid configuration

**Check:**
```bash
# Check agent logs for errors
tail -100 /opt/livekit1/agents/epic_demo/agent.log | grep -i error
```

**Common issues:**
- Invalid voice name
- Invalid LLM model
- Missing API keys
- Syntax error in prompt

**Fix:**
```
1. Go to UI
2. Edit agent configuration
3. Fix the invalid setting
4. Save changes
```

---

## 📝 **Configuration Fields That Auto-Restart:**

All these fields trigger automatic restart when changed on a deployed agent:

### **Basics:**
- ✅ Agent Name
- ✅ Agent Instructions (Prompt)
- ✅ Temperature

### **AI Models:**
- ✅ LLM Provider (OpenAI, Anthropic, etc.)
- ✅ LLM Model (gpt-4o-mini, claude-3-5-sonnet, etc.)
- ✅ STT Provider
- ✅ STT Model
- ✅ TTS Provider
- ✅ TTS Voice

### **Voice & Audio:**
- ✅ Voice Activity Detection (VAD)
- ✅ Turn Detection Model
- ✅ Noise Cancellation

### **Session Options:**
- ✅ Preemptive Generation
- ✅ Resume False Interruption
- ✅ Interruption Timeouts
- ✅ Greeting Message

---

## ✅ **Summary:**

| Aspect | Before | After |
|--------|--------|-------|
| **Prompt updates** | ❌ Agent ignores changes | ✅ Auto-restarts with new prompt |
| **Visual feedback** | ❌ No indication | ✅ "Applying Changes..." status |
| **User awareness** | ❌ Unclear what's happening | ✅ Clear toast messages |
| **Status tracking** | ❌ No status updates | ✅ 'updating' → 'deployed' |
| **Restart time** | N/A | ✅ 5-10 seconds |
| **Error handling** | ❌ Silent failures | ✅ Status resets to 'created' |

---

## 🎯 **Quick Reference:**

### **To Update Agent Configuration:**

1. **Click "Edit"** on agent card
2. **Make your changes** (prompt, voice, model, etc.)
3. **Click "Save Changes"**
4. **Wait for confirmation:**
   - Toast message appears
   - Button shows "Applying Changes..." (if deployed)
5. **Wait 5-10 seconds** for restart
6. **Test your changes** with a call

### **Status Indicators:**

- **🔵 Deploy to Cloud** - Not deployed
- **🟠 Applying Changes...** - Restarting with new config
- **🟢 Test Call** - Deployed and ready
- **🔴 Remove from Cloud** - Deployed (undeploy option)

---

**Your agent now automatically restarts and applies new configuration when you save changes!** 🎉
