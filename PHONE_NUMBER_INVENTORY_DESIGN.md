# Phone Number Inventory Management - Design Document

**Date**: November 17, 2025
**Status**: 🔨 IN PROGRESS

---

## 🎯 Objective

Create a phone number inventory system where users can:
1. **Provision phone numbers** independently (not tied to agents)
2. **Store numbers in inventory** (unassigned pool)
3. **Assign/reassign numbers** to different agents as needed
4. **Swap numbers** between agents without reprovisioning

---

## 🏗️ Architecture

### Current State (Agent-Coupled)
```
Create Agent → FusionPBX Assigns Phone → Agent + Phone Created Together
```
**Problem**: Phone number is permanently tied to agent. Can't swap or reuse.

### Desired State (Inventory-Based)
```
Step 1: Provision Phone → Stored in Inventory (unassigned)
Step 2: Assign Phone → Link to Agent
Step 3: Reassign Phone → Unlink from Agent A, Link to Agent B
```
**Benefit**: Flexible phone number management, can swap numbers between agents.

---

## 📊 Database Schema

### Existing Table: `phone_number_pool`
```sql
CREATE TABLE phone_number_pool (
    phone_number VARCHAR(15) PRIMARY KEY,
    assigned_to_user UUID REFERENCES users(id),
    assigned_agent_id UUID REFERENCES agent_configs(id),
    livekit_inbound_trunk_id VARCHAR(255),
    livekit_outbound_trunk_id VARCHAR(255),
    fusionpbx_extension_uuid UUID,           -- NEW
    fusionpbx_did_uuid UUID,                 -- NEW
    fusionpbx_user_email VARCHAR(255),       -- NEW: Links to FusionPBX user
    sip_username VARCHAR(50),
    sip_password VARCHAR(255),
    sip_domain VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**New Fields**:
- `fusionpbx_extension_uuid`: Extension UUID in FusionPBX
- `fusionpbx_did_uuid`: DID UUID in FusionPBX
- `fusionpbx_user_email`: Email of user who owns this number

---

## 🔧 FusionPBX Integration

### Option 1: Standalone DID Provisioning (If Supported)

**Ideal Flow**:
```
1. User clicks "Add Phone Number"
   ↓
2. POST /api/ai-agents/provision-standalone-did
   {
     "user_email": "user@ai.epic.dm",
     "country": "Dominica",
     "prefix": "1767818"
   }
   ↓
3. FusionPBX:
   - Checks/creates user account
   - Assigns available DID from pool
   - Creates extension (placeholder, not for agent use yet)
   - Returns DID + credentials
   ↓
4. Store in phone_number_pool:
   - assigned_to_user: user.id
   - assigned_agent_id: NULL (unassigned)
   - fusionpbx_extension_uuid: xxx
   - fusionpbx_did_uuid: xxx
   ↓
5. ✅ Phone number in inventory, ready to assign
```

### Option 2: Provision with Placeholder Agent

**If FusionPBX requires agent for DID**:
```
1. User clicks "Add Phone Number"
   ↓
2. POST /api/ai-agents/provision
   {
     "user_email": "user@ai.epic.dm",
     "agent_name": "INVENTORY_POOL",  ← Special placeholder
     "agent_type": "inventory"
   }
   ↓
3. FusionPBX:
   - Checks/creates user account
   - Creates extension + DID
   - Links to placeholder "agent"
   ↓
4. Store in phone_number_pool:
   - assigned_agent_id: NULL (logical unassignment)
   - fusionpbx_agent_uuid: xxx (technical link)
   ↓
5. When assigning to real agent:
   - Update dialplan to route to real agent
   - Don't delete/recreate resources
```

---

## 🔄 Phone Number Assignment Flow

### Assign Number to Agent
```
1. User selects unassigned phone number from inventory
2. User clicks "Assign to Agent" → selects agent
   ↓
3. POST /api/user/phone-numbers/{number}/assign
   {
     "agent_id": "agent-uuid-123"
   }
   ↓
4. Backend updates:
   a) phone_number_pool.assigned_agent_id = agent-uuid-123
   b) agent_configs.did_number = phone_number
   c) agent_configs.sip_username = from phone record
   d) agent_configs.fusionpbx_extension_uuid = from phone record
   ↓
5. (Optional) Update FusionPBX dialplan:
   - Change destination from "INVENTORY_POOL" to actual agent room
   ↓
6. ✅ Phone number now assigned to agent
```

### Unassign Number from Agent
```
1. User clicks "Unassign" on phone number
   ↓
2. POST /api/user/phone-numbers/{number}/unassign
   ↓
3. Backend updates:
   a) phone_number_pool.assigned_agent_id = NULL
   b) agent_configs.did_number = NULL (or keep for history?)
   ↓
4. (Optional) Update FusionPBX dialplan:
   - Change destination back to "INVENTORY_POOL" or disable
   ↓
