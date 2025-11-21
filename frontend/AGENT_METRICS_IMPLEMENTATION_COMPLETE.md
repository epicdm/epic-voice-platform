# Agent Metrics Implementation - COMPLETE

**Date**: 2025-11-19
**Status**: ✅ DEPLOYED AND READY FOR TESTING

---

## What Was Done

### Problem
Agent cards were showing placeholder zeros for all metrics:
- 0 calls today
- 0% success rate
- 0:00 average duration
- No "Last call: X ago" line (because undefined)
- 0 active calls
- 0 total calls

User reported: "tile is good,, but missing the addded info for the active agents,, run time, agetns etc,, that was there beore"

---

## Solution Implemented

### 1. Backend Changes ✅

**File**: `/opt/livekit1/backend/realtime_dashboard/metrics.py`

Modified `get_agent_performance()` function to:
- Added `func.max(CallLog.startedAt).label('last_call_at')` to query
- Added active calls count per agent
- Return structure now includes:
  ```python
  {
    'agentConfigId': 123,
    'total_calls': 50,
    'average_duration': 45.5,  # seconds
    'success_rate': 85.2,      # percentage
    'completed_calls': 42,
    'last_call_at': '2025-11-19T14:30:00Z',  # ISO timestamp
    'active_calls': 2          # current active calls
  }
  ```

**Service**: Backend restarted and active ✅

---

### 2. Frontend Hook Created ✅

**File**: `/opt/livekit1/frontend/lib/hooks/use-agent-metrics.ts` (NEW)

Created `useAgentMetrics()` hook that:
- Fetches data from `/api/dashboard/agent-performance?hours=24`
- Transforms backend format to AgentInsightCard format
- Returns metrics as a map: `Record<agentId, AgentMetrics>`
- Includes loading and error states
- Auto-refreshes when hours parameter changes

**Transformation logic**:
```typescript
{
  callsToday: total_calls,              // ← from backend
  successRate: Math.round(success_rate), // ← from backend (rounded)
  avgDuration: "MM:SS",                  // ← formatted from average_duration seconds
  lastCallAt: new Date(last_call_at),    // ← parsed to Date object
  activeCalls: active_calls,             // ← from backend
  totalCalls: total_calls,               // ← from backend
}
```

---

### 3. Agents Page Updated ✅

**File**: `/opt/livekit1/frontend/app/dashboard/agents/page.tsx`

Changes:
1. Import `useAgentMetrics` hook
2. Call hook: `const { metrics: agentMetrics } = useAgentMetrics(24)`
3. Pass real metrics to cards: `metrics={agentMetrics[agent.id] || defaultMetrics}`

**Before**:
```typescript
metrics={{
  callsToday: 0, // TODO: Fetch from API
  successRate: 0,
  avgDuration: "0:00",
  lastCallAt: undefined,
  activeCalls: 0,
  totalCalls: 0,
}}
```

**After**:
```typescript
metrics={agentMetrics[agent.id] || {
  callsToday: 0,
  successRate: 0,
  avgDuration: "0:00",
  lastCallAt: undefined,
  activeCalls: 0,
  totalCalls: 0,
}}
```

Now uses REAL data from API, falls back to zeros only if agent has no calls yet.

---

## What You Should See Now

### Agent Cards Will Display

For agents WITH calls in the last 24 hours:
- **X TODAY** - Actual number of calls today (not zero)
- **X% SUCCESS** - Real success rate based on completed vs total calls
- **M:SS AVG CALL** - Real average call duration
- **X active** - Current active calls count (if any)
- **Last call: X minutes ago** - Shows when last call happened ✨ (THIS WAS MISSING!)

For agents WITHOUT calls:
- Still shows zeros (expected behavior)
- No "Last call" line (expected - never had a call)

### When Hovering
- **Total Calls** - Shows real count (not zero if agent has calls)
- All other hover info (Language, Turn Detection, Temperature) - unchanged

---

## Technical Details

### API Flow

