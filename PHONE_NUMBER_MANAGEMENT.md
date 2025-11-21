# 📞 Phone Number Management System

## Overview
Complete multi-tenant phone number management system with duplicate prevention and proper routing.

---

## 🏗️ **Architecture**

### **Database Tables**

#### 1. `phone_number_pool`
**Purpose:** Inventory of all phone numbers in the system

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `phone_number` | String(20) | **UNIQUE** - The actual phone number |
| `status` | String | `available`, `assigned`, `reserved`, `suspended` |
| `assigned_to_user_id` | UUID | Which user owns this number |
| `assigned_to_agent_id` | UUID | Which agent is using it (optional) |
| `can_receive_calls` | Boolean | Call capabilities |
| `can_send_calls` | Boolean | Outbound capabilities |
| `provider` | String | `magnus`, `telnyx`, `twilio` |
| `monthly_cost` | Integer | Cost in cents |

**Key Features:**
- ✅ **Unique constraint** on `phone_number` - **NO DUPLICATES**
- ✅ Indexed on `status` and `assigned_to_user_id` for fast queries
- ✅ Tracks both user ownership AND agent assignment

#### 2. `phone_number_history`
**Purpose:** Audit trail of all phone number changes

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `phone_number` | String(20) | The number that changed |
| `action` | String | `assigned`, `unassigned`, `provisioned`, etc. |
| `previous_status` | String | What it was before |
| `new_status` | String | What it is now |
| `user_id` | UUID | Who it affects |
| `created_at` | DateTime | When it happened |

---

## 🔧 **API Endpoints**

### 1. **Get User's Phone Numbers**
```http
GET /api/user/phone-numbers
```
**Response:**
```json
{
  "success": true,
  "phone_numbers": [
    {
      "id": "uuid",
      "phone_number": "+17678183366",
      "status": "assigned",
      "assigned_to_agent": "Customer Support Agent",
      "agent_id": "agent-uuid",
      "can_receive_calls": true,
      "can_send_calls": true,
      "assigned_at": "2025-10-22T00:00:00",
      "created_at": "2025-10-22T00:00:00"
    }
  ]
}
```

### 2. **Provision New Phone Number**
```http
POST /api/user/phone-numbers/provision
Content-Type: application/json

{
  "country": "Dominica",
  "prefix": "17678180"
}
```
**Response:**
```json
{
  "success": true,
  "phone_number": "+17678183366",
  "message": "Phone number provisioned successfully"
}
```

**Logic:**
- Generates number like Magnus Billing: `prefix + random(0000-9999)`
- Checks for duplicates in `phone_number_pool`
- Retries up to 100 times if collision
- Assigns to requesting user automatically

### 3. **Assign Number to Agent**
```http
POST /api/user/phone-numbers/+17678183366/assign
Content-Type: application/json

{
  "agent_id": "agent-uuid"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Phone number assigned to Customer Support Agent"
}
```

**Validation:**
- ✅ Checks if number is already assigned to another agent (prevents conflicts)
- ✅ Verifies user owns the phone number
- ✅ Verifies user owns the agent
- ✅ Creates `phone_mappings` entry for routing
- ✅ Updates `phone_number_pool` with agent_id

### 4. **Unassign Number from Agent**
```http
POST /api/user/phone-numbers/+17678183366/unassign
```
**Response:**
```json
{
  "success": true,
  "message": "Phone number unassigned successfully"
}
```

### 5. **Get Available Numbers** (Not Assigned to Any Agent)
```http
GET /api/user/phone-numbers/available
```
**Response:**
```json
{
  "success": true,
  "available_numbers": [
    {
      "id": "uuid",
      "phone_number": "+17678180123",
      "status": "assigned",
      "can_receive_calls": true,
      "can_send_calls": true
    }
  ]
}
```

### 6. **Get Phone Routing** (For Incoming Calls)
```http
GET /api/phone-routing/+17678183366
```
**Response:**
```json
{
  "success": true,
  "routing": {
    "agent_id": "uuid",
    "user_id": "uuid",
    "agent_name": "Customer Support Agent",
    "file_path": "/opt/livekit1/agents/customer_support",
    "status": "deployed"
  }
}
```

**Use Case:** LiveKit/SIP system calls this to route incoming calls

### 7. **Check for Duplicates**
```http
GET /api/user/phone-numbers/+17678183366/check
```
**Response:**
```json
{
  "exists": true,
  "owner_id": "user-uuid",
  "agent_id": "agent-uuid",
  "status": "assigned"
}
```

---

## 🔒 **Multi-Tenant Isolation**

### **How It Works:**

