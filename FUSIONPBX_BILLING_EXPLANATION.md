# FusionPBX Billing Structure - Explained

## Date: 2025-11-18
## Your Question: "What account is being billed? Where is the giraud.eric@gmail.com user?"

---

## Current Situation

### What You See in FusionPBX GUI

You're seeing multiple **extensions** (2001, 2002, 2003... 2015, etc.), but you're asking:
- "Which account is being billed?"
- "Where is the giraud.eric@gmail.com user?"

---

## The Answer

### In FusionPBX, Extensions ARE Users

FusionPBX doesn't work like ai.epic.dm where you have one user (giraud.eric@gmail.com) with multiple agents.

**In FusionPBX**:
- Each **extension** IS a separate user account
- Extension 2015 = User "Giraud Eric" with email giraud.eric@gmail.com
- Extension 3021 = Another agent (not linked to 2015)
- Extension 3020 = Another agent (not linked to 2015)

### Where is giraud.eric@gmail.com in FusionPBX?

**Answer**: Extension 2015

To find it in FusionPBX GUI:
1. Go to **Accounts → Extensions**
2. Search for **2015**
3. Click on extension 2015
4. You'll see:
   - **Username**: giraud.eric (or similar)
   - **Email**: giraud.eric@gmail.com
   - **Caller ID Name**: Giraud Eric
   - **DID**: 17678189037

---

## Billing Structure

### How FusionPBX Bills

Each extension is billed **independently**:

```
Extension 2001 → $X.XX in charges
Extension 2002 → $Y.YY in charges
Extension 2003 → $Z.ZZ in charges
...
Extension 2015 (giraud.eric@gmail.com) → $A.AA in charges
Extension 3020 → $B.BB in charges
Extension 3021 → $C.CC in charges
```

**There is NO consolidated billing by email in FusionPBX by default.**

---

## The Problem

### What You Expected (Consolidated Billing)

```
User: giraud.eric@gmail.com
├── Agent 1 (Extension 3021)
├── Agent 2 (Extension 3020)
├── Agent 3 (Extension 2015)
└── Total Bill: Sum of all agents
```

### What Actually Happens (Separate Billing)

```
Extension 3021 → Billed separately
Extension 3020 → Billed separately
Extension 2015 → Billed separately
```

---

## Why This Happened

### The RocketChat Sync Endpoint

When we call `/api/rocketchat/users/sync`, it:
1. Creates a **new extension** for each call
2. Each extension is a **separate user** in FusionPBX
3. No linking between extensions for the same email

**Example**:
```bash
# Call 1: Creates Extension 2015
POST /api/rocketchat/users/sync
{"email": "giraud.eric@gmail.com", "name": "Agent 1"}
→ Extension 2015 created

# Call 2: Creates Extension 2016 (NOT linked to 2015!)
POST /api/rocketchat/users/sync
{"email": "giraud.eric@gmail.com", "name": "Agent 2"}
→ Extension 2016 created

# Call 3: Creates Extension 2017 (NOT linked to 2015 or 2016!)
POST /api/rocketchat/users/sync
{"email": "giraud.eric@gmail.com", "name": "Agent 3"}
→ Extension 2017 created
```

**Result**: 3 separate extensions, 3 separate bills, NO consolidation

---

## The Real Issue

### You Need Consolidated Billing

For your use case (multiple agents per user), you need:
1. **One master account** for giraud.eric@gmail.com
2. **Multiple extensions** under that account
3. **Consolidated billing** - all extensions billed to the master account

### FusionPBX Doesn't Do This By Default

FusionPBX is designed for multi-tenant PBX hosting where:
- Each extension = one user
- Each user pays for their own usage
- No "family plans" or consolidated billing

---

## Solutions

### Option 1: FusionPBX Account/Sub-Account Structure

FusionPBX supports a **domain → account → extensions** hierarchy:

```
Domain: billing.call.epic.dm
└── Account: giraud.eric@gmail.com (master account)
    ├── Extension 2015 (main extension)
    ├── Extension 2016 (sub-account)
    ├── Extension 2017 (sub-account)
    └── Extension 2018 (sub-account)
```

**Billing**: All billed to the master account (giraud.eric@gmail.com)

**Requires**:
- Modify FusionPBX configuration
- Set up account hierarchy
- Configure billing rules

### Option 2: Use v_ai_users Table (Custom)

The `/api/ai-agents/provision` endpoint (the broken one) was TRYING to use a custom `v_ai_users` table:

```sql
-- Custom table structure
CREATE TABLE v_ai_users (
    user_uuid UUID PRIMARY KEY,
    email VARCHAR(255),
    api_key VARCHAR(255),
    balance DECIMAL
);

-- Link extensions to users
CREATE TABLE v_ai_agents (
    agent_uuid UUID PRIMARY KEY,
    user_uuid UUID REFERENCES v_ai_users(user_uuid),
    extension_uuid UUID REFERENCES v_extensions(extension_uuid),
    ...
);
```

**How it would work**:
1. giraud.eric@gmail.com → v_ai_users (user_uuid: xxx-xxx-xxx)
2. Agent 1 → v_ai_agents (links to user_uuid xxx-xxx-xxx, extension 3021)
3. Agent 2 → v_ai_agents (links to user_uuid xxx-xxx-xxx, extension 3020)
4. Billing: Query all agents for user_uuid → Sum charges