5. ✅ Phone number back in inventory, available for reassignment
```

### Swap Numbers Between Agents
```
Agent A: DID 17678189020
Agent B: DID 17678189021

User wants to swap:

1. Unassign 17678189020 from Agent A
2. Unassign 17678189021 from Agent B
3. Assign 17678189020 to Agent B
4. Assign 17678189021 to Agent A

Result:
Agent A: DID 17678189021
Agent B: DID 17678189020
```

---

## 🛠️ Implementation Plan

### Phase 1: Fix Authentication Issue ✅
**Current Error**: "Authentication required" when clicking "Add Phone Number"

**Root Cause**: Session not properly checked or user not logged in

**Fix**:
1. Test if user is actually logged in when accessing /dashboard/phone-numbers
2. Add debug logging to provision route to see session state
3. Ensure cookies are being sent with API request
4. Verify NextAuth configuration is correct

### Phase 2: Create FusionPBX Standalone Provisioning
**File**: `/opt/livekit1/backend/fusionpbx_api_client.py`

**Add Method**:
```python
def provision_standalone_did(
    self,
    user_email: str,
    country: str = "Dominica",
    prefix: str = "1767818"
) -> Dict:
    """
    Provision a standalone DID (not tied to specific agent)

    Returns:
        {
            'success': True,
            'did_number': '17678189025',
            'sip_username': '3018',
            'sip_password': 'xxx',
            'sip_domain': 'billing.call.epic.dm',
            'extension_uuid': 'xxx',
            'did_uuid': 'xxx',
            'user_api_key': 'ak_xxx...'
        }
    """
    try:
        response = self.session.post(
            f"{self.api_base}/provision",
            json={
                "user_email": user_email,
                "agent_name": "INVENTORY_POOL",  # Placeholder
                "agent_type": "inventory"
            },
            timeout=self.timeout
        )
        # Process response...
    except Exception as e:
        return {'success': False, 'error': str(e)}
```

### Phase 3: Update Backend Provision Endpoint
**File**: `/opt/livekit1/user_dashboard.py`

**Modify** `/api/user/phone-numbers/provision`:
```python
@app.route('/api/user/phone-numbers/provision', methods=['POST'])
def provision_phone_number():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'No user found'}), 404

    db = SessionLocal()
    try:
        # Get user email
        user = db.query(User).filter(User.id == user_id).first()

        # Call FusionPBX API for standalone DID
        result = fusionpbx_client.provision_standalone_did(
            user_email=user.email,
            country=data.get('country', 'Dominica'),
            prefix=data.get('prefix', '1767818')
        )

        if result['success']:
            # Store in phone_number_pool
            phone_record = PhoneNumberPool(
                phone_number=result['did_number'],
                assigned_to_user=user_id,
                assigned_agent_id=None,  # Unassigned
                fusionpbx_extension_uuid=result['extension_uuid'],
                fusionpbx_did_uuid=result['did_uuid'],
                fusionpbx_user_email=user.email,
                sip_username=result['sip_username'],
                sip_password=result['sip_password'],
                sip_domain=result['sip_domain'],
                notes="Provisioned via inventory system"
            )
            db.add(phone_record)
            db.commit()

            return jsonify({
                'success': True,
                'phone_number': result['did_number'],
                'message': 'Phone number added to inventory'
            })
    finally:
        db.close()
```

### Phase 4: Update Assignment Logic
**File**: `/opt/livekit1/user_dashboard.py`

**Modify** `/api/user/phone-numbers/<phone_number>/assign`:
```python
@app.route('/api/user/phone-numbers/<phone_number>/assign', methods=['POST'])
def assign_phone_to_agent(phone_number):
    user_id = get_current_user_id()
    data = request.json
    agent_id = data.get('agent_id')

    db = SessionLocal()
    try:
        # Get phone record
        phone = db.query(PhoneNumberPool).filter(
            PhoneNumberPool.phone_number == phone_number,
            PhoneNumberPool.assigned_to_user == user_id
        ).first()

        if not phone:
            return jsonify({'error': 'Phone number not found'}), 404

        # Get agent
        agent = db.query(AgentConfig).filter(
            AgentConfig.id == agent_id,
            AgentConfig.userId == user_id
        ).first()

        if not agent:
            return jsonify({'error': 'Agent not found'}), 404

        # Check if phone already assigned
        if phone.assigned_agent_id:
            return jsonify({'error': 'Phone number already assigned'}), 400

        # Assign phone to agent
        phone.assigned_agent_id = agent_id
        agent.did_number = phone_number
        agent.sip_username = phone.sip_username
        agent.sip_password = phone.sip_password
        agent.sip_domain = phone.sip_domain
        agent.fusionpbx_extension_uuid = phone.fusionpbx_extension_uuid
        agent.fusionpbx_did_uuid = phone.fusionpbx_did_uuid

        db.commit()

        return jsonify({
            'success': True,
            'message': f'Phone {phone_number} assigned to agent {agent.name}'
        })
    finally:
        db.close()
