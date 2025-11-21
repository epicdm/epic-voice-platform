# FusionPBX User UUID Fix - Implementation Plan

## Date: 2025-11-18
## Status: 🔴 BLOCKER - Users not visible in FusionPBX GUI

---

## Problem Statement

**Issue**: Users created via ai.epic.dm cannot be found in FusionPBX GUI at billing.call.epic.dm

**Root Cause**: The FusionPBX provisioning API at `https://billing.call.epic.dm/api/ai-agents/provision` is NOT returning `user_uuid` in the response.

**Evidence**:
```json
// Current API Response:
{
  "agent": {
    "agent_uuid": "...",
    "api_key": "ak_...",    ← Has this
    "user_uuid": ???         ← MISSING THIS
  }
}
```

**Impact**:
- ❌ No way to map ai.epic.dm users to FusionPBX users
- ❌ Cannot find users in FusionPBX GUI
- ❌ Cannot verify billing consolidation
- ❌ `fusionpbx_user_uuid` column remains NULL in database

---

## Research Findings

### FusionPBX Database Structure

Based on web research:
- **v_users** table stores user accounts
- **v_extensions** table stores SIP extensions
- **extension_users** table links users to extensions
- **v_user_settings** stores timezone/language
- **v_user_groups** stores permissions

### User Creation Required Fields

When creating a user in FusionPBX:
1. Insert into `v_users` table
2. Create entries in `v_user_settings` (timezone, language)
3. Add user to groups via `v_user_groups`
4. Link user to extension via `extension_users`

### FusionPBX API Behavior

The API at billing.call.epic.dm:
- ✅ Creates SIP extensions (v_extensions)
- ✅ Assigns DIDs (v_did_assignments)
- ✅ Returns api_key for billing
- ❓ Creates users in v_users? (unknown)
- ❌ Does NOT return user_uuid

---

## Investigation Steps

### Step 1: Locate Laravel API Code

**Server**: billing.call.epic.dm (NOT on current server ai.epic.dm)

**Find**:
- Laravel application directory
- Controller: `AiAgentController.php` or similar
- Route: `/api/ai-agents/provision`

**Commands to run on billing.call.epic.dm**:
```bash
# SSH to billing.call.epic.dm
ssh root@billing.call.epic.dm

# Find Laravel installation
find /var/www -name "artisan" -type f

# Find AI agent controller
find /var/www -name "*AiAgent*" -o -name "*ai-agent*"

# Check routes
grep -r "ai-agents/provision" /var/www/
```

### Step 2: Check Database on billing.call.epic.dm

**Connect to FusionPBX database**:
```bash
# On billing.call.epic.dm server
psql -U fusionpbx -d fusionpbx

# Or use PostgreSQL credentials
psql -U postgres -d fusionpbx
```

**Queries to run**:
```sql
-- Check if users are being created
SELECT user_uuid, username, user_email
FROM v_users
WHERE user_email LIKE '%epic%' OR user_email LIKE '%giraud%'
ORDER BY insert_date DESC
LIMIT 10;

-- Check AI agents table
SELECT * FROM v_ai_agents
WHERE user_email IN ('giraud.eric@gmail.com', 'debug@test.com')
LIMIT 5;

-- Check if v_ai_users table exists (for user mapping)
\dt v_ai_users

-- If exists, check for users
SELECT * FROM v_ai_users
WHERE email IN ('giraud.eric@gmail.com', 'debug@test.com');
```

### Step 3: Review Laravel Controller Code

**Find the provision endpoint**:
```bash
# On billing.call.epic.dm
cat /var/www/*/app/Http/Controllers/AiAgent*Controller.php
```

**Look for**:
1. Does it create users in v_users or v_ai_users?
2. Does it return user_uuid in response?
3. What is the api_key field mapped to?

**Example expected code**:
```php
public function provision(Request $request) {
    // Find or create user
    $user = $this->findOrCreateUser($request->user_email);

    // Create agent
    $agent = AiAgent::create([
        'user_uuid' => $user->user_uuid,  // ← Should be here
        ...
    ]);

    return response()->json([
        'agent' => [
            'agent_uuid' => $agent->agent_uuid,
            'user_uuid' => $user->user_uuid,  // ← Should be returned
            'api_key' => $user->api_key,
        ]
    ]);
}
```

---

## Solution Plan

### Option A: Fix Laravel API to Return user_uuid (PREFERRED)

**Steps**:
1. SSH to billing.call.epic.dm
2. Find Laravel controller handling `/api/ai-agents/provision`
3. Verify user creation logic exists
4. Add `user_uuid` to API response
5. Test API returns user_uuid
6. Deploy changes

**Files to modify**:
- `app/Http/Controllers/AiAgentController.php` (or similar)

**Changes**:
```php
// ADD to response
return response()->json([
    'success' => true,
    'agent' => [
        'agent_uuid' => $agent->agent_uuid,
        'user_uuid' => $user->user_uuid,  // ← ADD THIS
        'api_key' => $user->api_key,
        // ... rest
    ]
]);
```

