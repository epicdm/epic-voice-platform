# Agent Lifecycle Management Guide

## Overview
This document explains how to manage AI agents throughout their lifecycle: creation, activation, deactivation, and deletion.

---

## 1. Agent Deletion & Phone Number Handling ✅

### What Happens When You Delete an Agent

When an agent is deleted via `DELETE /api/user/agents/{agent_id}`, the system performs these steps automatically:

#### Step 1: Unassign Phone Numbers
- Finds all phone numbers assigned to the agent
- Marks phone mappings as inactive in database
- Updates phone_number_pool status to `available`
- **Returns phone numbers to customer inventory**

#### Step 2: Clear Magnus DID Routing
- For each phone number, clears the DID destination in Magnus
- Sets destination to empty string (unrouted)
- Sets `voip_call` to 0 (disabled)
- **Phone number remains in Magnus but is not routed anywhere**

#### Step 3: Soft Delete Agent
- Sets `agent.isActive = False`
- Agent remains in database for historical/billing purposes
- Agent no longer appears in active agent lists

### Code Example: Delete Agent

```bash
curl -X DELETE http://localhost:5001/api/user/agents/{agent_id} \
  -H "X-User-Email: user@example.com"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "agent-uuid",
    "message": "Agent deleted successfully"
  }
}
```

**Log Output**:
```
📞 Unassigning 1 phone number(s) from agent Test Agent
   ✅ Cleared Magnus DID destination for +17678189187
   ✅ Returned +17678189187 to inventory (available)
✅ All phone numbers returned to customer inventory
```

### Phone Number Status After Deletion

| Before Deletion | After Deletion |
|----------------|----------------|
| `status: 'assigned'` | `status: 'available'` |
| `assigned_to_agent_id: 'abc-123'` | `assigned_to_agent_id: NULL` |
| Magnus DID → `SIP/+1767XXX@livekit...` | Magnus DID → ` ` (empty) |
| In agent's phone list | In customer inventory |

---

## 2. Agent Activation & Deactivation

### Activate Agent (Deploy)

**Endpoint**: `POST /api/user/agents/{agent_id}/deploy`

Activates an agent so it can handle calls.

**What It Does**:
- Sets `agent.status = 'deployed'`
- Enables dynamic routing for the agent
- Agent becomes active and ready to receive calls
- Links agent to LiveKit room `tst0002` (universal agent)

**Example**:
```bash
curl -X POST http://localhost:5001/api/user/agents/{agent_id}/deploy \
  -H "X-User-Email: user@example.com"
```

**Response**:
```json
{
  "success": true,
  "agent_id": "abc-123",
  "status": "deployed",
  "livekit_agent": "tst0002",
  "message": "Agent Test Agent activated successfully"
}
```

**Frontend**:
```typescript
// In your agent list/detail page
const handleActivate = async (agentId: string) => {
  const result = await api.post(`/api/user/agents/${agentId}/deploy`);
  if (result.success) {
    toast.success("Agent activated!");
    refetch(); // Reload agent list
  }
};
```

---

### Deactivate Agent (Undeploy)

**Endpoint**: `POST /api/user/agents/{agent_id}/undeploy`

Deactivates an agent so it stops handling calls.

**What It Does**:
- Sets `agent.status = 'created'` (back to initial state)
- Agent no longer receives calls
- Phone numbers remain assigned but inactive
- Can be reactivated later

**Example**:
```bash
curl -X POST http://localhost:5001/api/user/agents/{agent_id}/undeploy \
  -H "X-User-Email: user@example.com"
```

**Response**:
```json
{
  "success": true,
  "agent_id": "abc-123",
  "status": "created",
  "message": "Agent Test Agent deactivated"
}
```

**Frontend**:
```typescript
const handleDeactivate = async (agentId: string) => {
  const result = await api.post(`/api/user/agents/${agentId}/undeploy`);
  if (result.success) {
    toast.success("Agent deactivated");
    refetch();
  }
};
```

---

## 3. Agent Status States

| Status | Description | Can Receive Calls? | Actions Available |
|--------|-------------|-------------------|-------------------|
| `created` | Agent created but not activated | ❌ No | Deploy, Delete, Edit |
| `deployed` | Agent active and handling calls | ✅ Yes | Undeploy, Delete |
| `inactive` (isActive=false) | Agent deleted | ❌ No | None (soft deleted) |

---

## 4. Frontend Implementation

### Agent Card with Activate/Deactivate Buttons

