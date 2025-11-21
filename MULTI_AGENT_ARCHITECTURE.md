# 🏗️ Multi-Agent Architecture

## 📋 **Overview**

Your system supports **multiple AI agents** running simultaneously, each with:
- Unique configuration (prompt, voice, model)
- Dedicated phone numbers
- Independent deployment status
- Separate call handling

---

## 🎯 **How Multi-Agent Works**

### **1. Agent Storage (Database)**

All agents are stored in `voice_agents.db`:

```sql
agent_configs table:
  - id (unique identifier)
  - name (display name)
  - instructions (system prompt)
  - status (created, deployed, inactive)
  - file_path (deployment directory)
  - llm_model, voice, temperature, etc.
  - created_at, updated_at
```

**Example:**
```
Agent 1: "Sales Assistant"
  status: deployed
  file_path: /opt/livekit1/agents/sales_agent
  instructions: "You are a sales assistant..."

Agent 2: "Support Agent"
  status: deployed
  file_path: /opt/livekit1/agents/support_agent
  instructions: "You are a support agent..."
```

---

### **2. Agent Deployment**

Each deployed agent:
- Has its own directory (`/opt/livekit1/agents/agent_name/`)
- Runs as a separate Python process
- Connects to LiveKit Cloud independently
- Registers as a unique worker

**File Structure:**
```
/opt/livekit1/agents/
  ├── sales_agent/
  │   ├── main.py          ← Entry point
  │   ├── agent_logic.py   ← Agent behavior
  │   ├── db_config.py     ← Loads from database
  │   ├── .env             ← LiveKit credentials
  │   └── agent.log        ← Runtime logs
  │
  ├── support_agent/
  │   ├── main.py
  │   ├── agent_logic.py
  │   ├── db_config.py
  │   └── ...
  │
  └── custom_agent/
      └── ...
```

---

### **3. Call Routing**

**Phone Number → Agent Mapping:**

```sql
phone_mappings table:
  - id
  - phone_number (e.g., "+17678183742")
  - agent_id (links to agent_configs.id)
  - sip_trunk_id (LiveKit SIP trunk)
```

**Call Flow:**
```
1. Incoming call to +17678183742
   ↓
2. LiveKit SIP receives call
   ↓
3. Queries phone_mappings table
   ↓
4. Finds agent_id linked to this number
   ↓
5. Routes call to that agent's worker
   ↓
6. Agent loads its config from database
   ↓
7. Handles call with its specific prompt/voice
```

---

## 🔄 **Agent Lifecycle**

### **States:**

```
Created → Deployed → Active → Undeployed
   ↓         ↓         ↓          ↓
  Edit     Taking    Running    Stopped
           calls     calls
```

### **Status Values:**

- **`created`** - Agent configuration saved, not deployed
- **`deploying`** - Deployment in progress
- **`deployed`** - Running and connected to LiveKit
- **`undeploying`** - Stopping in progress
- **`inactive`** - Stopped but config preserved

---

## 🎛️ **Agent Identification**

### **How `db_config.py` Finds Its Agent:**

```python
# Method 1: By directory name
current_dir = "sales_agent"  # From /opt/livekit1/agents/sales_agent
agent = query(AgentConfig).filter(
    AgentConfig.file_path.like(f'%{current_dir}%')
).first()

# Method 2: By name mapping (fallback)
name_map = {
    'sales_agent': 'Sales Assistant',
    'support_agent': 'Support Agent',
}
agent = query(AgentConfig).filter(
    AgentConfig.name == name_map[current_dir]
).first()
```

### **Important:**
- `file_path` must match the agent directory
- If multiple agents have same name, uses first match
- Status must be `deployed` for auto-restart

---

## 🔧 **Managing Multiple Agents**

### **Scenario 1: Add New Agent**

1. **Create** agent in GUI
2. **Configure** prompt, voice, settings
3. **Deploy** to cloud
4. **Assign** phone number(s)
5. **Done!** Agent handles calls

### **Scenario 2: Edit Existing Agent**

