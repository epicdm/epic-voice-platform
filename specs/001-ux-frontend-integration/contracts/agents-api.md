# Agents API Contract

**Related Requirements**: FR-API-001, FR-API-002, FR-API-003, FR-API-004, FR-API-005, FR-API-011

## GET /api/user/agents

**Purpose**: Fetch all agents owned by authenticated user

**Requirements**: FR-API-011

**Request**:
```http
GET /api/user/agents
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "user_id": "user-123",
      "name": "Customer Support Agent",
      "description": "Handles customer inquiries 24/7",
      "instructions": "You are a helpful customer support agent...",
      "llm_model": "gpt-4o-mini",
      "voice": "echo",
      "temperature": 0.7,
      "vad_enabled": true,
      "turn_detection": "semantic",
      "noise_cancellation": true,
      "status": "active",
      "created_at": "2025-10-20T10:00:00Z",
      "updated_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

**Empty State** (200):
```json
{
  "success": true,
  "data": []
}
```

**Error Response** (401):
```json
{
  "success": false,
  "error": {
    "message": "Authentication required",
    "code": "UNAUTHORIZED"
  }
}
```

**Frontend Behavior**:
- Show skeleton loaders while loading (FR-UX-001)
- Display empty state if `data` is empty array (FR-UX-004)
- Show error message + retry button if request fails (FR-UX-006)

---

## POST /api/user/agents

**Purpose**: Create new agent from 3-step wizard submission

**Requirements**: FR-API-003, FR-API-004, FR-API-005

**Request**:
```http
POST /api/user/agents
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Sales Outreach Agent",
  "description": "Handles outbound sales calls",
  "instructions": "You are a friendly sales representative...",
  "llm_model": "gpt-4o-mini",
  "voice": "alloy",
  "temperature": 0.8,
  "vad_enabled": true,
  "turn_detection": "semantic",
  "noise_cancellation": true
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Agent created successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "user_id": "user-123",
    "name": "Sales Outreach Agent",
    "description": "Handles outbound sales calls",
    "instructions": "You are a friendly sales representative...",
    "llm_model": "gpt-4o-mini",
    "voice": "alloy",
    "temperature": 0.8,
    "vad_enabled": true,
    "turn_detection": "semantic",
    "noise_cancellation": true,
    "status": "deploying",
    "created_at": "2025-10-23T14:30:00Z",
    "updated_at": "2025-10-23T14:30:00Z"
  }
}
```

**Validation Error** (400):
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "name": ["Name must be at least 3 characters"],
      "voice": ["Voice is required"]
    }
  }
}
```

**Server Error** (500):
```json
{
  "success": false,
  "error": {
    "message": "Failed to create agent. Please try again.",
    "code": "INTERNAL_ERROR"
  }
}
```

**Frontend Behavior**:
- Show loading spinner on submit button (FR-UX-009)
- Disable button while submitting (FR-UX-009)
- On success:
  - Show success toast: "Agent created successfully" (FR-UX-003, FR-API-004)
  - Redirect to `/dashboard/agents` (FR-API-004)
- On error:
  - Show error message with "Retry" button (FR-UX-006, FR-API-005)
  - If validation error, display inline errors below fields (FR-UX-005)

**User Story**: User Story 1 (P1) - Complete Agent Creation Flow

---

## GET /api/user/agents/:id

**Purpose**: Fetch single agent by ID

**Request**:
```http
GET /api/user/agents/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "name": "Customer Support Agent",
    ...
  }
}
```

**Not Found** (404):
```json
{
  "success": false,
  "error": {
    "message": "Agent not found",
    "code": "NOT_FOUND"
  }
}
```

**Forbidden** (403):
```json
{
  "success": false,
  "error": {
    "message": "You don't have permission to access this agent",
    "code": "FORBIDDEN"
  }
}
```

---

## PUT /api/user/agents/:id

**Purpose**: Update existing agent configuration

**Request**:
```http
PUT /api/user/agents/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Agent Name",
  "description": "Updated description",
  "temperature": 0.9
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Agent updated successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "user_id": "user-123",
    "name": "Updated Agent Name",
    "description": "Updated description",
    "temperature": 0.9,
    ...
  }
}
```

**Frontend Behavior**:
- Show loading state on save button
- Show success toast on update
- Show error + retry on failure

---

## DELETE /api/user/agents/:id

**Purpose**: Delete agent (destructive action)

**Request**:
```http
DELETE /api/user/agents/550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Agent deleted successfully"
}
```

**Error - Agent In Use** (400):
```json
{
  "success": false,
  "error": {
    "message": "Cannot delete agent with assigned phone number. Unassign first.",
    "code": "AGENT_IN_USE"
  }
}
```

**Frontend Behavior**:
- MUST show confirmation dialog before DELETE (FR-UX-007)
- Dialog title: "Delete Agent"
- Dialog message: "Are you sure you want to delete [Agent Name]? This action cannot be undone."
- On success: Show toast "Agent deleted successfully"
- On error: Show error message (e.g., "Cannot delete agent with assigned phone number")