1. **User Ownership**
   - Each phone number has `assigned_to_user_id`
   - Only the owner can assign/unassign to their agents
   - No user can see or modify another user's numbers

2. **Agent Assignment**
   - Phone numbers are owned by USER
   - Then assigned to specific AGENT
   - One number can only be assigned to ONE agent at a time
   - Same agent can have multiple numbers

3. **Routing**
   - Incoming call → Phone Number → Agent ID → User ID
   - System validates ownership at every step
   - Prevents cross-tenant routing

---

## 🚫 **Duplicate Prevention**

### **Database Level:**
```sql
CREATE UNIQUE INDEX idx_phone_unique ON phone_number_pool(phone_number);
```

### **Application Level:**
1. **Provision:** Checks `phone_number_pool` before creating
2. **Assign:** Checks if number already assigned to different agent
3. **Routing:** Only returns active, valid mappings

### **Magnus Billing Integration:**
Your PHP code pattern is preserved:
```python
# Generate unique DID
for attempt in range(100):
    random_number = random.randint(0, 9999)
    did = f"+{prefix}{random_number:04d}"
    
    # Check if exists
    existing = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.phone_number == did
    ).first()
    
    if not existing:
        # Create it
        break
```

---

## 📊 **Usage Example**

### **Scenario: User Signs Up**
```python
# 1. Create user account
user_id = create_user(email, password)

# 2. Provision phone number
result = phone_manager.provision_number(
    db, 
    user_id, 
    country='Dominica', 
    prefix='17678180'
)
# Returns: +17678183366

# 3. User creates agent
agent_id = create_agent(user_id, "Customer Support")

# 4. Assign number to agent
phone_manager.assign_to_agent(
    db,
    phone_number='+17678183366',
    agent_id=agent_id,
    user_id=user_id
)

# 5. Incoming call arrives
routing = phone_manager.get_routing_info(db, '+17678183366')
# Returns: agent_id, user_id, file_path
# System routes to correct agent!
```

---

## 🔄 **Migration from Current System**

If you have existing phone numbers in `phone_mappings`:

```python
from phone_number_manager import PhoneNumberPool
from database import SessionLocal, PhoneMapping

db = SessionLocal()

# Get existing mappings
mappings = db.query(PhoneMapping).all()

for mapping in mappings:
    # Check if already in pool
    existing = db.query(PhoneNumberPool).filter(
        PhoneNumberPool.phone_number == mapping.phone_number
    ).first()
    
    if not existing:
        # Add to pool
        pool_entry = PhoneNumberPool(
            phone_number=mapping.phone_number,
            assigned_to_user_id=mapping.user_id,
            assigned_to_agent_id=mapping.agent_config_id,
            status='assigned',
            assigned_at=mapping.created_at
        )
        db.add(pool_entry)

db.commit()
print("✅ Migration complete!")
```

---

## 🎯 **Key Benefits**

1. ✅ **No Duplicates** - Database-level unique constraint
2. ✅ **Proper Routing** - Clear agent assignment with validation
3. ✅ **Multi-Tenant** - Complete user isolation
4. ✅ **Audit Trail** - All changes logged in history table
5. ✅ **Scalable** - Indexed for performance
6. ✅ **Magnus Compatible** - Preserves your DID generation pattern
7. ✅ **Flexible** - Supports multiple providers (Magnus, Telnyx, Twilio)

---

## 🚀 **Next Steps**

1. ✅ **Database created** - Tables are ready
2. ✅ **API endpoints added** - Backend is complete
3. ⏳ **UI needed** - Frontend phone number management page
4. ⏳ **Magnus integration** - Connect to actual Magnus Billing API

---

## 📝 **Testing**

```bash
# Restart Flask
pkill -f user_dashboard.py
cd /opt/livekit1 && nohup python3 user_dashboard.py > flask.log 2>&1 &

# Test provision
curl -X POST http://localhost:5001/api/user/phone-numbers/provision \
  -H "Content-Type: application/json" \
  -d '{"country": "Dominica", "prefix": "17678180"}'

# Test list numbers
curl http://localhost:5001/api/user/phone-numbers

# Test assign to agent
curl -X POST http://localhost:5001/api/user/phone-numbers/+17678183366/assign \
  -H "Content-Type: application/json" \
  -d '{"agent_id": "your-agent-id"}'

# Test routing
curl http://localhost:5001/api/phone-routing/+17678183366
```

---

## 🔐 **Security Notes**

- All endpoints check `get_current_user_id()`
- User can only manage their own numbers
- Agent ownership verified before assignment
- No cross-tenant data leakage
- Audit trail for compliance

---

**System is ready! Multi-tenant phone number management with full duplicate prevention and proper routing.** 📞✨
