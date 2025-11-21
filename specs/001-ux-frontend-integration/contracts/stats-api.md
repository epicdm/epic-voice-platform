# Stats & Analytics API Contract

**Related Requirements**: FR-API-010, FR-API-014

## GET /api/user/stats

**Purpose**: Fetch aggregated user statistics for dashboard

**Requirements**: FR-API-010

**Request**:
```http
GET /api/user/stats
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "total_agents": 5,
    "total_phone_numbers": 3,
    "total_calls_today": 127,
    "total_calls_month": 1843,
    "total_cost_today_usd": 12.45,
    "total_cost_month_usd": 387.92,
    "active_calls": 2
  }
}
```

**New User (Zero Data)** (200):
```json
{
  "success": true,
  "data": {
    "total_agents": 0,
    "total_phone_numbers": 0,
    "total_calls_today": 0,
    "total_calls_month": 0,
    "total_cost_today_usd": 0.00,
    "total_cost_month_usd": 0.00,
    "active_calls": 0
  }
}
```

**Frontend Behavior**:
- Show skeleton loaders for each stat card while loading (FR-UX-001)
- Animate skeleton loaders to indicate loading
- Replace skeletons with actual numbers when data arrives
- For new users with zero data:
  - Show "0" with helpful message: "Create your first agent to get started" (FR-API-010)
  - Display CTA button: "Create Agent"

**User Story**: User Story 3 (P2) - Dashboard Real-Time Data Display

**Expected Latency**: <500ms (database aggregation query)

---

## GET /api/user/stats/calls

**Purpose**: Fetch detailed call statistics for analytics page

**Requirements**: FR-API-014

**Request**:
```http
GET /api/user/stats/calls?period=7d
Authorization: Bearer <token>
```

**Query Parameters**:
- `period` (optional): `24h`, `7d`, `30d`, `90d` (default: `30d`)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "total_calls": 1843,
    "completed_calls": 1720,
    "failed_calls": 95,
    "no_answer_calls": 28,
    "average_duration_seconds": 185,
    "total_duration_seconds": 340150,
    "calls_by_day": [
      {
        "date": "2025-10-17",
        "count": 245,
        "total_duration": 45230
      },
      {
        "date": "2025-10-18",
        "count": 268,
        "total_duration": 49562
      }
    ],
    "calls_by_agent": [
      {
        "agent_id": "agent-uuid-001",
        "agent_name": "Customer Support Agent",
        "total_calls": 823,
        "avg_duration": 192
      }
    ]
  }
}
```

**Frontend Behavior**:
- Show skeleton chart placeholders while loading
- Render charts using Recharts library (already installed, package.json line 41)
- Display time period selector: "24 hours", "7 days", "30 days", "90 days"
- Refetch data when period changes

---

## GET /api/user/stats/cost

**Purpose**: Fetch cost breakdown for analytics page

**Requirements**: FR-API-014

**Request**:
```http
GET /api/user/stats/cost?period=30d
Authorization: Bearer <token>
```

**Query Parameters**:
- `period` (optional): `24h`, `7d`, `30d`, `90d` (default: `30d`)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "total_cost_usd": 387.92,
    "llm_cost_usd": 245.30,
    "stt_cost_usd": 89.12,
    "tts_cost_usd": 53.50,
    "cost_by_day": [
      {
        "date": "2025-10-17",
        "total_cost": 12.45,
        "llm_cost": 7.80,
        "stt_cost": 2.90,
        "tts_cost": 1.75
      }
    ],
    "cost_by_agent": [
      {
        "agent_id": "agent-uuid-001",
        "agent_name": "Customer Support Agent",
        "total_cost": 187.23,
        "call_count": 823
      }
    ]
  }
}
```

**Frontend Behavior**:
- Show skeleton loaders while loading
- Display cost breakdown charts (pie chart for LLM/STT/TTS, line chart for daily)
- Display cost by agent table
- Show period selector (matches calls endpoint)

**Constitution Alignment**: Principle VII (Cost Transparency)
- Users MUST understand and control their AI usage costs
- Monthly usage reports MUST be available in dashboard
- Pricing MUST be predictable and broken down by component (LLM, STT, TTS)
