# LiveKit Stats Display Code - Reference

**Date**: 2025-11-19

---

## Where LiveKit Stats Were Displayed

The LiveKit-related stats (runtime, worker uptime, status, etc.) were shown in the **AgentListItem** component, which is different from the current **AgentInsightCard** component.

---

## The Code That Added LiveKit Stats

### File: `/opt/livekit1/frontend/components/agents/agent-list-item.tsx`

This component displays an **accordion section** that shows when an agent is DEPLOYED/RUNNING.

### Key Interface (Lines 19-30):

```typescript
interface AgentLiveKitInfo {
  configId?: string;
  architecture?: string;
  workerName?: string;
  status?: string;
  loadingMethod?: string;
  url?: string;
  protocol?: number;
  workerUptime?: string;      // ← THIS IS THE RUNTIME YOU MENTIONED
  lastUpdated?: string;
  description?: string;
}
```

### Fetching Logic (Lines 53-73):

```typescript
/**
 * Fetch LiveKit agent details
 */
useEffect(() => {
  if (agent.status === AgentStatus.DEPLOYED) {
    fetchLiveKitInfo();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveKitInfo, 30000);
    return () => clearInterval(interval);
  }
}, [agent.status, agent.id]);

const fetchLiveKitInfo = async () => {
  setIsLoadingInfo(true);
  try {
    const response = await api.get<AgentLiveKitInfo>(`/api/user/agents/${agent.id}/livekit-info`);
    setLiveKitInfo(response);
  } catch (error) {
    // Silent fail - info is optional
    console.error('Failed to fetch LiveKit info:', error);
  } finally {
    setIsLoadingInfo(false);
  }
};
```

**What it does**:
- When agent status is DEPLOYED, fetches LiveKit info from API
- Refreshes every 30 seconds to keep data current
- Calls: `GET /api/user/agents/${agentId}/livekit-info`

### Display UI (Lines 277-395):

The LiveKit stats appear in an **Accordion** that expands to show:

#### 1. Architecture Info (Lines 296-305)
```typescript
<div className="bg-primary-50 dark:bg-primary-950 border border-primary-200 dark:border-primary-800 rounded-lg p-3">
  <div className="flex items-center gap-2 mb-2">
    <Server size={16} className="text-primary" />
    <span className="font-semibold text-primary">Dynamic Routing Architecture</span>
  </div>
  <p className="text-gray-600 dark:text-gray-400 text-xs">
    {liveKitInfo.description || 'Configuration loaded by shared tst0002 agent'}
  </p>
</div>
```

#### 2. Worker & Status (Lines 307-328)
```typescript
<div className="grid grid-cols-2 gap-3">
  <div className="flex items-start gap-2">
    <Zap size={14} className="text-success mt-0.5 flex-shrink-0" />
    <div>
      <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">LiveKit Worker</div>
      <div className="text-gray-700 dark:text-gray-200 font-mono text-xs">
        {liveKitInfo.workerName || 'tst0002'}
      </div>
    </div>
  </div>

  <div className="flex items-start gap-2">
    <Activity size={14} className="text-success mt-0.5 flex-shrink-0" />
    <div>
      <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Status</div>
      <div className="text-gray-700 dark:text-gray-200">
        {liveKitInfo.status || 'Active'}
      </div>
    </div>
  </div>
</div>
```

#### 3. Config ID & Worker Uptime (Lines 330-353) ← THE RUNTIME INFO
```typescript
<div className="grid grid-cols-2 gap-3">
  {liveKitInfo.configId && (
    <div className="flex items-start gap-2">
      <FileText size={14} className="text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Config ID</div>
        <div className="text-gray-700 dark:text-gray-200 font-mono text-[10px] truncate">
          {liveKitInfo.configId.slice(0, 8)}...
        </div>
      </div>
    </div>
  )}

  {liveKitInfo.workerUptime && (
    <div className="flex items-start gap-2">
      <Clock size={14} className="text-success mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Worker Uptime</div>
        <div className="text-gray-700 dark:text-gray-200">{liveKitInfo.workerUptime}</div>
      </div>
    </div>
  )}
</div>
```

**This displays**:
- **Config ID** - The agent configuration ID (truncated)
- **Worker Uptime** - How long the LiveKit worker has been running ← **THIS IS THE RUNTIME**