### Option B: Query FusionPBX Database Directly (WORKAROUND)

If we can't modify Laravel API:

**Steps**:
1. Create database connection to billing.call.epic.dm FusionPBX database
2. After provisioning agent, query v_ai_users or v_users for user_uuid
3. Store user_uuid in ai.epic.dm database

**Files to modify**:
- `/opt/livekit1/backend/fusionpbx_api_client.py`
- Add database query after API call

**Code**:
```python
# After provisioning
result = self.provision_agent(...)

# Query FusionPBX database for user_uuid
import psycopg2
conn = psycopg2.connect(
    host="billing.call.epic.dm",
    database="fusionpbx",
    user="fusionpbx",
    password="..."
)
cur = conn.execute(
    "SELECT user_uuid FROM v_ai_users WHERE email = %s",
    (user_email,)
)
user_uuid = cur.fetchone()[0]

# Add to result
result.user_uuid = user_uuid
```

### Option C: Create Custom Endpoint for User Lookup

Add new endpoint on billing.call.epic.dm:

**Endpoint**: `GET /api/ai-agents/user/{email}`

**Response**:
```json
{
  "user_uuid": "...",
  "api_key": "...",
  "email": "...",
  "balance": 0
}
```

**Then call from ai.epic.dm**:
```python
# After provisioning agent
user_data = fusionpbx_client.get_user_by_email(user_email)
user_uuid = user_data['user_uuid']
```

---

## Implementation Steps (Option A - Recommended)

### 1. Access billing.call.epic.dm Server

```bash
ssh root@billing.call.epic.dm
```

### 2. Locate Laravel Application

```bash
cd /var/www
find . -name "artisan" -type f
cd [laravel_directory]
```

### 3. Find AI Agent Controller

```bash
find app/Http/Controllers -name "*AiAgent*" -o -name "*Ai*"
cat app/Http/Controllers/[controller_name].php
```

### 4. Modify provision() Method

**Add to response**:
```php
'user_uuid' => $user->user_uuid ?? $aiAgent->user_uuid,
```

### 5. Test API Change

```bash
curl -X POST https://billing.call.epic.dm/api/ai-agents/provision \
  -H "Content-Type: application/json" \
  -d '{"user_email":"test@test.com","agent_name":"Test","agent_type":"voice"}'
```

**Verify response includes**:
```json
{
  "agent": {
    "user_uuid": "...",  // ← Should now be present
    "api_key": "..."
  }
}
```

### 6. Update ai.epic.dm Code

**File**: `/opt/livekit1/backend/agent_provisioning_hooks.py`

**Change line 73-74**:
```python
return {
    'success': True,
    'user_api_key': result.user_api_key,
    'user_uuid': result.user_uuid,  # ← Will now be populated
    ...
}
```

**File**: `/opt/livekit1/user_dashboard.py`

**Add after line 804**:
```python
user_api_key = provisioning_result.get('user_api_key')
user_uuid = provisioning_result.get('user_uuid')  # ← ADD THIS

if user_api_key and not user.fusionpbx_api_key:
    user.fusionpbx_api_key = user_api_key

if user_uuid and not user.fusionpbx_user_uuid:  # ← ADD THIS
    user.fusionpbx_user_uuid = user_uuid
    print(f"🔧 Stored FusionPBX user UUID: {user_uuid}")
```

### 7. Test End-to-End

**Create new agent**:
```bash
# Via ai.epic.dm agent wizard
# Verify database has user_uuid
PGPASSWORD="..." psql -U postgres -d epic_voice_db -c \
  "SELECT fusionpbx_user_uuid FROM users WHERE email = 'test@test.com';"
```

**Verify in FusionPBX GUI**:
1. Go to https://billing.call.epic.dm
2. Login to FusionPBX
3. Go to Accounts → Users
4. Search for user by UUID or email
5. Verify user exists

---

## Success Criteria

- ✅ FusionPBX API returns `user_uuid` in provision response
- ✅ ai.epic.dm stores `user_uuid` in users table
- ✅ User visible in FusionPBX GUI under Accounts → Users
- ✅ User can see all their agents/extensions in FusionPBX
- ✅ Billing consolidation working (all agents under one user)

---

## Rollback Plan

If changes break anything:

1. Revert Laravel controller changes
2. Restart PHP-FPM/Apache on billing.call.epic.dm
3. Verify API still works without user_uuid
4. ai.epic.dm code will gracefully handle missing user_uuid (already does)

---

## Next Actions

1. **IMMEDIATE**: SSH to billing.call.epic.dm and locate Laravel code
2. **CHECK**: Verify if users are being created in v_users or v_ai_users
3. **FIX**: Modify Laravel controller to return user_uuid
4. **TEST**: Verify API change works
5. **UPDATE**: Modify ai.epic.dm code to capture and store user_uuid
6. **VERIFY**: Create test agent and confirm user appears in FusionPBX GUI
