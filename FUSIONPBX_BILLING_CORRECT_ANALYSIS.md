# FusionPBX Billing - CORRECT Analysis

## Date: 2025-11-18
## Correction: FusionPBX IS the Billing Platform

---

## ❌ Previous Misunderstanding

I incorrectly said:
- "Each extension bills separately"
- "No consolidated billing in FusionPBX"
- "Track billing on ai.epic.dm side"

## ✅ CORRECT Understanding

**FusionPBX IS the billing platform for FreeSWITCH!**

---

## 🎯 How FusionPBX Billing Actually Works

### The Billing Flow (Based on Your Table)

| Step | What Happens | Database Table | Key Field |
|------|--------------|----------------|-----------|
| 1 | API creates user | `v_users` | `user_uuid` (billing account) |
| 2 | Extension created | `v_extensions` | `accountcode` = user_uuid |
| 3 | DID assigned | `v_destinations` | Routes to extension |
| 4 | FreeSWITCH config | XML files | SIP auth enabled |
| 5 | Calls logged | `v_xml_cdr` | `accountcode` field |
| 6 | **Billing calculated** | SQL on CDRs | Group by `accountcode` |

### The Critical Field: `accountcode`

**This is the billing consolidation key!**

```sql
-- v_extensions table
CREATE TABLE v_extensions (
    extension_uuid UUID PRIMARY KEY,
    extension VARCHAR(10),          -- "2015", "3020", etc.
    accountcode VARCHAR(255),       -- ← THIS LINKS TO BILLING ACCOUNT!
    ...
);

-- v_xml_cdr table (call detail records)
CREATE TABLE v_xml_cdr (
    uuid UUID PRIMARY KEY,
    accountcode VARCHAR(255),       -- ← SAME accountcode as extension
    billsec INTEGER,                -- Billable seconds
    caller_id_number VARCHAR(20),
    destination_number VARCHAR(20),
    start_stamp TIMESTAMP,
    ...
);
```

---

## 🔑 The Key Insight: `accountcode` = User Account

When the API creates a user:

```
Step 1: Create user in v_users
→ Generates user_uuid: "550e8400-e29b-41d4-a716-446655440000"

Step 2: Create extension
→ extension: "2015"
→ accountcode: "550e8400-e29b-41d4-a716-446655440000"  ← LINKS TO USER!

Step 3: Create another extension for SAME user
→ extension: "3020"
→ accountcode: "550e8400-e29b-41d4-a716-446655440000"  ← SAME accountcode!

Step 4: Calls are made
→ Extension 2015 makes call → CDR: accountcode = "550e8400..."
→ Extension 3020 makes call → CDR: accountcode = "550e8400..."

Step 5: Billing calculation
SELECT accountcode, SUM(billsec), SUM(cost)
FROM v_xml_cdr
WHERE accountcode = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY accountcode;

→ All calls from BOTH extensions are consolidated!
```

---

## 🎯 What's Actually Happening

### Current API Behavior

When we call `/api/rocketchat/users/sync`:

```json
POST https://billing.call.epic.dm/api/rocketchat/users/sync
{
    "rocketchat_user_id": "user_abc_123",
    "email": "giraud.eric@gmail.com",
    "name": "Giraud Eric",
    "username": "giraud.eric"
}
```

**What the Laravel backend does**:

```php
// Step 1: Find or create user account
$user = User::firstOrCreate(
    ['email' => $request->email],
    [
        'user_uuid' => Uuid::generate(),  // Billing account ID
        'username' => $request->username,
        'name' => $request->name
    ]
);

// Step 2: Create extension linked to user
$extension = Extension::create([
    'extension' => $this->getNextExtension(),  // e.g., "2015"
    'accountcode' => $user->user_uuid,         // ← LINKS TO USER!
    'password' => Hash::make($sip_password),
    // ... other fields
]);

// Step 3: Assign DID
$did = DID::assignToExtension($extension->extension_uuid);

// Step 4: Return credentials
return response()->json([
    'success' => true,
    'extension' => $extension->extension,
    'accountcode' => $user->user_uuid,  // ← SHOULD RETURN THIS!
    // ... other fields
]);
```

---

## ❌ The Problem: Missing `accountcode` in Response

### What's Returned Now:

```json
{
    "success": true,
    "extension": "2015",
    "sip_password": "...",
    "did_number": "17678189037",
    // ... other fields
}
```

### What SHOULD Be Returned:

```json
{
    "success": true,
    "extension": "2015",
    "accountcode": "550e8400-e29b-41d4-a716-446655440000",  // ← MISSING!
    "user_uuid": "550e8400-e29b-41d4-a716-446655440000",    // ← MISSING!
    "sip_password": "...",
    "did_number": "17678189037",
    // ... other fields
}
```

