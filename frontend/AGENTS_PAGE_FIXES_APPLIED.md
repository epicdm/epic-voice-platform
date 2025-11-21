# Agents Page - Fixes Applied (2025-11-19)

## Issues Fixed

### 1. ✅ Drawer Transparency Issue - FIXED

**Problem**: The inspector drawer had a transparent background, making the description text hard to read because you could see the blurred agent cards behind it.

**Root Cause**:
- Drawer was using `bg-card` (semi-transparent background)
- Description box was using `bg-card/80` (80% opacity)
- Both allowed content from behind to show through

**Solution Applied**:
- Changed drawer background from `bg-card` to `bg-background` (fully opaque)
- Changed description box from `bg-card/80` to `bg-muted` (fully opaque)
- Changed border from `border-border/60` to `border-border` (more solid)

**Files Changed**:
1. `/opt/livekit1/frontend/components/layout/InspectorDrawer.tsx` (line 106)
2. `/opt/livekit1/frontend/components/agents/AgentInsightCard.tsx` (line 187)

---

### 2. ⚠️ Missing Card Details - PARTIALLY IDENTIFIED

**What You're Seeing**:
The agent cards currently show:
- ✅ Status badge (Running/Created)
- ✅ Active calls indicator ("0 active")
- ✅ Agent name with icon
- ✅ Voice provider badge (OpenAI • alloy)
- ✅ Model badge (GPT-4o)
- ✅ Metrics: "0 TODAY", "0% SUCCESS", "0:00 AVG CALL"
- ✅ Phone number with copy button
- ✅ Test Call button
- ✅ Hover expansion (Language, Turn Detection, Total Calls, Temperature)
- ✅ Hover toolbar (Stop/Edit/Delete buttons)

**What's Missing** (according to original spec):
- ❌ **"Last call: X minutes ago"** - This is NOT showing because we're passing `lastCallAt: undefined`

**Why It's Missing**:
Currently in `/opt/livekit1/frontend/app/dashboard/agents/page.tsx` (lines 395-402), we're passing placeholder data:

```typescript
metrics={{
  callsToday: 0, // TODO: Fetch from API
  successRate: 0,
  avgDuration: "0:00",
  lastCallAt: undefined, // ← This is why "Last call" doesn't show
  activeCalls: 0,
  totalCalls: 0,
}}
```

The AgentInsightCard component WILL display "Last call: X minutes ago" if `metrics.lastCallAt` is provided (line 594 of AgentInsightCard.tsx), but we're not providing it.

---

## What Was There Before vs Now

### Before (Original Working Version):
The cards showed **real metrics data**:
- Actual number of calls today
- Actual success rate percentage
- Actual average call duration
- **"Last call: 5 minutes ago"** (or similar)
- Actual active calls count
- Actual total calls count

### Now (Current Version):
The cards show **placeholder zeros**:
- 0 calls today
- 0% success rate
- 0:00 average duration
- **No "Last call" line** (because undefined)
- 0 active calls
- 0 total calls

---

## To Fix the Missing Details

You need to fetch real metrics data for each agent. Here are the options:

### Option 1: Fetch from Agent object (if data exists)
If the `Agent` type already has these fields, use them:

```typescript
metrics={{
  callsToday: agent.calls_today || 0,
  successRate: agent.success_rate || 0,
  avgDuration: agent.avg_duration || "0:00",
  lastCallAt: agent.last_call_at || undefined, // This will show "Last call: X ago"
  activeCalls: agent.active_calls || 0,
  totalCalls: agent.total_calls || 0,
}}
```

### Option 2: Fetch from API endpoint
Create an API endpoint that returns metrics for all agents:

```typescript
// In the component
const { agents } = useAgents();
const [agentMetrics, setAgentMetrics] = useState<Record<number, AgentMetrics>>({});

useEffect(() => {
  const fetchMetrics = async () => {
    const metrics = await api.get('/api/user/agents/metrics');
    setAgentMetrics(metrics);
  };
  fetchMetrics();
}, [agents]);

// Then in the render:
<AgentInsightCard
  agent={agent}
  metrics={agentMetrics[agent.id] || defaultMetrics}
  // ...
/>
```

### Option 3: Fetch per agent (less efficient)
```typescript
const handleAgentSelect = async (agent: Agent) => {
  const metrics = await api.get(`/api/user/agents/${agent.id}/metrics`);
  // Use metrics
};
```

---

## Summary of Current Status

### ✅ What's Fixed
1. **Drawer transparency** - Background is now fully opaque, text is readable
2. **Agent cards** - All UI elements are present and displaying
3. **Hover expansion** - Working correctly
4. **Hover toolbar** - Working correctly
5. **Click-to-inspect** - Opens drawer correctly

### ⚠️ What's Still Placeholder Data
1. **Metrics are all zeros** - Need to fetch real data
2. **"Last call" line missing** - Because `lastCallAt` is undefined

### 📋 Next Steps

To restore the "missing details":
1. Determine where metrics data comes from (Agent model? Separate API?)
2. Fetch real metrics data
3. Pass `lastCallAt` with actual timestamp to show "Last call: X ago"
4. Pass real values for callsToday, successRate, avgDuration, activeCalls, totalCalls

---

## Testing

After service restart, verify:
1. ✅ Drawer background is solid (not transparent)
2. ✅ Description text is readable (no blurred cards showing through)
3. ⚠️ Cards still show "0 TODAY, 0% SUCCESS, 0:00 AVG CALL" (expected until metrics API is connected)
4. ⚠️ "Last call" line still missing (expected until lastCallAt is provided)

---

**Build completed**: 2025-11-19
**Service restarted**: Yes
**Ready for testing**: Yes
**Requires metrics API**: To show real data instead of zeros
