# Phone Numbers API Contract

**Related Requirements**: FR-API-006, FR-API-007, FR-API-008, FR-API-009, FR-API-013

## GET /api/user/phone-numbers

**Purpose**: Fetch all phone numbers owned by authenticated user

**Requirements**: FR-API-013

**Request**:
```http
GET /api/user/phone-numbers
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "phone-uuid-001",
      "user_id": "user-123",
      "number": "+15551234567",
      "country_code": "US",
      "provider": "magnus_billing",
      "provider_id": "mb-12345",
      "agent_id": "agent-uuid-001",
      "status": "assigned",
      "created_at": "2025-10-22T09:00:00Z",
      "updated_at": "2025-10-22T10:30:00Z"
    },
    {
      "id": "phone-uuid-002",
      "user_id": "user-123",
      "number": "+15559876543",
      "country_code": "US",
      "provider": "magnus_billing",
      "provider_id": "mb-67890",
      "agent_id": null,
      "status": "active",
      "created_at": "2025-10-23T11:00:00Z",
      "updated_at": "2025-10-23T11:00:00Z"
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

**Frontend Behavior**:
- Show skeleton loaders while loading (FR-UX-001)
- Display empty state: "No phone numbers yet. Provision your first number to get started." (FR-UX-004)
- Show CTA button: "Provision Number" (opens modal)

---

## POST /api/user/phone-numbers/provision

**Purpose**: Provision new phone number from Magnus Billing

**Requirements**: FR-API-006, FR-API-007, FR-API-008, FR-API-009

**Request**:
```http
POST /api/user/phone-numbers/provision
Authorization: Bearer <token>
Content-Type: application/json

{
  "country_code": "US",
  "area_code": "555"
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Phone number provisioned successfully",
  "data": {
    "id": "phone-uuid-003",
    "user_id": "user-123",
    "number": "+15551112222",
    "country_code": "US",
    "provider": "magnus_billing",
    "provider_id": "mb-11122",
    "agent_id": null,
    "status": "active",
    "created_at": "2025-10-23T14:45:00Z",
    "updated_at": "2025-10-23T14:45:00Z"
  }
}
```

**Error - Magnus Billing Unavailable** (503):
```json
{
  "success": false,
  "error": {
    "message": "Phone provisioning service is temporarily unavailable. Please try again in a few minutes.",
    "code": "SERVICE_UNAVAILABLE"
  }
}
```

**Error - No Numbers Available** (400):
```json
{
  "success": false,
  "error": {
    "message": "No phone numbers available in area code 555. Try a different area code.",
    "code": "NO_NUMBERS_AVAILABLE"
  }
}
```

**Error - Timeout** (504):
```json
{
  "success": false,
  "error": {
    "message": "Phone provisioning request timed out. Please try again.",
    "code": "TIMEOUT"
  }
}
```

**Frontend Behavior**:
- Show loading state: "Provisioning..." (FR-API-007)
- **Duration**: 3-10 seconds for Magnus Billing API call
- On success:
  - Show toast: "Number provisioned: +15551112222" (FR-API-008)
  - Display assignment options: "Assign to agent" dropdown + button (FR-API-008)
  - Add number to list immediately
- On error:
  - Show error message with "Retry" button (FR-API-009)
  - Error messages MUST be specific (Magnus unavailable vs no numbers available)

**User Story**: User Story 2 (P1) - Phone Number Provisioning & Assignment

**Expected Latency**: 3-10 seconds (Magnus Billing external API call)

---

## PUT /api/user/phone-numbers/:id/assign

**Purpose**: Assign phone number to an agent

**Request**:
```http
PUT /api/user/phone-numbers/phone-uuid-002/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "agent_id": "agent-uuid-001"
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Phone number assigned to agent successfully",
  "data": {
    "id": "phone-uuid-002",
    "user_id": "user-123",
    "number": "+15559876543",
    "agent_id": "agent-uuid-001",
    "status": "assigned",
    ...
  }
}
```

**Error - Agent Not Found** (404):
```json
{
  "success": false,
  "error": {
    "message": "Agent not found",
    "code": "NOT_FOUND"
  }
}
```

**Frontend Behavior**:
- Show loading state on "Assign" button
- Show success toast: "Phone number assigned to [Agent Name]"
- Update phone number status in list immediately

---

## PUT /api/user/phone-numbers/:id/unassign

**Purpose**: Unassign phone number from agent

**Request**:
```http
PUT /api/user/phone-numbers/phone-uuid-002/unassign
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Phone number unassigned successfully",
  "data": {
    "id": "phone-uuid-002",
    "user_id": "user-123",
    "number": "+15559876543",
    "agent_id": null,
    "status": "active",
    ...
  }
}
```

**Frontend Behavior**:
- Show success toast: "Phone number unassigned"
- Update status to "active" in list

---

## DELETE /api/user/phone-numbers/:id

**Purpose**: Release phone number back to Magnus Billing (destructive action)

**Request**:
```http
DELETE /api/user/phone-numbers/phone-uuid-002
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Phone number released successfully"
}
```

**Error - Number Assigned** (400):
```json
{
  "success": false,
  "error": {
    "message": "Cannot release phone number while assigned to agent. Unassign first.",
    "code": "NUMBER_IN_USE"
  }
}
```

**Frontend Behavior**:
- MUST show confirmation dialog before DELETE (FR-UX-007)
- Dialog title: "Release Phone Number"
- Dialog message: "Are you sure you want to release +15559876543? This action cannot be undone and the number may not be available again."
- On success: Show toast "Phone number released"
- On error: Show error "Cannot release phone number while assigned to agent"
