# Agent Component Comparison & Solution

**Date**: 2025-11-19

---

## Why The Change Was Made

### The Timeline

1. **Original**: Page used **AgentListItem** component
   - Simple card with basic info
   - Had LiveKit stats accordion (runtime, worker uptime, status, etc.)
   - Limited metrics and interaction

2. **Redesign** (Early November): Page was redesigned with new visual style
   - AgentListItem was replaced with something simpler
   - Lost click-to-view-details functionality
   - Lost inspector drawer
   - User reported: "Status tiles not accurate, missing click-to-view details"

3. **Fix** (Yesterday - Nov 19): I restored functionality
   - Replaced simple component with **AgentInsightCard**
   - Added back AgentInspector drawer
   - Fixed status tile accuracy
   - Added search and filtering
   - **But AgentInsightCard doesn't have LiveKit stats**

---

## Component Differences

### AgentListItem (Old Component)
**File**: `/opt/livekit1/frontend/components/agents/agent-list-item.tsx`

**Features**:
- ✅ Basic agent info (name, description, model, voice)
- ✅ Status badge with colors
- ✅ **LiveKit Stats Accordion** (when deployed):
  - Worker name (e.g., "tst0002")
  - **Worker uptime** (runtime)
  - Status (Active)
  - Config ID
  - Protocol version
  - Loading method
  - Cloud URL
  - Architecture description
- ✅ Deploy/Stop/Edit/Delete buttons
- ❌ No call metrics (calls today, success rate, etc.)
- ❌ No hover expansion
- ❌ No test call modal
- ❌ No click-to-inspect functionality

**Visual**: Simple card with HeroUI Accordion for LiveKit details

---

### AgentInsightCard (Current Component)
**File**: `/opt/livekit1/frontend/components/agents/AgentInsightCard.tsx`

**Features**:
- ✅ Rich agent info with status-based gradients
- ✅ Status badge with animation
- ✅ **Call Metrics**:
  - Calls today
  - Success rate
  - Average duration
  - Last call timestamp
  - Active calls count
  - Total calls
- ✅ Hover expansion showing:
  - Language
  - Turn Detection
  - Total Calls
  - Temperature
- ✅ Hover toolbar with quick actions
- ✅ Phone number with copy button
- ✅ Test Call modal
- ✅ Click-to-inspect (opens drawer)
- ✅ Voice and model badges
- ❌ **No LiveKit stats** (worker uptime, runtime, etc.)

**Visual**: Modern card with metrics, gradients, hover effects

---

## What's Missing

User wants: **"runtime, agents etc"** from the old component

Specifically, these fields from **AgentListItem's LiveKit accordion**:
- **Worker Uptime** (the "runtime" - how long the LiveKit worker has been running)
- Worker Name (e.g., "tst0002")
- Status (Active/Running)
- Config ID
- Protocol version
- Loading method
- Cloud URL
- Architecture description

---

## The Solution Options

### Option 1: Add LiveKit Stats to AgentInsightCard ✅ RECOMMENDED

**What**: Enhance AgentInsightCard to include LiveKit stats section

**How**:
1. Add LiveKit info fetching to AgentInsightCard (like AgentListItem does)
2. Add expandable section (accordion or toggle) below metrics
3. Display LiveKit stats when agent is DEPLOYED
4. Keep all existing features (metrics, hover, toolbar, etc.)

**Pros**:
- Single unified component
- User gets BOTH call metrics AND LiveKit stats
- Clean, organized display
- Best user experience

**Cons**:
- Larger component file
- More API calls per card

---

### Option 2: Show LiveKit Stats in Inspector Drawer

**What**: Add LiveKit stats tab or section in AgentInspector drawer

**How**:
1. Add "LiveKit Details" tab to inspector drawer
2. Fetch LiveKit info when drawer opens
3. Display all LiveKit stats in dedicated tab

**Pros**:
- Keeps cards lightweight
- LiveKit info available on demand
- Cleaner card design

**Cons**:
- Requires clicking card to see LiveKit stats
- Extra step to access info
- LiveKit info not immediately visible

---

### Option 3: Hybrid - Show Summary on Card, Details in Drawer

**What**: Show brief LiveKit status on card, full details in drawer

**How**:
1. Card shows: "Worker: tst0002 • Uptime: 2h 34m"
2. Drawer shows: Full LiveKit stats with all fields

**Pros**:
- Quick glance on card
- Full details available in drawer
- Balanced approach

**Cons**:
- Split information
- Duplicate API calls

---

### Option 4: Switch Back to AgentListItem

**What**: Revert to using AgentListItem instead of AgentInsightCard

**How**:
1. Replace AgentInsightCard with AgentListItem in agents page
2. Lose call metrics and modern features
3. Get LiveKit stats back

**Pros**:
- Simple revert
- LiveKit stats immediately available

**Cons**:
- ❌ Lose call metrics (calls today, success rate, avg duration, last call)
- ❌ Lose hover expansion
- ❌ Lose hover toolbar
- ❌ Lose test call modal
- ❌ Lose modern visual design
- ❌ NOT RECOMMENDED - would be a regression

---

## Recommended Approach

**Option 1**: Add LiveKit Stats Section to AgentInsightCard

### Implementation Plan

1. **Add LiveKit Info Interface** (already exists in AgentListItem):
```typescript
interface AgentLiveKitInfo {
  workerName?: string;
  workerUptime?: string;    // The "runtime"
  status?: string;
  configId?: string;
  protocol?: number;
  loadingMethod?: string;
  url?: string;
  architecture?: string;
  description?: string;
}
```

2. **Add Fetching Logic** to AgentInsightCard:
```typescript
useEffect(() => {
  if (agent.status === AgentStatus.DEPLOYED) {
    fetchLiveKitInfo();
    const interval = setInterval(fetchLiveKitInfo, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }
}, [agent.status, agent.id]);
```

3. **Add Expandable Section** below metrics:
- Show "LiveKit Details" button/accordion when agent deployed
- Expand to show all LiveKit stats
- Use same visual style as existing card
- Place between metrics and action buttons

4. **Display Fields**:
- Worker Name
- **Worker Uptime** (the runtime)
- Status
- Config ID (truncated)
- Protocol
- Loading Method
- Architecture description
- Cloud URL

### Result

User gets **everything**:
- ✅ Call metrics (calls today, success rate, avg duration, last call)
- ✅ LiveKit stats (worker uptime/runtime, status, config ID, etc.)
- ✅ Hover expansion
- ✅ Hover toolbar
- ✅ Test call modal
- ✅ Click-to-inspect drawer
- ✅ Modern visual design

---

## Next Steps

**User decides**: Which option to implement?

**Recommendation**: Option 1 - Add LiveKit stats to AgentInsightCard

This gives the most complete solution with all information in one place.

---

**Created**: 2025-11-19
**Purpose**: Explain component differences and solution options for restoring LiveKit stats
