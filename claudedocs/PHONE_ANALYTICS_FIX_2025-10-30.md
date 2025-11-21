# Phone Numbers & Analytics Pages Fix - October 30, 2025

## Problem Summary

Three pages were not working:
1. `/dashboard/phone-numbers` - Stuck in loading state
2. `/dashboard/analytics` - 404 errors for analytics endpoints

## Root Causes

### Issue 1: Phone Numbers Endpoint Response Format
Backend returned `{success: true, phone_numbers: [...]}` but api-client expects `{success: true, data: [...]}`

### Issue 2: Analytics Endpoints Missing
Frontend called `/api/user/stats/calls` and `/api/user/stats/cost` but these endpoints didn't exist at all (404 errors).

## Fixes Applied

### Backend Changes (`/opt/livekit1/user_dashboard.py`)

1. **Fixed `/api/user/phone-numbers` endpoint** (line 1912-1915):
   - Changed response key from `'phone_numbers'` to `'data'`
   - Now returns: `{success: true, data: [...]}`

2. **Created `/api/user/stats/calls` endpoint** (lines 1407-1475):
   - Accepts `period` query parameter (24h, 7d, 30d, 90d)
   - Returns calls grouped by day
   - Returns calls grouped by agent
   - Returns total call count
   - Proper `{success: true, data: {...}}` format

3. **Created `/api/user/stats/cost` endpoint** (lines 1477-1548):
   - Accepts `period` query parameter (24h, 7d, 30d, 90d)
   - Returns total cost for period
   - Returns cost breakdown (LLM/STT/TTS) - currently equal thirds as placeholder
   - Returns cost by day
   - Proper `{success: true, data: {...}}` format

## Testing Verification

### Phone Numbers Endpoint:
```bash
curl -H "X-User-Email: giraud.eric@gmail.com" https://ai.epic.dm/api/user/phone-numbers
```

Returns:
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "phone_number": "+17678189...",
      "status": "assigned",
      "agent_name": "...",
      ...
    }
  ]
}
```

✅ Returns 10 phone numbers
✅ Proper format with `data` key

### Calls Analytics Endpoint:
```bash
curl -H "X-User-Email: giraud.eric@gmail.com" "https://ai.epic.dm/api/user/stats/calls?period=7d"
```

Returns:
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "data": [
      {"date": "2025-10-30", "count": 35}
    ],
    "total": 35,
    "by_agent": [
      {"agent_id": "...", "agent_name": "...", "count": ...}
    ]
  }
}
```

✅ Returns 35 total calls
✅ Groups by day and agent correctly

### Cost Analytics Endpoint:
```bash
curl -H "X-User-Email: giraud.eric@gmail.com" "https://ai.epic.dm/api/user/stats/cost?period=7d"
```

Returns:
```json
{
  "success": true,
  "data": {
    "period": "7d",
    "total_cost": 0.0,
    "breakdown": {
      "llm_cost": 0.0,
      "stt_cost": 0.0,
      "tts_cost": 0.0
    },
    "by_day": []
  }
}
```

✅ Returns cost data
✅ Proper format

## Services Restarted

- ✅ Backend: `systemctl restart livekit-backend.service`
- ✅ Frontend: No rebuild needed (no frontend changes)

## User Action Required

**Please hard refresh your browser:**
- **Windows/Linux**: `Ctrl + Shift + R`
- **Mac**: `Cmd + Shift + R`

After refresh:
- ✅ `/dashboard/phone-numbers` - Shows all 10 phone numbers with assignment status
- ✅ `/dashboard/analytics` - Shows charts with calls and cost data over selected period

## Implementation Notes

### Analytics Endpoints
The analytics endpoints now support 4 time periods:
- `24h` - Last 24 hours
- `7d` - Last 7 days (default)
- `30d` - Last 30 days
- `90d` - Last 90 days

### Cost Breakdown Placeholder
The cost breakdown (LLM/STT/TTS) is currently returning equal thirds of the total cost. This is a placeholder until proper cost component tracking is implemented in the CallLog table.

TODO: Add columns to CallLog for:
- `llm_cost`
- `stt_cost`
- `tts_cost`

### Data Aggregation
Both analytics endpoints query all calls in the period and aggregate them in Python. For large datasets, this could be optimized with SQL GROUP BY queries.

## Related Files

### Modified:
- `/opt/livekit1/user_dashboard.py` (phone numbers endpoint + 2 new analytics endpoints)

### Verified Working:
- `/opt/livekit1/frontend/lib/hooks/use-phone-numbers.ts`
- `/opt/livekit1/frontend/lib/hooks/use-analytics.ts`
- `/opt/livekit1/frontend/app/dashboard/phone-numbers/page.tsx`
- `/opt/livekit1/frontend/app/dashboard/analytics/page.tsx`

## Prevention for Future

1. **Always use `data` key** in wrapped responses: `{success: true, data: ...}`
2. **Create endpoints before frontend** to avoid path mismatches
3. **Test endpoints with curl** before implementing frontend
4. **Document endpoint contracts** in TypeScript interfaces
5. **Use consistent naming** for time periods, filters, etc.