---

## 🔍 Why This Matters for Consolidated Billing

### Scenario: User with Multiple Agents

```
User: giraud.eric@gmail.com
└─ user_uuid: "550e8400-e29b-41d4-a716-446655440000" (billing account)

Agent 1: Customer Support
├─ Extension: "3021"
├─ accountcode: "550e8400-e29b-41d4-a716-446655440000"
└─ Makes 50 calls → CDRs with this accountcode

Agent 2: Sales
├─ Extension: "3020"
├─ accountcode: "550e8400-e29b-41d4-a716-446655440000"  ← SAME!
└─ Makes 30 calls → CDRs with this accountcode

Agent 3: Main Line
├─ Extension: "2015"
├─ accountcode: "550e8400-e29b-41d4-a716-446655440000"  ← SAME!
└─ Makes 20 calls → CDRs with this accountcode
```

**Billing Query**:
```sql
SELECT
    accountcode,
    COUNT(*) as total_calls,
    SUM(billsec) as total_seconds,
    SUM(cost) as total_cost
FROM v_xml_cdr
WHERE accountcode = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY accountcode;

Result:
accountcode: 550e8400-e29b-41d4-a716-446655440000
total_calls: 100
total_seconds: 6000
total_cost: $10.00
```

**All 3 agents billed to ONE account!** ✅

---

## 🚨 Current Issue

### The Problem in Our Integration

**What we're storing**:
```sql
-- ai.epic.dm database
users.fusionpbx_api_key = "2015"  // ❌ Extension number (wrong!)
users.fusionpbx_user_uuid = NULL   // ❌ Should be user_uuid/accountcode!
```

**What we SHOULD be storing**:
```sql
users.fusionpbx_api_key = "550e8400-e29b-41d4-a716-446655440000"  // ✅ accountcode
users.fusionpbx_user_uuid = "550e8400-e29b-41d4-a716-446655440000" // ✅ user_uuid
```

### Why It Matters

**Without the correct `accountcode`**:
- ❌ Can't query consolidated billing for user
- ❌ Can't link multiple agents to same billing account
- ❌ Each extension appears as separate account
- ❌ No way to generate consolidated invoices

**With the correct `accountcode`**:
- ✅ All agents for one user have same accountcode
- ✅ Can query FusionPBX CDRs for total usage
- ✅ Consolidated billing works automatically
- ✅ Can generate single invoice per user

---

## 🛠️ The Fix Required

### Two-Part Fix

### Part 1: Modify Laravel API to Return `accountcode`

**File**: (On billing.call.epic.dm) `app/Http/Controllers/RocketChatController.php`

**Current code** (approximate):
```php
public function syncUser(Request $request) {
    // ... create/find user and extension ...

    return response()->json([
        'success' => true,
        'extension' => $extension->extension,
        'sip_password' => $sip_password,
        // ... other fields
    ]);
}
```

**Modified code**:
```php
public function syncUser(Request $request) {
    // ... create/find user and extension ...

    return response()->json([
        'success' => true,
        'extension' => $extension->extension,
        'accountcode' => $user->user_uuid,        // ← ADD THIS
        'user_uuid' => $user->user_uuid,          // ← ADD THIS
        'sip_password' => $sip_password,
        // ... other fields
    ]);
}
```

### Part 2: Update ai.epic.dm to Store `accountcode`

**File**: `/opt/livekit1/backend/fusionpbx_api_client.py`

**Current code** (line 213-214):
```python
user_api_key=data.get('extension'),  # ❌ Storing extension
user_uuid=data.get('extension')       # ❌ Storing extension
```

**Modified code**:
```python
user_api_key=data.get('accountcode'),  # ✅ Store accountcode
user_uuid=data.get('user_uuid')        # ✅ Store user_uuid
```

**File**: `/opt/livekit1/user_dashboard.py`

**Current code** (line 804-812):
```python
if user_api_key and not user.fusionpbx_api_key:
    user.fusionpbx_api_key = user_api_key  # Stores extension (wrong)

if user_uuid and not user.fusionpbx_user_uuid:
    user.fusionpbx_user_uuid = user_uuid  # Stores extension (wrong)
```

**This will now store the correct UUID after API is fixed!**

---

## 🔍 How to Verify Consolidated Billing

### After Fix is Applied

**Test Scenario**:

1. Create user `giraud.eric@gmail.com`
2. Create 3 agents for this user
3. Check database:

