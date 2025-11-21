# FusionPBX User Account Implementation Plan

**Date**: November 17, 2025
**Goal**: Match Magnus Billing architecture - create user accounts in FusionPBX with agents linked to users

---

## 🎯 Current vs. Desired Architecture

### Current (Broken)
```
ai.epic.dm user: john@example.com
  ↓
Creates Agent #1 → Extension 3001 (orphaned, no parent user)
Creates Agent #2 → Extension 3002 (orphaned, no parent user)
Creates Agent #3 → Extension 3003 (orphaned, no parent user)

❌ No FusionPBX user account
❌ No consolidated billing
❌ Extensions not grouped
```

### Desired (Like Magnus Billing)
```
ai.epic.dm user: john@example.com
  ↓
1. Create FusionPBX user account (v_ai_users)
   - user_uuid: xxx-xxx-xxx
   - email: john@example.com
   - api_key: for API access
  ↓
2. Create Agent #1 → Extension 3001
   - Linked to user_uuid
   - Billing to john@example.com
  ↓
3. Create Agent #2 → Extension 3002
   - Linked to SAME user_uuid
   - Billing to john@example.com
  ↓
4. Create Agent #3 → Extension 3003
   - Linked to SAME user_uuid
   - Billing to john@example.com

✅ All extensions under one user
✅ Consolidated billing
✅ Easy to query: "Get all extensions for user@email.com"
```

---

## 📊 Required FusionPBX Database Structure

Based on Magnus Billing pattern, need these tables:

