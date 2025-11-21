# Deploy/Undeploy Button Implementation - COMPLETE

## Summary

Successfully implemented activate (deploy) and deactivate (undeploy) buttons for AI agents in the frontend dashboard.

**Date**: 2025-11-19
**Status**: ✅ Complete & Deployed

---

## What Was Implemented

### 1. ✅ Backend Endpoints (Already Existed)

The backend already had the necessary endpoints:
- `POST /api/user/agents/{id}/deploy` - Activate agent (set status to 'deployed')
- `POST /api/user/agents/{id}/undeploy` - Deactivate agent (set status to 'created')

Location: `/opt/livekit1/user_dashboard.py`

### 2. ✅ Frontend Handlers (Added)

Added deploy/undeploy handlers to the main agents page:

**File**: `/opt/livekit1/frontend/app/dashboard/agents/page.tsx` (lines 214-264)

```typescript
/**
 * Handle agent deployment (activate)
 */
const handleDeployAgent = async (agent: Agent) => {
  try {
    const response = await fetch(`/api/user/agents/${agent.id}/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to activate agent');
    }

    // Refresh the agent list
    refetch();
  } catch (error) {
    console.error('Error activating agent:', error);
    alert(`Failed to activate agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Handle agent undeployment (deactivate)
 */
const handleUndeployAgent = async (agent: Agent) => {
  try {
    const response = await fetch(`/api/user/agents/${agent.id}/undeploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to deactivate agent');
    }

    // Refresh the agent list
    refetch();
  } catch (error) {
    console.error('Error deactivating agent:', error);
    alert(`Failed to deactivate agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
```

### 3. ✅ AgentGrid Component (Updated)

**File**: `/opt/livekit1/frontend/components/agents/AgentGrid.tsx`

**Changes Made**:
1. Added props to interface:
   ```typescript
   /** Deploy handler (activate agent) */
   onDeploy?: (agent: Agent) => void
   /** Undeploy handler (deactivate agent) */
   onUndeploy?: (agent: Agent) => void
   ```

2. Added parameters to function:
   ```typescript
   export function AgentGrid({
     // ... existing params
     onDeploy,
     onUndeploy,
     // ...
   }: AgentGridProps)
   ```

3. Passed props to AgentInsightCard:
   ```typescript
   <AgentInsightCard
     // ... existing props
     onStart={onDeploy}    // Maps deploy to start
     onStop={onUndeploy}   // Maps undeploy to stop
   />
   ```

### 4. ✅ AgentInsightCard Component (Already Implemented!)

**File**: `/opt/livekit1/frontend/components/agents/AgentInsightCard.tsx`

The AgentInsightCard component already had full support for start/stop actions:
- Start/Stop buttons in hover toolbar (desktop)
- Start/Stop buttons in mobile view
- Conditional rendering based on agent status
- Loading states during action execution
- Confirmation dialog for stop action

**Key Features**:
- **Desktop**: Hover toolbar shows Play (▶) button for inactive agents, Square (⏹) button for active agents
- **Mobile**: Dedicated buttons at bottom of card
- **Status-Based**: Buttons only appear when action is valid for current status
- **Confirmation**: Stop action requires user confirmation to prevent accidental deactivation
- **Loading States**: Shows spinner during API call

---

## How It Works

### Agent Status Flow

```
created → (deploy) → deployed → (undeploy) → created
   ↓                                            ↓
(delete)                                    (delete)
   ↓                                            ↓
inactive (soft deleted)              inactive (soft deleted)
```

### Button Visibility Logic

| Agent Status | Start Button | Stop Button |
|-------------|--------------|-------------|
| `created` | ✅ Show | ❌ Hide |
| `deployed` | ❌ Hide | ✅ Show |
| `active` | ❌ Hide | ✅ Show |
| `deploying` | ❌ Hide | ❌ Hide |
| `undeploying` | ❌ Hide | ❌ Hide |
| `failed` | ✅ Show | ❌ Hide |
| `inactive` | ❌ Hide | ❌ Hide |

### User Experience

**Activate Agent (Deploy)**:
1. User hovers over agent card with status = 'created'
2. Toolbar appears with green Play (▶) button
3. User clicks Play button
4. Button shows spinner during API call
5. Agent status changes to 'deployed'
6. Button disappears, replaced by Stop (⏹) button
7. Agent is now active and handling calls

**Deactivate Agent (Undeploy)**:
1. User hovers over agent card with status = 'deployed'
2. Toolbar appears with orange Square (⏹) button
3. User clicks Stop button
4. Confirmation dialog appears: "Stop Agent? Are you sure..."
5. User confirms
6. Button shows spinner during API call
7. Agent status changes to 'created'
8. Button disappears, replaced by Play (▶) button
9. Agent stops handling calls but remains in system

---

## Files Modified

### Frontend Files

1. **`/opt/livekit1/frontend/app/dashboard/agents/page.tsx`**
   - Lines 214-264: Added `handleDeployAgent` and `handleUndeployAgent` functions
   - Lines 566-567: Passed handlers to AgentGrid component

2. **`/opt/livekit1/frontend/components/agents/AgentGrid.tsx`**
   - Lines 29-32: Added `onDeploy` and `onUndeploy` props to interface
   - Lines 81-82: Added parameters to function signature
   - Lines 115-116: Passed props to AgentInsightCard as `onStart` and `onStop`

3. **`/opt/livekit1/frontend/components/agents/AgentInsightCard.tsx`**
   - No changes needed - already had full implementation
   - Lines 50-51: `onStart` and `onStop` props already defined
   - Lines 368-399: Start/Stop buttons in desktop toolbar
   - Lines 654-681: Start/Stop buttons in mobile view
   - Lines 257-284: Handler functions for start/stop actions

---

## Backend Integration

### Deploy Endpoint

**Request**:
```bash
POST /api/user/agents/{agent_id}/deploy
Headers:
  X-User-Email: user@example.com
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

### Undeploy Endpoint

**Request**:
```bash
POST /api/user/agents/{agent_id}/undeploy
Headers:
  X-User-Email: user@example.com
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

---

## Testing Guide

### Manual Testing

1. **Activate Agent**:
   ```bash
   # Navigate to http://ai.epic.dm/dashboard/agents
   # Find an agent with status "Created"
   # Hover over the agent card
   # Click the green Play (▶) button in the toolbar
   # Verify status changes to "Running"
   ```

2. **Deactivate Agent**:
   ```bash
   # Find an agent with status "Running"
   # Hover over the agent card
   # Click the orange Square (⏹) button in the toolbar
   # Confirm in the dialog
   # Verify status changes back to "Created"
   ```

3. **Mobile Testing**:
   ```bash
   # Resize browser to mobile width (< 640px)
   # Buttons should appear at bottom of card instead of toolbar
   # Test activate/deactivate from mobile buttons
   ```

### API Testing

```bash
# Get agent ID
AGENT_ID="your-agent-id"
USER_EMAIL="test@example.com"

# Deploy agent
curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/deploy \
  -H "X-User-Email: $USER_EMAIL"

# Verify status = 'deployed'
curl -s http://localhost:5001/api/user/agents \
  -H "X-User-Email: $USER_EMAIL" | jq ".data[] | select(.id==\"$AGENT_ID\")"

# Undeploy agent
curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/undeploy \
  -H "X-User-Email: $USER_EMAIL"

# Verify status = 'created'
curl -s http://localhost:5001/api/user/agents \
  -H "X-User-Email: $USER_EMAIL" | jq ".data[] | select(.id==\"$AGENT_ID\")"
```

---

## Deployment

### Frontend Deployment

1. Build completed successfully
2. Next.js server restarted
3. Changes live at: http://ai.epic.dm:3000/dashboard/agents

### Verification

```bash
# Check Next.js is running
ps aux | grep next

# Expected output:
# root  1174101  next-server (v15.5.6)

# Check build artifacts
ls -la /opt/livekit1/frontend/.next/

# Verify components are built
ls -la /opt/livekit1/frontend/.next/server/app/dashboard/agents/
```

---

## UI/UX Features

### Desktop Experience
- Hover toolbar with icon-only buttons
- Green Play button for activation
- Orange Square button for deactivation
- Smooth fade-in animation when hovering
- Loading spinner during API calls

### Mobile Experience
- Dedicated button row at card bottom
- Larger touch targets
- Full-width buttons with labels
- Same color scheme (green/orange)

### Accessibility
- ARIA labels on all buttons
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliant

### Error Handling
- Network errors show alert dialog
- Failed API calls show error message
- Automatic retry not implemented (by design)
- User must manually retry failed actions

---

## Related Documentation

- **Agent Lifecycle Management**: `/opt/livekit1/AGENT_LIFECYCLE_MANAGEMENT.md`
- **Agent & Phone Management**: `/opt/livekit1/SUMMARY_AGENT_PHONE_MANAGEMENT.md`
- **Duplicate SIP Fix**: `/opt/livekit1/DUPLICATE_SIP_FIX_COMPLETE.md`

---

## Status

✅ **Implementation Complete**
✅ **Frontend Restarted**
✅ **Changes Deployed**
✅ **Ready for Testing**

Date: 2025-11-19
Next.js PID: 1174101
Build: /opt/livekit1/frontend/.next/
Live URL: http://ai.epic.dm:3000/dashboard/agents
