# Agent & Phone Number Management - Implementation Summary

## What Was Implemented

### 1. ✅ Agent Deletion with Phone Number Unassignment

When you delete an agent, the system now automatically:

**Step 1: Unassign Phone Numbers**
- Finds all phone numbers assigned to the agent
- Marks phone mappings as inactive
- Returns phone numbers to customer inventory (status = 'available')
- Clears `assigned_to_agent_id` field

**Step 2: Clear Magnus DID Routing**
- Calls Magnus API to clear DID destination
- Sets destination to empty string (unrouted)
- Sets voip_call to 0 (disabled)
- Phone number stays in Magnus but doesn't route anywhere

**Step 3: Soft Delete Agent**
- Marks agent as inactive (`isActive = False`)
- Agent remains in database for billing/historical purposes

### 2. ✅ Activate/Deactivate Agents

**Activate (Deploy)**: `POST /api/user/agents/{id}/deploy`
- Sets status to 'deployed'
- Agent starts handling calls
- Dynamic routing enabled

**Deactivate (Undeploy)**: `POST /api/user/agents/{id}/undeploy`
- Sets status back to 'created'
- Agent stops handling calls
- Can be reactivated later

### 3. ✅ Agent Status Flow

```
created → (deploy) → deployed → (undeploy) → created
   ↓                                            ↓
(delete)                                    (delete)
   ↓                                            ↓
inactive (soft deleted)              inactive (soft deleted)
```

---

## How To Use

### Delete an Agent

```bash
curl -X DELETE http://localhost:5001/api/user/agents/{agent_id} \
  -H "X-User-Email: user@example.com"
```

**What happens:**
- Phone numbers returned to inventory ✅
- Magnus DID destinations cleared ✅
- Agent marked inactive ✅
- Customer can reassign numbers to other agents ✅

### Activate an Agent

```bash
curl -X POST http://localhost:5001/api/user/agents/{agent_id}/deploy \
  -H "X-User-Email: user@example.com"
```

**Response:**
```json
{
  "success": true,
  "status": "deployed",
  "message": "Agent activated successfully"
}
```

### Deactivate an Agent

```bash
curl -X POST http://localhost:5001/api/user/agents/{agent_id}/undeploy \
  -H "X-User-Email: user@example.com"
```

**Response:**
```json
{
  "success": true,
  "status": "created",
  "message": "Agent deactivated"
}
```

---

## Frontend Integration Example

```typescript
// Agent actions
const handleDelete = async (agentId: string) => {
  const result = await api.delete(`/api/user/agents/${agentId}`);
  if (result.success) {
    toast.success("Agent deleted. Phone numbers returned to inventory.");
    refetch();
  }
};

const handleActivate = async (agentId: string) => {
  const result = await api.post(`/api/user/agents/${agentId}/deploy`);
  if (result.success) {
    toast.success("Agent activated!");
    refetch();
  }
};

const handleDeactivate = async (agentId: string) => {
  const result = await api.post(`/api/user/agents/${agentId}/undeploy`);
  if (result.success) {
    toast.success("Agent deactivated");
    refetch();
  }
};
```

---

## Files Modified

1. **`/opt/livekit1/user_dashboard.py`** (lines 1138-1226)
   - Added phone unassignment logic to delete_agent()
   - Clears Magnus DID routing
   - Returns numbers to inventory

2. **`/opt/livekit1/magnus_billing_client_new.py`** (lines 368-421)
   - Added `clear_did_destination()` method
   - Unsets Magnus DID routing

---

## Testing Example

```bash
# 1. Create agent
AGENT_ID=$(curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{"name":"Test","instructions":"Test"}' | jq -r '.data.id')

# 2. Activate agent
curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/deploy \
  -H "X-User-Email: test@example.com"

# Agent is now active

# 3. Deactivate agent
curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/undeploy \
  -H "X-User-Email: test@example.com"

# Agent is now inactive but can be reactivated

# 4. Delete agent
curl -X DELETE http://localhost:5001/api/user/agents/$AGENT_ID \
  -H "X-User-Email: test@example.com"

# ✅ Agent deleted
# ✅ Phone number returned to inventory
# ✅ Magnus DID cleared
```

---

## Documentation

Full details in:
- `/opt/livekit1/AGENT_LIFECYCLE_MANAGEMENT.md` - Complete guide
- `/opt/livekit1/DUPLICATE_SIP_FIX_COMPLETE.md` - Duplicate SIP fix

---

## Status

✅ **Implemented** - Ready for testing  
Date: 2025-11-19  
Changes Active: Flask restarted with new code