1. **Frontend calls**: `GET /api/dashboard/agent-performance?hours=24`
2. **Next.js proxies to**: `GET ${BACKEND_URL}/api/dashboard/agent-performance?user_id=${userId}&hours=24`
3. **Backend queries**: CallLog table, grouped by agentConfigId
4. **Backend calculates**:
   - Total calls in time period
   - Average duration (in seconds)
   - Success rate (completed / total * 100)
   - Last call timestamp (MAX(startedAt))
   - Active calls count
5. **Frontend transforms**: Seconds → "MM:SS", timestamp → Date object
6. **Component displays**: Real metrics on cards

### Performance Considerations

- Metrics fetch runs in parallel with agents fetch
- Metrics are cached in React state (no re-fetch on every render)
- Backend query is optimized with grouping/aggregation
- Falls back gracefully if API fails (shows zeros)

---

## Testing Checklist

After hard refresh (Ctrl+Shift+R or Cmd+Shift+R):

- [ ] Agent cards show real numbers (not all zeros) for agents with calls
- [ ] "Last call: X ago" line appears for agents that had calls
- [ ] Active calls count shows correctly (if any active)
- [ ] Success rate percentage displays correctly
- [ ] Average call duration shows real time (not 0:00)
- [ ] Hover expansion shows real "Total Calls" count
- [ ] Cards for agents without calls still show zeros (expected)
- [ ] No console errors related to metrics

---

## Files Changed

1. `/opt/livekit1/backend/realtime_dashboard/metrics.py` - Backend metrics calculation
2. `/opt/livekit1/frontend/lib/hooks/use-agent-metrics.ts` - NEW hook for fetching metrics
3. `/opt/livekit1/frontend/app/dashboard/agents/page.tsx` - Use real metrics instead of placeholders

---

## Services Restarted

- ✅ livekit-backend.service (restarted)
- ✅ livekit-frontend.service (restarted)
- ✅ apache2 (restarted)
- ✅ Frontend build completed
- ✅ All services active

---

## Next Steps for User

1. **Hard refresh browser** - Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
2. **Check agent cards** - Should show real metrics now
3. **Look for "Last call" line** - Should appear for agents with recent calls
4. **Test with an agent that has calls** - Make a test call and verify metrics update

---

## Known Behaviors

### Time Period
- Metrics show **last 24 hours** by default
- Can be changed by modifying `useAgentMetrics(24)` to different hours

### Agents Without Calls
- Will still show zeros (no data to aggregate)
- This is EXPECTED and CORRECT

### "Last call" Line
- Only shows if `lastCallAt` has a value
- Will NOT show if agent never had a call
- Shows relative time (e.g., "5 minutes ago", "2 hours ago")

### Active Calls Count
- Shows current active calls right now
- Updates in real-time as calls start/end (on page refresh)

---

## Troubleshooting

### If metrics still show zeros:

1. **Check if agent actually has calls**:
   ```sql
   SELECT COUNT(*) FROM call_logs
   WHERE agent_config_id = <agent_id>
   AND started_at >= NOW() - INTERVAL '24 hours';
   ```

2. **Check API response**:
   - Open DevTools → Network
   - Find request to `/api/dashboard/agent-performance`
   - Check response data

3. **Check backend logs**:
   ```bash
   journalctl -u livekit-backend.service -n 100 --no-pager | grep -i "agent performance\|metrics"
   ```

4. **Verify user ID**:
   - Metrics are filtered by user_id
   - Make sure calls in database have correct userId

---

## Summary

**What was broken**: Metrics showing placeholder zeros, missing "Last call" info

**What was fixed**:
- Backend now calculates and returns real metrics per agent
- Frontend fetches and displays real metrics
- "Last call: X ago" line now appears for agents with calls
- Active calls count displays correctly

**Result**: Agent cards now show **REAL DATA** instead of placeholder zeros! ✅

---

**Deployment Time**: 2025-11-19
**Build Status**: ✅ SUCCESS
**Service Status**: ✅ ALL ACTIVE
**Ready for Testing**: ✅ YES - Please hard refresh browser

---

Created by: Claude Code
Issue Resolved: Missing agent metrics and runtime info on tiles