```sql
-- On billing.call.epic.dm (FusionPBX database)
SELECT
    u.user_uuid,
    u.email,
    e.extension,
    e.accountcode
FROM v_users u
JOIN v_extensions e ON e.accountcode = u.user_uuid
WHERE u.email = 'giraud.eric@gmail.com';

Expected:
user_uuid: 550e8400-e29b-41d4-a716-446655440000
email: giraud.eric@gmail.com
extensions:
  - 2015 (accountcode: 550e8400-e29b-41d4-a716-446655440000)
  - 3020 (accountcode: 550e8400-e29b-41d4-a716-446655440000)
  - 3021 (accountcode: 550e8400-e29b-41d4-a716-446655440000)

✅ All extensions have SAME accountcode!
```

**Check CDRs**:
```sql
-- Query consolidated billing
SELECT
    accountcode,
    COUNT(*) as calls,
    SUM(billsec) as seconds,
    SUM(billsec * rate_per_second) as cost
FROM v_xml_cdr
WHERE accountcode = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY accountcode;

✅ All calls from all 3 extensions consolidated!
```

**Check ai.epic.dm database**:
```sql
SELECT
    email,
    fusionpbx_api_key,
    fusionpbx_user_uuid
FROM users
WHERE email = 'giraud.eric@gmail.com';

Expected:
fusionpbx_api_key: 550e8400-e29b-41d4-a716-446655440000
fusionpbx_user_uuid: 550e8400-e29b-41d4-a716-446655440000

✅ Correctly stores billing account ID!
```

---

## 📊 Correct Billing Architecture

```
┌────────────────────────────────────────────────────────┐
│              FusionPBX (Billing Platform)              │
│                                                        │
│  v_users (Billing Accounts)                           │
│  ┌──────────────────────────────────────────────────┐ │
│  │ user_uuid: 550e8400-e29b-41d4-a716-446655440000  │ │
│  │ email: giraud.eric@gmail.com                     │ │
│  │ ← MASTER BILLING ACCOUNT                         │ │
│  └──────────────────────────────────────────────────┘ │
│           │                                            │
│           ├─ v_extensions (SIP Extensions)            │
│           │  ┌────────────────────────────────────┐   │
│           │  │ Extension: 2015                    │   │
│           │  │ accountcode: 550e8400... ← LINKS!  │   │
│           │  └────────────────────────────────────┘   │
│           │                                            │
│           │  ┌────────────────────────────────────┐   │
│           │  │ Extension: 3020                    │   │
│           │  │ accountcode: 550e8400... ← LINKS!  │   │
│           │  └────────────────────────────────────┘   │
│           │                                            │
│           │  ┌────────────────────────────────────┐   │
│           │  │ Extension: 3021                    │   │
│           │  │ accountcode: 550e8400... ← LINKS!  │   │
│           │  └────────────────────────────────────┘   │
│           │                                            │
│           └─ v_xml_cdr (Call Records)                 │
│              ┌────────────────────────────────────┐   │
│              │ Call from ext 2015                 │   │
│              │ accountcode: 550e8400...           │   │
│              │ cost: $2.00                        │   │
│              └────────────────────────────────────┘   │
│                                                        │
│              ┌────────────────────────────────────┐   │
│              │ Call from ext 3020                 │   │
│              │ accountcode: 550e8400...           │   │
│              │ cost: $3.00                        │   │
│              └────────────────────────────────────┘   │
│                                                        │
│              ┌────────────────────────────────────┐   │
│              │ Call from ext 3021                 │   │
│              │ accountcode: 550e8400...           │   │
│              │ cost: $5.00                        │   │
│              └────────────────────────────────────┘   │
│                                                        │
│  Billing Query:                                       │
│  SELECT SUM(cost) FROM v_xml_cdr                      │
│  WHERE accountcode = '550e8400...'                    │
│  → Result: $10.00 (consolidated!)                     │
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary

### ✅ CORRECT Understanding

1. **FusionPBX IS the billing platform** - handles all CDRs and cost calculation
2. **`accountcode` is the billing consolidation key** - all extensions with same accountcode are billed together
3. **One user can have multiple extensions** - all linked via `accountcode` field
4. **Billing IS consolidated** - SQL query groups by `accountcode`

### ❌ What Was Wrong

1. API doesn't return `accountcode`/`user_uuid` currently
2. We're storing extension number instead of billing account ID
3. Can't link multiple agents to same billing account without this

### 🛠️ Required Fix

1. **Server-side** (billing.call.epic.dm): Modify Laravel API to return `accountcode` and `user_uuid`
2. **Client-side** (ai.epic.dm): Code already correct - just needs API to return the right fields!

### 📋 Next Step

Access billing.call.epic.dm server and add `accountcode` to API response!