### 1. v_ai_users (User Accounts)
```sql
CREATE TABLE v_ai_users (
    user_uuid UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    api_key VARCHAR(255) UNIQUE,
    domain_uuid UUID,  -- FusionPBX domain
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. v_ai_agents (Agents linked to users)
```sql
CREATE TABLE v_ai_agents (
    agent_uuid UUID PRIMARY KEY,
    user_uuid UUID REFERENCES v_ai_users(user_uuid),  -- LINK TO USER
    agent_name VARCHAR(255),
    agent_type VARCHAR(50),
    extension_uuid UUID,  -- Links to v_extensions
    did_uuid UUID,  -- Links to v_destinations
    livekit_room_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 3. v_extensions (SIP Extensions)
```sql
-- Existing FusionPBX table
-- Need to add:
ALTER TABLE v_extensions ADD COLUMN user_uuid UUID REFERENCES v_ai_users(user_uuid);
```

---

## 🔄 Implementation Flow

### User First Signs Up at ai.epic.dm

```
1. User creates account at ai.epic.dm
   - email: john@example.com
   - Stored in LiveKit database (users table)
   ↓
2. HOOK: on_user_created()
   ↓
3. Call FusionPBX API: POST /api/ai-users/create
   {
     "email": "john@example.com",
     "name": "John Doe"
   }
   ↓
4. FusionPBX creates:
   - Entry in v_ai_users
   - Generates api_key
   - Links to domain_uuid
   ↓
5. Store user_uuid in LiveKit database
   - users.fusionpbx_user_uuid = xxx-xxx-xxx
```

### User Creates Agent #1

```
1. User creates agent via UI
   ↓
2. Backend calls: on_agent_created(user_email)
   ↓
3. Check if user exists in FusionPBX
   - GET /api/ai-users/{email}
   ↓
4. If user doesn't exist → Create user first
   - POST /api/ai-users/create
   ↓
5. Provision agent WITH user_uuid
   - POST /api/ai-agents/provision
   {
     "user_email": "john@example.com",
     "user_uuid": "xxx-xxx-xxx",  ← PARENT USER
     "agent_name": "Agent 1"
   }
   ↓
6. FusionPBX creates:
   - v_ai_agents entry (linked to user_uuid)
   - v_extensions entry (linked to user_uuid)
   - v_did_assignments (linked to user_uuid)
   ↓
7. Returns SIP credentials
```

### User Creates Agents #2 and #3

```
Same flow as Agent #1:
- User already exists in FusionPBX ✓
- Skip user creation
- Create agent linked to existing user_uuid
- All agents now grouped under one user
```

---

## 🛠️ Code Changes Required

### 1. Update FusionPBX API Client

**File**: `/opt/livekit1/backend/fusionpbx_api_client.py`

Add methods:
```python
def create_user(self, email: str, name: str) -> Dict:
    """Create FusionPBX user account"""
    response = self.session.post(
        f"{self.base_url}/api/ai-users/create",
        json={"email": email, "name": name}
    )
    return response.json()

def get_user_by_email(self, email: str) -> Optional[Dict]:
    """Get user by email"""
    response = self.session.get(
        f"{self.base_url}/api/ai-users/{email}"
    )
    if response.status_code == 200:
        return response.json()
    return None

def ensure_user_exists(self, email: str, name: str = None) -> str:
    """Ensure user exists, create if not. Returns user_uuid"""
    user = self.get_user_by_email(email)
    if user:
        return user['user_uuid']

    # Create user
    result = self.create_user(email, name or email.split('@')[0])
    return result['user_uuid']
```

### 2. Update Provisioning Hooks

**File**: `/opt/livekit1/backend/agent_provisioning_hooks.py`

```python
def on_agent_created(
    agent_config_id: str,
    agent_name: str,
    user_email: str,
    user_name: str = None,
    livekit_room_name: Optional[str] = None
) -> Dict:
    # Step 1: Ensure user exists in FusionPBX
    user_uuid = fusionpbx_client.ensure_user_exists(user_email, user_name)

    # Step 2: Provision agent under that user
    result = fusionpbx_client.provision_agent(
        user_email=user_email,
        user_uuid=user_uuid,  # ← Link to parent user
        agent_name=agent_name,
        agent_type="voice",
        livekit_room_name=livekit_room_name
    )

    # Step 3: Store user_uuid in LiveKit database
    # ... rest of code
```

### 3. Update Database Schema

**File**: `/opt/livekit1/backend/migrations/migration_010_fusionpbx_users.sql`

```sql
-- Add user_uuid to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fusionpbx_user_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_api_key VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_users_fusionpbx_uuid
ON users(fusionpbx_user_uuid);
```

### 4. Update User Registration

**File**: `/opt/livekit1/user_dashboard.py`

```python
@app.route('/api/auth/register', methods=['POST'])
def register():
    # ... create user in database ...

    # HOOK: Create FusionPBX user account
    try:
        from backend.agent_provisioning_hooks import on_user_registered

        fusionpbx_result = on_user_registered(
            user_email=data['email'],
            user_name=data['name']
        )

        if fusionpbx_result['success']:
            user.fusionpbx_user_uuid = fusionpbx_result['user_uuid']
            user.fusionpbx_api_key = fusionpbx_result['api_key']
            db.commit()
    except Exception as e:
        logger.warning(f"FusionPBX user creation failed: {e}")
        # Don't fail registration if FusionPBX is down
```

---

## 🎯 FusionPBX API Endpoints Needed

Need to confirm these endpoints exist or create them:

### User Management
- `POST /api/ai-users/create` - Create user account
- `GET /api/ai-users/{email}` - Get user by email
- `GET /api/ai-users/{uuid}` - Get user by UUID
- `PUT /api/ai-users/{uuid}` - Update user
- `DELETE /api/ai-users/{uuid}` - Delete user

### Agent Provisioning (Update existing)
- `POST /api/ai-agents/provision` - Add `user_uuid` parameter
- Response should include `user_uuid` in agent data

---

## 🧪 Testing Plan

### 1. User Registration Test
```bash
# Create user at ai.epic.dm
POST /api/auth/register
{
  "email": "testuser@ai.epic.dm",
  "name": "Test User",
  "password": "password123"
}

# Verify FusionPBX user created
SELECT * FROM v_ai_users WHERE email = 'testuser@ai.epic.dm';
```

### 2. Multi-Agent Test
```bash
# User creates 3 agents
POST /api/user/agents (Agent 1)
POST /api/user/agents (Agent 2)
POST /api/user/agents (Agent 3)

# Verify all linked to same user
SELECT
    u.email,
    u.user_uuid,
    COUNT(a.agent_uuid) as agent_count,
    COUNT(e.extension_uuid) as extension_count
FROM v_ai_users u
LEFT JOIN v_ai_agents a ON a.user_uuid = u.user_uuid
LEFT JOIN v_extensions e ON e.user_uuid = u.user_uuid
WHERE u.email = 'testuser@ai.epic.dm'
GROUP BY u.email, u.user_uuid;

Expected result:
email                | user_uuid | agent_count | extension_count
---------------------|-----------|-------------|----------------
testuser@ai.epic.dm  | xxx-xxx   | 3           | 3
```

### 3. Billing Consolidation Test
```bash
# Query all resources for one user
SELECT
    u.email,
    a.agent_name,
    e.extension,
    d.did_number
FROM v_ai_users u
JOIN v_ai_agents a ON a.user_uuid = u.user_uuid
JOIN v_extensions e ON e.extension_uuid = a.extension_uuid
JOIN v_did_assignments d ON d.did_uuid = a.did_uuid
WHERE u.email = 'testuser@ai.epic.dm';

Expected result:
email                | agent_name | extension | did_number
---------------------|------------|-----------|-------------
testuser@ai.epic.dm  | Agent 1    | 3001      | 17678189001
testuser@ai.epic.dm  | Agent 2    | 3002      | 17678189002
testuser@ai.epic.dm  | Agent 3    | 3003      | 17678189003
```

---

## 📋 Next Steps

1. ⏸️ **WAIT** - Confirm with user if FusionPBX API already has user management
   - Does `/api/ai-agents/provision` already create users?
   - Does `v_ai_users` table exist?
   - Are agents already linked to users?

2. If YES → Just update LiveKit integration to track user_uuid
3. If NO → Need to build user management in FusionPBX API first

---

## ❓ Questions for User

1. **Does the FusionPBX API at `billing.call.epic.dm` already have user account management?**
   - Is there a `/api/ai-users/*` endpoint?
   - Does `v_ai_users` table exist in FusionPBX database?

2. **When we call `/api/ai-agents/provision`, does it:**
   - Create a user if email doesn't exist?
   - Link the agent to that user?
   - Allow querying all agents for a user?

3. **Should we implement user management in:**
   - A) FusionPBX API (Laravel on billing.call.epic.dm)
   - B) LiveKit backend (Python on ai.epic.dm)
   - C) Both (sync between them)

---

**Status**: ⏸️ **AWAITING USER CONFIRMATION**

Once we know the current state of user management in FusionPBX, we can proceed with the appropriate implementation approach.