1. **Find** agent in GUI (make sure it's the deployed one)
2. **Edit** configuration
3. **Save** changes
4. **Auto-restart** applies changes (if deployed)
5. **Test** call to verify

### **Scenario 3: Multiple Agents Same Phone**

❌ **NOT SUPPORTED** - One phone number = One agent

If you need:
- Different behaviors for same number
- Time-based routing
- Condition-based routing

→ Use ONE agent with conditional logic in prompt

### **Scenario 4: One Agent Multiple Phones**

✅ **SUPPORTED** - Assign multiple phone numbers to same agent

```sql
phone_mappings:
  +17678183742 → agent_id: abc123
  +15551234567 → agent_id: abc123
  +14445556789 → agent_id: abc123
```

All three numbers route to same agent with same config.

---

## ⚠️ **Common Issues**

### **Issue 1: Edited Wrong Agent**

**Symptom:** Changed prompt but calls still use old one

**Cause:** You edited agent "A" but calls route to agent "B"

**Solution:**
```bash
# Check which agent is deployed
python3 -c "import sqlite3; conn = sqlite3.connect('/opt/livekit1/voice_agents.db'); cursor = conn.cursor(); cursor.execute('SELECT name, status, file_path FROM agent_configs'); [print(f'{r[0]}: {r[1]}, path={r[2]}') for r in cursor.fetchall()]"

# Edit the one with status='deployed' and file_path set
```

---

### **Issue 2: Duplicate Agent Names**

**Symptom:** Two agents with same name in database

**Cause:** Created new agent instead of editing existing

**Problem:** db_config.py might load wrong one

**Solution:**
```sql
-- Delete duplicate (keep the deployed one)
DELETE FROM agent_configs 
WHERE name = 'Sales Agent' 
AND status = 'created';

-- Or rename to avoid confusion
UPDATE agent_configs 
SET name = 'Sales Agent (Old)' 
WHERE id = 'duplicate-id';
```

---

### **Issue 3: Agent Not Auto-Restarting**

**Symptom:** Edit saved but no auto-restart

**Checklist:**
- ✅ Agent status is `deployed`?
- ✅ Agent has `file_path` set?
- ✅ Edited the correct agent (not a duplicate)?
- ✅ Flask server running and processing requests?

**Debug:**
```bash
# Check agent status
sqlite3 voice_agents.db "SELECT name, status, file_path FROM agent_configs"

# Check Flask logs for restart attempt
tail -50 flask.log | grep "auto-restart"

# Manual restart if needed
pkill -f "sales_agent/main.py" && cd /opt/livekit1/agents/sales_agent && nohup python3 main.py start > agent.log 2>&1 &
```

---

### **Issue 4: Agent Loading Wrong Config**

**Symptom:** Agent says it loaded "Agent A" but you edited "Agent B"

**Cause:** Directory name doesn't match agent name in database

**Solution:**
```python
# Check what agent is being loaded
cd /opt/livekit1/agents/sales_agent
python3 -c "from db_config import AGENT_NAME; print(f'Loading: {AGENT_NAME}')"

# If wrong agent, update file_path in database
# Point the directory to the correct agent ID
```

---

## 🎯 **Best Practices**

### **Naming Convention:**

✅ **Good:**
- "Sales Agent - Dental"
- "Support Agent - Medical"
- "Appointment Agent - Salon"

❌ **Bad:**
- "Agent 1"
- "Test"
- "New Agent" (duplicate names)

### **Organization:**

```
Production Agents:
  ✅ Sales Agent (deployed)
  ✅ Support Agent (deployed)
  ✅ Booking Agent (deployed)

Development/Test:
  ⚠️ Test Agent (created)
  ⚠️ Demo Agent (created)

Archived:
  ❌ Old Sales Agent (inactive)
  ❌ Legacy Support (inactive)
```

### **Phone Number Assignment:**

```
Business Line: +1-555-100-0001 → Sales Agent
Support Line:  +1-555-100-0002 → Support Agent
After Hours:   +1-555-100-0003 → Booking Agent
```

---

## 📊 **Monitoring Multiple Agents**

### **Check All Running Agents:**

```bash
ps aux | grep "main.py start" | grep -v grep
```

### **Check Agent Status in Database:**

```bash
python3 << 'EOF'
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute("SELECT name, status, file_path FROM agent_configs ORDER BY status DESC")
print("Agent Status:")
print("-" * 60)
for row in cursor.fetchall():
    status_icon = "✅" if row[1] == "deployed" else "⚪"
    print(f"{status_icon} {row[0]:30s} | {row[1]:12s} | {row[2] or 'No path'}")
EOF
```

### **Check Phone Mappings:**

```bash
python3 << 'EOF'
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute("""
    SELECT pm.phone_number, ac.name
    FROM phone_mappings pm
    JOIN agent_configs ac ON pm.agent_id = ac.id
    ORDER BY ac.name
""")
print("Phone Number Routing:")
print("-" * 60)
for row in cursor.fetchall():
    print(f"{row[0]:20s} → {row[1]}")
EOF
```

---

## 🚀 **Scaling to Many Agents**

### **Current Limits:**

- **Database:** SQLite (suitable for 10-100 agents)
- **Processes:** One Python process per deployed agent
- **LiveKit:** Unlimited agent workers
- **Memory:** ~150MB per agent process
- **CPU:** ~1-5% per idle agent

### **Recommendations:**

**1-5 agents:** Current setup is perfect

**5-20 agents:** Consider:
- Migrate to PostgreSQL
- Add process monitoring (supervisord)
- Implement health checks

**20+ agents:** Consider:
- Container orchestration (Docker/Kubernetes)
- Distributed deployment
- Load balancing
- Centralized logging

---

## 🔍 **Troubleshooting Commands**

### **List All Agents:**
```bash
python3 -c "import sqlite3; conn = sqlite3.connect('/opt/livekit1/voice_agents.db'); cursor = conn.cursor(); cursor.execute('SELECT name, status FROM agent_configs'); [print(f'{r[0]}: {r[1]}') for r in cursor.fetchall()]"
```

### **Find Agent by Phone Number:**
```bash
PHONE="+17678183742"
python3 << EOF
import sqlite3
conn = sqlite3.connect('/opt/livekit1/voice_agents.db')
cursor = conn.cursor()
cursor.execute("""
    SELECT ac.name, ac.status 
    FROM phone_mappings pm 
    JOIN agent_configs ac ON pm.agent_id = ac.id 
    WHERE pm.phone_number = ?
""", ('$PHONE',))
print(cursor.fetchone())
EOF
```

### **Check What Config Agent Will Load:**
```bash
cd /opt/livekit1/agents/sales_agent
python3 -c "from db_config import *; print(f'Agent: {AGENT_NAME}'); print(f'Instructions: {INSTRUCTIONS[:100]}...')"
```

---

## 📚 **Related Documentation**

- `AGENT_CONFIG_FROM_DATABASE.md` - How agents load config
- `AUTO_RESTART_FEATURE.md` - Auto-restart on edit
- `AGENT_CONFIGURATION_OPTIONS.md` - All available options

---

**Last Updated:** October 21, 2025
**Version:** 1.0

🎉 **Your multi-agent system is ready for production!** 🎉