**Status**: This table EXISTS on billing.call.epic.dm but the API endpoint is incomplete

### Option 3: Track Billing on ai.epic.dm Side

Don't rely on FusionPBX for consolidated billing. Instead:

1. Each extension is independent in FusionPBX
2. ai.epic.dm tracks which extensions belong to which user:

```sql
-- ai.epic.dm database
SELECT ac.sip_username, ac.did_number, u.email
FROM agent_configs ac
JOIN users u ON ac."userId" = u.id
WHERE u.email = 'giraud.eric@gmail.com';

-- Results:
Extension 2015 → giraud.eric@gmail.com
Extension 3020 → giraud.eric@gmail.com
Extension 3021 → giraud.eric@gmail.com
```

3. Pull CDR (call detail records) from FusionPBX for each extension
4. Sum charges on ai.epic.dm side
5. Bill user via ai.epic.dm billing system

---

## Current Status

### What's Stored in Database

```sql
SELECT email, fusionpbx_api_key, fusionpbx_user_uuid
FROM users
WHERE email = 'giraud.eric@gmail.com';

email: giraud.eric@gmail.com
fusionpbx_api_key: ak_d9b73cd80a8082ca8cb8e1bc125d8603  ← OLD broken API key
fusionpbx_user_uuid: NULL                                ← Empty
```

### What Extensions Exist

```sql
SELECT id, name, sip_username, did_number
FROM agent_configs
WHERE "userId" = (SELECT id FROM users WHERE email = 'giraud.eric@gmail.com');

1. Customer Support Agent  → Extension 3021, DID 17678189026
2. eeeeeeeeeeeeeee         → Extension 3021, DID 17678189026  (duplicate!)
3. EPIC Sales Agent        → Extension 3020, DID 17678189025
4. Survey & Feedback Agent → No extension
5. Appointment Booking     → No extension
```

### What's in FusionPBX

- Extension 2015 → giraud.eric@gmail.com (created by our test call)
- Extension 3020 → (EPIC Sales Agent - but not linked to giraud.eric)
- Extension 3021 → (Customer Support - but not linked to giraud.eric)
- Extensions 2001-2014 → Other tests/agents

**Problem**: No link between extensions and giraud.eric@gmail.com user account!

---

## Recommended Solution

### Use Option 3: Track on ai.epic.dm, Bill Independently on FusionPBX

**Why**:
- ✅ Works with existing FusionPBX setup (no server changes)
- ✅ ai.epic.dm already tracks user → agents relationship
- ✅ Can pull CDRs from FusionPBX via API
- ✅ Implement billing consolidation on ai.epic.dm side

**How**:

1. **Keep using RocketChat sync endpoint** (it works!)

2. **Track extensions per user** in ai.epic.dm database:
   ```sql
   -- Already have this!
   SELECT sip_username FROM agent_configs WHERE "userId" = 'xxx';
   ```

3. **Pull CDRs from FusionPBX** for each extension:
   ```python
   # For user giraud.eric@gmail.com
   extensions = ['2015', '3020', '3021']

   for ext in extensions:
       cdrs = fusionpbx_api.get_cdrs(extension=ext, start_date='2025-11-01')
       total_cost += sum(cdr['cost'] for cdr in cdrs)

   # Bill user total_cost
   ```

4. **Display consolidated view** in ai.epic.dm dashboard:
   ```
   User: giraud.eric@gmail.com
   ├── Agent 1 (Ext 2015): 50 calls, $5.00
   ├── Agent 2 (Ext 3020): 30 calls, $3.00
   ├── Agent 3 (Ext 3021): 20 calls, $2.00
   └── Total: 100 calls, $10.00
   ```

---

## What to Do Right Now

### Step 1: Understand Current State

In FusionPBX GUI:
- Extension 2015 = giraud.eric@gmail.com
- Extensions 3020, 3021 = Old agents (not properly linked)

### Step 2: Decide on Billing Approach

**Question for you**: How do you want to handle billing?

**A. Simple** (Recommended):
- Each extension bills independently in FusionPBX
- ai.epic.dm tracks which extensions belong to which user
- Pull CDRs from FusionPBX and consolidate on ai.epic.dm side

**B. Complex**:
- Modify FusionPBX to support account hierarchy
- Link all extensions to master account
- FusionPBX handles consolidated billing

### Step 3: Clean Up Database

The old `fusionpbx_api_key` value (`ak_d9b73cd80a808...`) is wrong. We should:

1. Keep it as is (doesn't hurt anything)
2. OR update to extension 2015 (but this is just one extension, not a master account ID)
3. OR clear it and use a different field

---

## Summary

**Your Question**: "What account is being billed? Where is giraud.eric@gmail.com?"

**Answer**:
- giraud.eric@gmail.com = Extension 2015 in FusionPBX
- Each extension (2015, 3020, 3021) is billed SEPARATELY
- There is NO consolidated billing in FusionPBX by default
- You need to track on ai.epic.dm side and pull CDRs to consolidate

**Next Steps**:
1. Decide if you want FusionPBX-side consolidation (complex) or ai.epic.dm-side (simple)
2. Clean up old agents with duplicate/missing extensions
3. Implement CDR pulling and billing consolidation on ai.epic.dm
