# Call Logs API Contract

**Related Requirements**: FR-API-012

## GET /api/user/call-logs

**Purpose**: Fetch call history with filtering and pagination

**Requirements**: FR-API-012

**Request**:
```http
GET /api/user/call-logs?page=1&limit=50&agent_id=agent-uuid-001&start_date=2025-10-01&end_date=2025-10-31
Authorization: Bearer <token>
```

**Query Parameters** (all optional):
- `page` (number): Page number for pagination (default: 1)
- `limit` (number): Results per page, max 100 (default: 50)
- `agent_id` (uuid): Filter by specific agent
- `phone_number_id` (uuid): Filter by phone number
- `status` (string): Filter by status (`completed`, `failed`, `no_answer`, `busy`)
- `start_date` (ISO date): Filter calls after this date
- `end_date` (ISO date): Filter calls before this date
- `sort` (string): Sort order (`created_at:desc`, `duration:desc`, `cost:desc`) (default: `created_at:desc`)

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "calls": [
      {
        "id": "call-uuid-001",
        "user_id": "user-123",
        "agent_id": "agent-uuid-001",
        "agent_name": "Customer Support Agent",
        "phone_number_id": "phone-uuid-001",
        "phone_number": "+15551234567",
        "call_sid": "CA123456789abcdef",
        "room_name": "room-abc123",
        "caller_number": "+15559998888",
        "duration_seconds": 245,
        "cost_usd": 0.87,
        "transcript": "Agent: Hello, how can I help you today?\nCaller: I have a question about...",
        "status": "completed",
        "started_at": "2025-10-23T10:15:00Z",
        "ended_at": "2025-10-23T10:19:05Z",
        "created_at": "2025-10-23T10:15:00Z"
      },
      {
        "id": "call-uuid-002",
        "user_id": "user-123",
        "agent_id": "agent-uuid-001",
        "agent_name": "Customer Support Agent",
        "phone_number_id": "phone-uuid-001",
        "phone_number": "+15551234567",
        "call_sid": "CA987654321fedcba",
        "room_name": "room-xyz789",
        "caller_number": "+15557776666",
        "duration_seconds": 0,
        "cost_usd": 0.00,
        "transcript": null,
        "status": "no_answer",
        "started_at": "2025-10-23T09:30:00Z",
        "ended_at": "2025-10-23T09:30:00Z",
        "created_at": "2025-10-23T09:30:00Z"
      }
    ],
    "pagination": {
      "total": 1843,
      "page": 1,
      "limit": 50,
      "total_pages": 37
    }
  }
}
```

**Empty State** (200):
```json
{
  "success": true,
  "data": {
    "calls": [],
    "pagination": {
      "total": 0,
      "page": 1,
      "limit": 50,
      "total_pages": 0
    }
  }
}
```

**Validation Error** (400):
```json
{
  "success": false,
  "error": {
    "message": "Invalid date range",
    "code": "VALIDATION_ERROR",
    "details": {
      "end_date": ["End date must be after start date"]
    }
  }
}
```

**Frontend Behavior**:
- Show skeleton table rows while loading (FR-UX-001)
- Display empty state if no calls: "No call history yet. Calls will appear here once your agents start receiving calls." (FR-UX-004)
- **Filtering**:
  - Agent dropdown: Fetch user's agents and populate dropdown
  - Date range picker: Use date-fns for formatting (already installed, package.json line 28)
  - Status dropdown: Options from `CallStatus` enum
- **Pagination**:
  - Show current page and total pages
  - "Previous" and "Next" buttons
  - Disable buttons at boundaries (page 1, last page)
- **Table Columns**:
  - Date/Time (formatted with date-fns)
  - Agent Name
  - Phone Number (caller)
  - Duration (formatted as "4m 5s")
  - Cost (formatted as "$0.87")
  - Status (badge with color: green=completed, red=failed, gray=no_answer)
  - Actions (View Transcript button if transcript exists)

**Performance Note**:
- Use skeleton table (5-10 rows) while loading
- Implement virtual scrolling if >100 rows displayed (Phase 2 optimization)

**Related User Stories**: Supports call analytics and troubleshooting workflows (P2/P3)
