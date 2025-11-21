# 🤖 Agent-Centric Funnel Architecture

## Overview

Funnels use a **agent-centric approach** where all call properties come from the AI Agent, not the funnel or individual nodes. This makes configuration simpler and more maintainable.

---

## 🎯 Core Concept

### ❌ Old Way (Complex):
```
Funnel
 └─ CALL Node
     ├─ Choose Agent
     ├─ Choose Phone Number
     ├─ Choose Voice
     └─ Choose Language
```
**Problem**: Configuration scattered across multiple places

### ✅ New Way (Simple):
```
Funnel
 └─ CALL Node
     └─ Choose Agent → Agent brings EVERYTHING:
         ├─ Phone Number: +17678189267
         ├─ Voice: alloy
         ├─ Language: en-US
         ├─ Instructions: "You are a sales rep..."
         ├─ LLM Model: gpt-4o-mini
         └─ Temperature: 0.7
```
**Benefit**: One choice configures everything!

---

## 🏗️ How It Works

### 1. Create/Configure AI Agent

**In Dashboard or Marketplace**:
```
Agent: "Sales Bot - John"
├─ Name: Sales Bot John
├─ Voice: alloy
├─ Language: en-US
├─ Assigned Phone: +17678189267 (from phone_mappings table)
├─ Instructions: "You are a friendly sales representative..."
├─ LLM: gpt-4o-mini
├─ Temperature: 0.7
└─ Tools: [get_availability, book_appointment]
```

**Database Tables**:
```sql
-- Agent configuration
agent_configs:
  id: "7b885e98-8cfe-4d8a-947c-9eb24ad678e0"
  name: "Sales Bot John"
  voice: "alloy"
  instructions: "You are a friendly sales rep..."
  llmModel: "gpt-4o-mini"

-- Agent's phone number assignment
phone_mappings:
  agentConfigId: "7b885e98-8cfe-4d8a-947c-9eb24ad678e0"
  phoneNumber: "+17678189267"
  isActive: true
```

---

### 2. Create Funnel with CALL Node

**Simple Configuration**:
```python
# Create CALL node - just specify the agent!
{
    "node_type": "call",
    "label": "Sales Call",
    "config": {
        "agent_id": "7b885e98-8cfe-4d8a-947c-9eb24ad678e0"
        # That's it! Agent brings all other properties
    }
}
```