```

### Phase 5: Update Frontend UI
**File**: `/opt/livekit1/frontend/app/dashboard/phone-numbers/page.tsx`

**Add Features**:
- Show "Status" column: "Unassigned" or "Assigned to [Agent Name]"
- Add "Assign" button for unassigned numbers
- Add "Unassign" button for assigned numbers
- Add "Swap" feature (optional)

---

## 🧪 Testing Plan

### Test 1: Provision Standalone Number
```bash
# 1. Login to frontend
# 2. Navigate to /dashboard/phone-numbers
# 3. Click "Add Phone Number"
# 4. Select country/prefix
# 5. Submit form

# Expected:
# - Phone number appears in list
# - Status shows "Unassigned"
# - Can see SIP credentials

# Verify database:
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT phone_number, assigned_agent_id FROM phone_number_pool ORDER BY created_at DESC LIMIT 1;"

# Expected: assigned_agent_id = NULL
```

### Test 2: Assign Number to Agent
```bash
# 1. On phone numbers page, click "Assign" button
# 2. Select agent from dropdown
# 3. Submit

# Expected:
# - Phone number status changes to "Assigned to [Agent Name]"
# - Agent page shows phone number

# Verify database:
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c \
  "SELECT phone_number, assigned_agent_id FROM phone_number_pool WHERE phone_number = '+17678189025';"

# Expected: assigned_agent_id = agent UUID
```

### Test 3: Unassign and Reassign
```bash
# 1. Click "Unassign" on phone number
# Expected: Status changes to "Unassigned"

# 2. Assign to different agent
# Expected: New agent gets the number
```

---

## 📋 API Endpoints

### Provision Standalone Number
```http
POST /api/user/phone-numbers/provision
Content-Type: application/json

{
  "country": "Dominica",
  "prefix": "1767818"
}

Response:
{
  "success": true,
  "phone_number": "+17678189025",
  "message": "Phone number added to inventory"
}
```

### Assign Number to Agent
```http
POST /api/user/phone-numbers/{phone_number}/assign
Content-Type: application/json

{
  "agent_id": "agent-uuid-123"
}

Response:
{
  "success": true,
  "message": "Phone +17678189025 assigned to agent Sales Agent"
}
```

### Unassign Number
```http
POST /api/user/phone-numbers/{phone_number}/unassign

Response:
{
  "success": true,
  "message": "Phone +17678189025 unassigned"
}
```

### List User's Phone Numbers
```http
GET /api/user/phone-numbers

Response:
{
  "success": true,
  "phone_numbers": [
    {
      "phone_number": "+17678189025",
      "sip_username": "3018",
      "sip_domain": "billing.call.epic.dm",
      "assigned_agent_id": null,
      "assigned_agent_name": null,
      "status": "unassigned"
    },
    {
      "phone_number": "+17678189020",
      "sip_username": "3015",
      "sip_domain": "billing.call.epic.dm",
      "assigned_agent_id": "agent-uuid-123",
      "assigned_agent_name": "Sales Agent",
      "status": "assigned"
    }
  ]
}
```

---

## 🎯 Success Criteria

- [ ] User can provision phone numbers without creating agents
- [ ] Phone numbers stored in database with unassigned status
- [ ] User can assign unassigned numbers to agents
- [ ] User can unassign numbers from agents
- [ ] Frontend shows status (assigned/unassigned)
- [ ] Assignment updates agent SIP credentials
- [ ] FusionPBX consolidated billing still works
- [ ] All numbers link to user's FusionPBX account

---

## 🚨 Edge Cases

### Agent Deletion with Assigned Number
**Question**: What happens when user deletes an agent that has a phone number assigned?

**Options**:
1. **Return to inventory** (Recommended): Unassign number, keep in pool
2. **Delete number**: Remove from FusionPBX and database
3. **Prevent deletion**: Require unassignment first

**Recommendation**: Option 1 - Automatically unassign and return to inventory.

### Multiple Users, Same FusionPBX Account
**Scenario**: Two ai.epic.dm users (same email) both have agents.

**Behavior**: Both users share same FusionPBX billing account, but phone_number_pool tracks which user owns each number.

### Number Limit
**Question**: How many numbers can one user have?

**Answer**: Limited by FusionPBX extension range (3001-3999 = 999 possible extensions system-wide). Could add per-user limits in code.

---

## 📝 Next Steps

1. **Fix authentication** in phone provisioning route
2. **Test FusionPBX API** to confirm standalone DID provisioning is possible
3. **Implement backend changes** (fusionpbx_api_client.py, user_dashboard.py)
4. **Update database schema** (add new columns to phone_number_pool)
5. **Update frontend UI** (show status, add assign/unassign buttons)
6. **Test complete flow** end-to-end
7. **Document for users**

---

**Status**: 🔨 Ready to implement
**Estimated Time**: 2-3 hours for complete implementation
**Impact**: High - Enables flexible phone number management