#### 4. Protocol & Loading Method (Lines 355-378)
```typescript
<div className="grid grid-cols-2 gap-3">
  {liveKitInfo.protocol && (
    <div className="flex items-start gap-2">
      <Server size={14} className="text-secondary mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Protocol</div>
        <div className="text-gray-700 dark:text-gray-200">v{liveKitInfo.protocol}</div>
      </div>
    </div>
  )}

  {liveKitInfo.loadingMethod && (
    <div className="flex items-start gap-2">
      <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-gray-500 dark:text-gray-400 font-medium mb-0.5">Loading</div>
        <div className="text-gray-700 dark:text-gray-200 text-[10px]">
          {liveKitInfo.loadingMethod}
        </div>
      </div>
    </div>
  )}
</div>
```

#### 5. Cloud URL (Lines 380-386)
```typescript
{liveKitInfo.url && (
  <div className="pt-2 border-t dark:border-gray-700">
    <div className="text-gray-500 dark:text-gray-400 font-medium mb-1">LiveKit Cloud URL</div>
    <Code size="sm" className="break-all text-[10px]">{liveKitInfo.url}</Code>
  </div>
)}
```

---

## API Endpoint

### Frontend API Route
**File**: `/opt/livekit1/frontend/app/api/user/agents/[id]/livekit-info/route.ts`

Proxies request to backend:
```typescript
GET /api/user/agents/${agentId}/livekit-info
```

Forwards to:
```typescript
${BACKEND_URL}/api/user/agents/${agentId}/livekit-info
```

### Backend Endpoint
**Status**: The backend endpoint appears to **NOT be implemented** or returns minimal data.

When I searched the backend, I did not find a route handler for `/api/user/agents/<id>/livekit-info`.

This means either:
1. The endpoint was removed
2. The endpoint returns empty/mock data
3. The component gracefully handles missing data

---

## What Was Displayed

When an agent was **DEPLOYED/RUNNING**, the tile showed an expandable accordion with:

1. ✅ **Dynamic Routing Architecture** - Description text
2. ✅ **LiveKit Worker** - Worker name (e.g., "tst0002")
3. ✅ **Status** - "Active" or similar
4. ✅ **Config ID** - Agent configuration ID
5. ✅ **Worker Uptime** - How long worker has been running ← **YOUR "RUNTIME"**
6. ✅ **Protocol** - LiveKit protocol version
7. ✅ **Loading Method** - How config is loaded
8. ✅ **Cloud URL** - LiveKit cloud URL

---

## Current vs Old Component

### Old Component (AgentListItem)
- Used HeroUI Card with Accordion
- Fetched LiveKit info when agent deployed
- Showed LiveKit stats in expandable section
- **File**: `components/agents/agent-list-item.tsx`

### Current Component (AgentInsightCard)
- Rich card with metrics, hover expansion, toolbar
- Shows call metrics (calls today, success rate, avg duration)
- **Does NOT fetch or show LiveKit runtime info**
- **File**: `components/agents/AgentInsightCard.tsx`

---

## To Restore LiveKit Stats Display

You would need to either:

### Option 1: Add to AgentInsightCard
Add LiveKit info fetching and display to the current AgentInsightCard component.

### Option 2: Combine Both Components
Use AgentInsightCard for call metrics + AgentListItem-style accordion for LiveKit stats.

### Option 3: Add to Inspector Drawer
Show LiveKit stats in the AgentInspector drawer instead of on the card.

### Option 4: Implement Backend Endpoint
Create the missing `/api/user/agents/<id>/livekit-info` backend endpoint to return:
- workerName
- workerUptime
- status
- configId
- protocol
- loadingMethod
- url

---

## Summary

**The code that displayed LiveKit stats**: `components/agents/agent-list-item.tsx` (lines 277-395)

**What it showed**: Worker name, worker uptime (runtime), status, config ID, protocol, loading method, cloud URL

**Why it's missing now**: Current agents page uses `AgentInsightCard` instead of `AgentListItem`, and `AgentInsightCard` doesn't fetch or display LiveKit info.

**The "runtime" you mentioned**: This was the **workerUptime** field from the LiveKit info API response.

---

**Created**: 2025-11-19
**Purpose**: Reference document showing exactly where LiveKit stats (runtime, agents, etc.) were displayed