**NO need to specify**:
- ❌ Phone number (uses agent's assigned number)
- ❌ Voice (uses agent's voice setting)
- ❌ Language (uses agent's language)
- ❌ Instructions (uses agent's personality)

---

### 3. When Funnel Executes

**Automatic Property Resolution**:
```python
# System looks up agent
agent = db.query(AgentConfig).filter_by(id=agent_id).first()

# Gets phone number from phone_mappings
phone_mapping = db.query(PhoneMapping).filter_by(
    agentConfigId=agent_id,
    isActive=True
).first()

# Initiates call with ALL agent properties
call_service.initiate_call(
    agent_id=agent.id,
    to_number=contact.phone,
    from_number=phone_mapping.phoneNumber  # ← Agent's number!
)
```

**What the recipient sees**:
```
Incoming Call
📞 From: +17678189267 (Agent's assigned number)
🤖 Voice: Alloy (Agent's voice)
💬 "Hi, this is John from Epic Voice AI..." (Agent's instructions)
```

---

## 🎨 Multiple Agents, Different Use Cases

### Scenario: Multi-Language Support

**Agent 1: English Sales Bot**
```
Name: Sales Bot - English
Phone: +17678189267
Language: en-US
Voice: alloy
Instructions: "You are a friendly English-speaking sales rep..."
```

**Agent 2: Spanish Sales Bot**
```
Name: Sales Bot - Español
Phone: +17678189654
Language: es-ES
Voice: nova
Instructions: "Eres un representante de ventas amigable..."
```

**Funnel**:
```
Lead enters funnel
    ↓
Check lead.language
    ↓
┌──────────────┬──────────────┐
│ If English   │ If Spanish   │
│ CALL Node    │ CALL Node    │
│ Agent: EN    │ Agent: ES    │
└──────────────┴──────────────┘
```

**Benefits**:
- ✅ Different caller IDs (English line vs Spanish line)
- ✅ Different voices (alloy vs nova)
- ✅ Different personalities
- ✅ All configured once, reused everywhere

---

## 🔧 Advanced: Override When Needed

### Priority Chain (Fallback Order)

```python
from_number = (
    node.config.get("from_number") or      # 1. Node override (rare)
    agent.phone_mapping.phoneNumber or      # 2. Agent's number (default)
    "+17678183366"                          # 3. System fallback
)
```

**When to override at node level**:
- Special campaign with dedicated line
- Testing with different caller ID
- Compliance requirement for specific call type

**Example Override**:
```python
{
    "node_type": "call",
    "config": {
        "agent_id": "7b885e98-8cfe-4d8a-947c-9eb24ad678e0",
        "from_number": "+17678189999"  # Override for this call only
    }
}
```

---

## 📦 Marketplace Integration

### Pre-configured Agent Templates

**Sales Agent Template**:
```
Name: "Sales Professional"
Voice: alloy
Language: en-US
Instructions: Professional sales script...
Suggested Phone: [User assigns from their pool]
Price: $29/month
```

**User Flow**:
1. Browse marketplace
2. Click "Add Sales Professional Agent"
3. System prompts: "Assign a phone number to this agent"
4. User selects from their phone_number_pool
5. Agent ready to use in funnels!

**Benefits**:
- ✅ Pre-written instructions/personality
- ✅ Optimized voice and model settings
- ✅ User just assigns phone number
- ✅ Instant funnel integration

---

## 🎯 Best Practices

### 1. **One Agent Per Purpose**
```
❌ Bad: Generic "Bot Agent" used for sales, support, surveys
✅ Good: Separate agents for each use case
    - Sales Bot (warm, persuasive)
    - Support Bot (patient, technical)
    - Survey Bot (neutral, efficient)
```

### 2. **Descriptive Agent Names**
```
❌ Bad: "Agent 1", "Test Bot"
✅ Good: "Sales Bot - John (English)", "Soporte - María (Español)"
```

### 3. **Assign Dedicated Phone Numbers**
```
✅ Sales agents → +1-XXX-SALES
✅ Support agents → +1-XXX-SUPPORT
✅ Survey agents → +1-XXX-SURVEY
```

**Why**: Recipients recognize the number and know what to expect

---

## 🔍 Current Implementation

### What's Implemented ✅

1. **Agent Property Lookup**
   - ✅ Phone number from `phone_mappings` table
   - ✅ Voice, language, instructions from `agent_configs`
   - ✅ Automatic fallback if no phone assigned

2. **Call Initiation**
   - ✅ Uses agent's phone number as caller ID
   - ✅ Creates room with agent_config_id in room name
   - ✅ Tracks call context for funnel

3. **Dynamic Routing**
   - ✅ Inbound calls route by phone number (DID)
   - ✅ Outbound calls route by agent_config_id in room name
   - ✅ Funnel calls route by agent_config_id in room name
   - ✅ Single tst0002 worker handles all call types

4. **Test Script**
   - ✅ Shows agent's assigned phone number
   - ✅ Prompts for test number to call
   - ✅ Clear display of what caller ID will show

### What's Next 🚧

1. **Frontend UI** (Not yet implemented)
   - Agent selector dropdown in funnel builder
   - Preview of agent properties when selected
   - Marketplace integration for templates

2. **Agent Validation** (Recommended)
   - Warn if agent has no phone number assigned
   - Suggest phone numbers from available pool
   - Prevent funnel activation if agent incomplete

3. **Analytics** (Future)
   - Performance per agent
   - Which agents convert best
   - A/B testing different agent personalities

---

## 📝 Example: Complete Workflow

### Step 1: Create Agent (Dashboard/Marketplace)
```
User clicks: "Create AI Agent"
    ↓
Name: Sales Bot - John
Voice: alloy
Language: en-US
Assign Phone: +17678189267 (from dropdown)
Instructions: "You are a sales rep..."
    ↓
Save → Agent ready!
```

### Step 2: Create Funnel
```
User clicks: "Create Funnel"
    ↓
Add CALL Node
    ↓
Select Agent: "Sales Bot - John"
    (System shows: "Will call from +17678189267")
    ↓
Connect to EMAIL Node (follow-up)
    ↓
Activate Funnel
```

### Step 3: Execute Funnel
```
Lead enters funnel (phone: +15551234567)
    ↓
CALL Node executes
    ↓
System:
  - Looks up agent "Sales Bot - John"
  - Gets phone number: +17678189267
  - Gets voice: alloy
  - Gets instructions: "You are a sales rep..."
    ↓
LiveKit initiates call
  - FROM: +17678189267 (John's number)
  - TO: +15551234567 (Lead's number)
  - VOICE: alloy (John's voice)
    ↓
Lead answers, talks to John
    ↓
Call ends → Email sent
```

---

## 🎉 Summary

**Agent-Centric = Simpler Configuration**

Instead of configuring every detail on every node:
1. Configure agent ONCE (voice, number, personality)
2. Reuse agent in ANY funnel
3. Consistent caller experience
4. Easy to update (change agent, all funnels updated)

**Think of agents as employees** - each has their own:
- Phone extension (number)
- Voice/personality
- Job description (instructions)
- Skills (tools/functions)

When building a funnel, you're just **assigning which employee makes the call**!