```typescript
// components/agents/AgentCard.tsx
import { Button } from "@heroui/react";
import { Power, PowerOff } from "lucide-react";

interface AgentCardProps {
  agent: Agent;
  onActivate: (id: string) => Promise<void>;
  onDeactivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function AgentCard({ agent, onActivate, onDeactivate, onDelete }: AgentCardProps) {
  const isActive = agent.status === 'deployed';

  return (
    <Card>
      <CardHeader>
        <h3>{agent.name}</h3>
        <Chip color={isActive ? "success" : "default"}>
          {isActive ? "Active" : "Inactive"}
        </Chip>
      </CardHeader>
      
      <CardBody>
        <p>{agent.instructions}</p>
        {agent.assigned_phone_numbers?.length > 0 && (
          <p>📞 {agent.assigned_phone_numbers[0]}</p>
        )}
      </CardBody>

      <CardFooter>
        {isActive ? (
          <Button
            color="warning"
            startContent={<PowerOff />}
            onPress={() => onDeactivate(agent.id)}
          >
            Deactivate
          </Button>
        ) : (
          <Button
            color="success"
            startContent={<Power />}
            onPress={() => onActivate(agent.id)}
          >
            Activate
          </Button>
        )}

        <Button
          color="danger"
          variant="light"
          onPress={() => onDelete(agent.id)}
        >
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 5. Complete Lifecycle Example

### Scenario: Customer wants to test, pause, and delete an agent

```bash
# 1. Create agent (starts in 'created' status)
curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: customer@example.com" \
  -d '{
    "name": "Sales Agent",
    "instructions": "Help customers with sales inquiries",
    "llm_model": "gpt-4o-mini",
    "voice": "alloy"
  }'

# Response: { "id": "abc-123", "status": "created", "did_number": "17678189187" }

# 2. Activate agent (status → 'deployed')
curl -X POST http://localhost:5001/api/user/agents/abc-123/deploy \
  -H "X-User-Email: customer@example.com"

# Agent is now ACTIVE and handling calls on +17678189187

# 3. Customer wants to pause (deactivate temporarily)
curl -X POST http://localhost:5001/api/user/agents/abc-123/undeploy \
  -H "X-User-Email: customer@example.com"

# Agent is now PAUSED (status → 'created')
# Phone number +17678189187 is still assigned but not routing

# 4. Reactivate later
curl -X POST http://localhost:5001/api/user/agents/abc-123/deploy \
  -H "X-User-Email: customer@example.com"

# Agent is ACTIVE again

# 5. Customer decides to delete permanently
curl -X DELETE http://localhost:5001/api/user/agents/abc-123 \
  -H "X-User-Email: customer@example.com"

# ✅ Agent deleted (soft delete, isActive = false)
# ✅ Phone +17678189187 returned to inventory (status = 'available')
# ✅ Magnus DID destination cleared (destination = '')
# ✅ Customer can assign +17678189187 to another agent
```

---

## 6. Database Changes

### Phone Number Unassignment on Deletion

```python
# Before deletion
phone.status = 'assigned'
phone.assigned_to_agent_id = 'abc-123'
phone.assigned_at = '2025-11-19T00:00:00'

# After deletion
phone.status = 'available'
phone.assigned_to_agent_id = None
phone.assigned_at = None
```

### Agent Soft Delete

```python
# Agent is NOT removed from database
agent.isActive = False  # Marked as deleted
# All other fields remain for historical/billing purposes
```

---

## 7. Files Modified

1. **`/opt/livekit1/user_dashboard.py`** (lines 1138-1226)
   - Added phone number unassignment logic to delete_agent()
   - Returns numbers to inventory with status='available'
   - Clears Magnus DID routing

2. **`/opt/livekit1/magnus_billing_client_new.py`** (lines 368-421)
   - Added `clear_did_destination()` method
   - Unsets DID routing in Magnus (destination='', voip_call=0)

---

## 8. Testing

### Test Agent Deletion
```bash
# Create test agent with phone number
AGENT_ID=$(curl -X POST http://localhost:5001/api/user/agents \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@example.com" \
  -d '{"name":"Delete Test","instructions":"Test"}' | jq -r '.data.id')

# Get assigned phone number
PHONE=$(curl -s http://localhost:5001/api/user/agents \
  -H "X-User-Email: test@example.com" | jq -r ".data[] | select(.id==\"$AGENT_ID\") | .did_number")

echo "Agent ID: $AGENT_ID"
echo "Phone: $PHONE"

# Delete agent
curl -X DELETE http://localhost:5001/api/user/agents/$AGENT_ID \
  -H "X-User-Email: test@example.com"

# Verify phone is back in inventory
curl -s http://localhost:5001/api/user/phone-numbers \
  -H "X-User-Email: test@example.com" | jq ".data[] | select(.phone_number==\"+$PHONE\")"

# Should show: "status": "available", "assigned_to_agent_id": null
```

---

## 9. Summary

✅ **Delete Agent** → Phone numbers returned to customer inventory, Magnus DID cleared  
✅ **Activate Agent** → Agent starts handling calls  
✅ **Deactivate Agent** → Agent stops handling calls (can be reactivated)  
✅ **Phone Numbers** → Remain in customer account, can be reassigned to other agents

Date: 2025-11-19  
Status: Implemented & Ready for Testing
