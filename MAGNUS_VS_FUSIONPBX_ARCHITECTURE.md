# Magnus vs FusionPBX Architecture - Complete Explanation

## Executive Summary

**IMPORTANT**: Magnus and FusionPBX serve **DIFFERENT purposes** in the system:

- **Magnus Billing**: Used for **PHONE NUMBER provisioning** (customer-facing DIDs)
- **FusionPBX**: Used for **AGENT SIP extensions** (internal agent communication)

## When You Create an Agent

### What Happens:
```
User creates agent in wizard
↓
Agent provisioned via FusionPBX
↓
FusionPBX creates:
  - SIP Extension (3001-3999)
  - Internal DID
  - SIP credentials for agent
↓
NO Magnus SIP user is created (this is expected!)
```

### Why No Magnus SIP User?

**Magnus is NOT used for agent creation.** Magnus is used when you **provision a phone number** that customers will call.

---

## Architecture Breakdown

### System 1: FusionPBX (Agent Extensions)

**Purpose**: Create SIP extensions for AI agents to connect to LiveKit

**When Used**: Every time an agent is created

**What It Creates**:
```
Agent: "Customer Support Agent"
├── SIP Extension: 3021
├── SIP Domain: billing.call.epic.dm
├── SIP Password: (auto-generated)
├── Internal DID: 17678189026
└── Purpose: Agent uses this to connect to LiveKit
```

**Example**:
- Agent "Customer Support Agent" gets extension `3021`
- Agent uses `3021@billing.call.epic.dm` to register with LiveKit SIP
- This is INTERNAL - not customer-facing

---

### System 2: Magnus Billing (Phone Numbers)

**Purpose**: Provision customer-facing phone numbers with routing

**When Used**: When you click "Provision New Number" in the wizard

**What It Creates**:
```
Phone Number: +17678189426
├── Magnus DID: 17678189426
├── Magnus SIP Account: +17678189426
├── SIP Password: (auto-generated)
├── Inbound Route: DID → LiveKit
├── Outbound Trunk: LiveKit → PSTN
└── Purpose: Customers call this number
```

**Example**:
- User provisions +17678189426
- Magnus creates SIP account for THIS PHONE NUMBER
- DID routes to LiveKit via SIP
- This is CUSTOMER-FACING

---

## Complete Flow Diagram

### Flow 1: Agent Creation

```
┌─────────────────────────┐
│ User Creates Agent      │
│ "Customer Support"      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ FusionPBX Provisioning  │
│ POST /api/ai-agents/    │
│       provision         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ FusionPBX Creates:      │
│ • Extension: 3021       │
│ • DID: 17678189026      │
│ • SIP creds             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Database Updated:       │
│ agent_configs table     │
│ • sip_username: 3021    │
│ • did_number: ...026    │
└─────────────────────────┘

❌ NO Magnus SIP user created
✅ This is CORRECT behavior
```

### Flow 2: Phone Number Provisioning

```
┌─────────────────────────┐
│ User Provisions Number  │
│ "Provision +1..."       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Magnus Provisioning     │
│ provision_number_from_  │
│       magnus()          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Magnus Creates:         │
│ • DID: +17678189426     │
│ • SIP Account           │
│ • CallerID: 17678...    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ LiveKit Integration     │
│ • Inbound Trunk         │
│ • Outbound Trunk        │
│ • Dispatch Rules        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Database Updated:       │
│ phone_number_pool       │
│ • magnus_sip_username   │
│ • magnus_did_id         │
└─────────────────────────┘

✅ Magnus SIP user created
✅ This is CORRECT behavior
```

### Flow 3: Assigning Phone to Agent

```
┌─────────────────────────┐
│ Assign Phone to Agent   │
│ +17678189426 → Agent    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create Phone Mapping    │
│ phone_mappings table    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│ Create Dispatch Rule    │
│ Route calls to agent    │
└─────────────────────────┘

Agent now receives calls at +17678189426
Agent can make calls FROM +17678189426
```

---

## What You're Seeing

### When You Create an Agent:

**Expected Behavior**:
- ✅ FusionPBX extension created (3021)
- ✅ Agent SIP credentials created
- ✅ Agent can connect to LiveKit
- ❌ NO Magnus SIP user (correct - not needed yet!)

### When You Provision a Phone Number:

**Expected Behavior**:
- ✅ Magnus DID created (+17678189426)
- ✅ Magnus SIP account created for this number
- ✅ LiveKit trunks created (inbound + outbound)
- ✅ Routing configured

