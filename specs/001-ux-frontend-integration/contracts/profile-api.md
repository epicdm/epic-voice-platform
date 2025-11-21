# User Profile API Contract

**Related Requirements**: FR-API-015, FR-API-016

## GET /api/user/profile

**Purpose**: Fetch authenticated user's profile for settings page

**Requirements**: FR-API-015

**Request**:
```http
GET /api/user/profile
Authorization: Bearer <token>
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "company": "Acme Inc",
    "timezone": "America/New_York",
    "notification_email": true,
    "notification_sms": false,
    "created_at": "2025-09-15T08:00:00Z",
    "updated_at": "2025-10-20T14:30:00Z"
  }
}
```

**Frontend Behavior**:
- Load profile data when settings page mounts (FR-API-015)
- Show skeleton loaders for form fields while loading
- Populate form with loaded data
- Email field MUST be read-only (cannot be changed)

---

## PUT /api/user/profile

**Purpose**: Update user profile settings

**Requirements**: FR-API-016

**Request**:
```http
PUT /api/user/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John A. Doe",
  "company": "Acme Corporation",
  "timezone": "America/Los_Angeles",
  "notification_email": false,
  "notification_sms": true
}
```

**Success Response** (200):
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "full_name": "John A. Doe",
    "company": "Acme Corporation",
    "timezone": "America/Los_Angeles",
    "notification_email": false,
    "notification_sms": true,
    "created_at": "2025-09-15T08:00:00Z",
    "updated_at": "2025-10-23T15:00:00Z"
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
      "full_name": ["Name must be at least 2 characters"],
      "timezone": ["Invalid timezone"]
    }
  }
}
```

**Frontend Behavior**:
- Show loading spinner on "Save" button while submitting (FR-UX-009)
- Disable button during submission
- On success:
  - Show toast: "Profile updated successfully" (FR-UX-003, FR-API-016)
  - Keep user on settings page (no redirect)
  - Update form with latest data
- On validation error:
  - Display inline errors below each invalid field (FR-UX-005)
- On server error:
  - Show error message with "Retry" button (FR-UX-006)

**Validation Rules** (Zod schema in `frontend/src/lib/schemas/settings-schema.ts`):
- `full_name`: 2-100 characters, required
- `company`: 0-100 characters, optional
- `timezone`: Must be valid IANA timezone (e.g., "America/New_York")
- `notification_email`: Boolean
- `notification_sms`: Boolean

**Field Notes**:
- **Email**: Read-only, cannot be updated (security requirement)
- **Timezone**: Use dropdown populated with `Intl.supportedValuesOf('timeZone')`
- **Notifications**: Use checkbox/switch components