### When You Assign Phone to Agent:

**Expected Behavior**:
- ✅ Phone mapping created (links phone to agent)
- ✅ Dispatch rule created (routes inbound calls)
- ✅ Agent can now use this phone number

---

## The Confusion

### What You Expected:
"When I create an agent, Magnus should create a SIP user"

### What Actually Happens:
"When I create an agent, FusionPBX creates a SIP extension"

### Why:
- **Agents don't need Magnus SIP accounts**
- **Phone numbers need Magnus SIP accounts**
- Agents use FusionPBX extensions
- Phone numbers use Magnus DIDs

---

## Two Different SIP Accounts

### Agent SIP Account (FusionPBX)

```
Purpose: Agent connects to LiveKit
Username: 3021
Domain: billing.call.epic.dm
Usage: Internal communication
Created: Every agent creation
Provider: FusionPBX
```

### Phone SIP Account (Magnus)

```
Purpose: Route customer calls
Username: +17678189426
Domain: voice.epic.dm
Usage: Customer-facing
Created: When provisioning phone number
Provider: Magnus Billing
```

---

## When Magnus SIP Users ARE Created

Magnus SIP accounts are created in these scenarios:

### 1. Phone Number Provisioning
```
POST /api/user/phone-numbers/provision
→ Magnus creates SIP account for the phone number
```

### 2. Existing Phone Assignment
```
Assign +17678189426 to agent
→ Magnus SIP account already exists (from provisioning)
→ No new Magnus SIP account needed
```

---

## Summary Table

| Action | FusionPBX | Magnus | Result |
|--------|-----------|--------|--------|
| Create Agent | ✅ Extension created | ❌ No SIP user | Agent has extension 3021 |
| Provision Phone | ❌ Not involved | ✅ SIP user created | Phone +1767... has SIP account |
| Assign Phone to Agent | ❌ Not involved | ❌ No new SIP user | Mapping created, dispatch rule set |

---

## Verification Commands

### Check Agent (FusionPBX)
```sql
SELECT id, name, sip_username, sip_domain, did_number
FROM agent_configs
WHERE name = 'Customer Support Agent';
```

**Expected**:
- `sip_username`: 3021
- `sip_domain`: billing.call.epic.dm
- `did_number`: 17678189026

### Check Phone Numbers (Magnus)
```sql
SELECT "phoneNumber", magnus_sip_username, magnus_did_id, status
FROM phone_number_pool
WHERE "assignedToUserId" = '<user_id>';
```

**Expected**:
- If you provisioned numbers: rows with magnus_sip_username filled
- If you just created agent: no rows (no phone numbers provisioned yet)

---

## What You Should Do

### To Get a Complete Setup:

1. **Create Agent** (already done ✅)
   - Agent has FusionPBX extension
   - Agent can connect to LiveKit

2. **Provision Phone Number** (Step 4 in wizard)
   - Click "Provision New Number"
   - Magnus creates SIP account for the phone
   - LiveKit trunks are created

3. **Assign Phone to Agent** (Step 4 in wizard)
   - Select the provisioned number
   - Phone is mapped to agent
   - Dispatch rule routes calls to agent

### After All Steps:

**Agent has**:
- FusionPBX SIP extension (for LiveKit connection)
- Magnus phone number (for customer calls)
- Both systems working together

---

## Conclusion

**Your Observation**: "Magnus SIP user was not created when I created an agent"

**Explanation**: ✅ **This is CORRECT behavior!**

- Agents use **FusionPBX extensions**, not Magnus SIP accounts
- Magnus SIP accounts are created for **phone numbers**, not agents
- To get a Magnus SIP account, you need to **provision a phone number**

**Next Steps**:
1. Use the agent wizard Step 4 to provision a phone number
2. Magnus will create the SIP account for that phone
3. Assign the phone to your agent
4. Now your agent can receive and make calls using that Magnus phone number

---

## Architectural Reasoning

### Why Two Systems?

**FusionPBX** (Agent Extensions):
- Manages agent connectivity
- Provides SIP registration for agents
- Handles agent-to-LiveKit communication
- Internal, not customer-facing

**Magnus** (Phone Numbers):
- Manages customer-facing phone numbers
- Provides PSTN connectivity
- Handles billing and routing
- External, customer-facing

**Benefit**: Separation of concerns
- Agents can exist without phone numbers
- Phone numbers can be reassigned between agents
- Billing is separated from agent management
