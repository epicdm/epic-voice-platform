# Data Model: Phase 1 - UX Polish & Frontend-Backend Integration

**Branch**: `001-ux-frontend-integration` | **Date**: 2025-10-23

## Overview

This phase does **NOT modify database models**. All backend schemas are already defined and functional. This document describes the **frontend TypeScript interfaces** that represent backend entities for type safety and validation.

## Frontend Type Definitions

### Agent Entity

**Description**: Voice AI agent created and managed by users through the UI

**Backend Source**: `backend/app/models/agent.py` (SQLAlchemy model)

**Frontend Interface** (`frontend/src/types/agent.ts`):

```typescript
export interface Agent {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to users table (multi-tenant isolation)
  name: string;                  // Agent display name (min 3 chars)
  description: string;           // Agent purpose/description (min 10 chars)
  instructions: string;          // System prompt for LLM
  llm_model: string;             // LLM model (e.g., "gpt-4o-mini")
  voice: string;                 // TTS voice ID (e.g., "echo", "alloy")
  temperature: number;           // LLM temperature 0-1 (default 0.7)
  vad_enabled: boolean;          // Voice Activity Detection enabled
  turn_detection: string;        // Turn detection mode ("semantic" | "vad_based")
  noise_cancellation: boolean;   // Noise cancellation enabled
  status: AgentStatus;           // Current agent status
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

export enum AgentStatus {
  ACTIVE = "active",             // Ready to receive calls
  INACTIVE = "inactive",         // Paused/disabled by user
  DEPLOYING = "deploying",       // Being deployed to LiveKit
  FAILED = "failed"              // Deployment failed
}
```

**Validation Schema** (`frontend/src/lib/schemas/agent-schema.ts`):

```typescript
import { z } from 'zod';

export const agentWizardStep1Schema = z.object({
  name: z.string()
    .min(3, "Name must be at least 3 characters")
    .max(50, "Name cannot exceed 50 characters"),
  description: z.string()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description cannot exceed 500 characters")
});

export const agentWizardStep2Schema = z.object({
  instructions: z.string()
    .min(20, "Instructions must be at least 20 characters")
    .max(2000, "Instructions cannot exceed 2000 characters"),
  llm_model: z.enum(["gpt-4o-mini", "gpt-4o", "claude-3-5-sonnet"], {
    required_error: "LLM model is required"
  }),
  voice: z.enum(["alloy", "echo", "fable", "nova", "onyx", "shimmer"], {
    required_error: "Voice is required"
  }),
  temperature: z.number()
    .min(0, "Temperature must be between 0 and 1")
    .max(1, "Temperature must be between 0 and 1")
    .default(0.7)
});

export const agentWizardStep3Schema = z.object({
  vad_enabled: z.boolean().default(true),
  turn_detection: z.enum(["semantic", "vad_based"]).default("semantic"),
  noise_cancellation: z.boolean().default(true)
});

export const agentCreateSchema = z.object({
  ...agentWizardStep1Schema.shape,
  ...agentWizardStep2Schema.shape,
  ...agentWizardStep3Schema.shape
});
```

**State Transitions**:

```
[User creates agent] → DEPLOYING
DEPLOYING → ACTIVE (if deployment succeeds)
DEPLOYING → FAILED (if deployment fails)
ACTIVE → INACTIVE (user pauses agent)
INACTIVE → DEPLOYING (user resumes agent)
```

**Related Requirements**:
- FR-API-001, FR-API-002, FR-API-003: Wizard collects and submits agent config
- FR-API-004: Success toast + redirect on creation
- FR-API-005: Error handling with retry
- FR-UX-005: Zod validation with inline errors

---

### PhoneNumber Entity

**Description**: Phone numbers (DIDs) provisioned from Magnus Billing and assigned to agents

**Backend Source**: `backend/app/models/phone_number.py`

**Frontend Interface** (`frontend/src/types/phone-number.ts`):

```typescript
export interface PhoneNumber {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to users table (multi-tenant)
  number: string;                // E.164 format (e.g., "+15551234567")
  country_code: string;          // ISO country code (e.g., "US", "UK")
  provider: string;              // "magnus_billing"
  provider_id: string;           // Provider's internal ID for this number
  agent_id: string | null;       // Foreign key to agents table (null if unassigned)
  status: PhoneNumberStatus;     // Current status
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}

export enum PhoneNumberStatus {
  PROVISIONING = "provisioning", // Magnus API call in progress
  ACTIVE = "active",             // Provisioned and ready to use
  ASSIGNED = "assigned",         // Assigned to an agent
  FAILED = "failed",             // Provisioning failed
  RELEASED = "released"          // Released back to provider
}
```

**Validation Schema** (`frontend/src/lib/schemas/phone-schema.ts`):

```typescript
import { z } from 'zod';

export const phoneProvisionSchema = z.object({
  country_code: z.string()
    .length(2, "Country code must be 2 characters (e.g., US, UK)")
    .toUpperCase(),
  area_code: z.string()
    .optional()
    .refine(val => !val || /^\d{3}$/.test(val), "Area code must be 3 digits"),
  agent_id: z.string()
    .uuid("Agent ID must be valid UUID")
    .optional()
});

export const phoneAssignSchema = z.object({
  phone_id: z.string().uuid("Phone ID must be valid UUID"),
  agent_id: z.string().uuid("Agent ID must be valid UUID")
});
```

**State Transitions**:

```
[User clicks "Provision Number"] → PROVISIONING
PROVISIONING → ACTIVE (if Magnus API succeeds)
PROVISIONING → FAILED (if Magnus API fails or timeout)
ACTIVE → ASSIGNED (user assigns to agent)
ASSIGNED → ACTIVE (user unassigns)
ACTIVE → RELEASED (user releases number)
```

**Related Requirements**:
- FR-API-006: POST /api/user/phone-numbers/provision
- FR-API-007: Loading state during Magnus API call (3-10 seconds)
- FR-API-008: Display number + assignment options on success
- FR-API-009: Error handling for Magnus unavailable / no numbers available

---

### CallLog Entity

**Description**: Record of completed voice calls handled by agents

**Backend Source**: `backend/app/models/call_log.py`

**Frontend Interface** (`frontend/src/types/call-log.ts`):

```typescript
export interface CallLog {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to users table (multi-tenant)
  agent_id: string;              // Foreign key to agents table
  phone_number_id: string;       // Foreign key to phone_numbers table
  call_sid: string;              // SIP call identifier
  room_name: string;             // LiveKit room name
  caller_number: string;         // Caller's phone number (E.164)
  duration_seconds: number;      // Call duration in seconds
  cost_usd: number;              // Total cost in USD (LLM + STT + TTS)
  transcript: string | null;     // Full conversation transcript (may be null during call)
  status: CallStatus;            // Call completion status
  started_at: string;            // ISO timestamp
  ended_at: string;              // ISO timestamp
  created_at: string;            // ISO timestamp
}

export enum CallStatus {
  IN_PROGRESS = "in_progress",   // Call is active
  COMPLETED = "completed",       // Call ended normally
  FAILED = "failed",             // Call failed (technical error)
  NO_ANSWER = "no_answer",       // Call rang but no answer
  BUSY = "busy"                  // Callee was busy
}
```

**No validation schema needed** (read-only data from backend)

**Related Requirements**:
- FR-API-012: GET /api/user/call-logs with filtering
- FR-UX-004: Empty state for users with no call history

---

### UserStats Entity

**Description**: Aggregated statistics displayed on dashboard

**Backend Source**: `GET /api/user/stats` endpoint (computed, not stored)

**Frontend Interface** (`frontend/src/types/stats.ts`):

```typescript
export interface UserStats {
  total_agents: number;          // Count of user's agents
  total_phone_numbers: number;   // Count of user's phone numbers
  total_calls_today: number;     // Calls in last 24 hours
  total_calls_month: number;     // Calls in current month
  total_cost_today_usd: number;  // Cost today in USD
  total_cost_month_usd: number;  // Cost this month in USD
  active_calls: number;          // Currently in-progress calls
}
```

**No validation schema needed** (read-only display)

**Related Requirements**:
- FR-API-010: GET /api/user/stats and display totals
- User Story 3 (P2): Dashboard real-time data display

---

### UserProfile Entity

**Description**: User account settings and profile information

**Backend Source**: `backend/app/models/user.py`

**Frontend Interface** (`frontend/src/types/user.ts`):

```typescript
export interface UserProfile {
  id: string;                    // UUID primary key
  email: string;                 // User email (unique)
  full_name: string;             // Display name
  company: string | null;        // Optional company name
  timezone: string;              // IANA timezone (e.g., "America/New_York")
  notification_email: boolean;   // Email notifications enabled
  notification_sms: boolean;     // SMS notifications enabled
  created_at: string;            // ISO timestamp
  updated_at: string;            // ISO timestamp
}
```

**Validation Schema** (`frontend/src/lib/schemas/settings-schema.ts`):

```typescript
import { z } from 'zod';

export const profileUpdateSchema = z.object({
  full_name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  company: z.string()
    .max(100, "Company name cannot exceed 100 characters")
    .optional()
    .nullable(),
  timezone: z.string()
    .refine(val => Intl.supportedValuesOf('timeZone').includes(val), {
      message: "Invalid timezone"
    }),
  notification_email: z.boolean(),
  notification_sms: z.boolean()
});
```

**Related Requirements**:
- FR-API-015: GET /api/user/profile on settings page mount
- FR-API-016: PUT /api/user/profile with success/error feedback

---

## API Response Types

### Success Response

```typescript
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;              // Optional success message
}
```

### Error Response

```typescript
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;             // User-friendly error message
    code?: string;               // Error code (e.g., "VALIDATION_ERROR", "NOT_FOUND")
    details?: Record<string, string[]>; // Field-specific errors for forms
  };
}
```

**Usage Example**:

```typescript
try {
  const response = await apiClient<Agent>('/api/user/agents', {
    method: 'POST',
    body: JSON.stringify(agentData)
  });

  if (response.success) {
    toast.success(response.message || "Agent created!");
    setAgent(response.data);
  }
} catch (error) {
  // apiClient throws ApiErrorResponse
  toast.error(error.message);
  if (error.details) {
    // Display field-specific errors
    Object.entries(error.details).forEach(([field, errors]) => {
      setError(field, { message: errors[0] });
    });
  }
}
```

---

## Frontend State Management

### Component-Level State (React useState)

**Used for**:
- Loading states (`isLoading`, `isSubmitting`)
- Error states (`error`, `apiError`)
- Form data (managed by React Hook Form)
- UI state (modals open/closed, selected items)

**Pattern**:
```typescript
const [isLoading, setIsLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);
const [agents, setAgents] = useState<Agent[]>([]);
```

### No Global State Management Required

**Rationale**:
- Phase 1 scope is simple data fetching and display
- No complex cross-component state sharing needed
- Each page fetches its own data independently
- Form state is local to wizard components

**Future Consideration**:
- Phase 2 may introduce TanStack Query for caching and real-time updates
- Phase 2 may introduce Zustand/Context for cross-tab synchronization

---

## Summary

**Entities Defined**: 6 frontend TypeScript interfaces
- Agent (with 3-step validation schemas)
- PhoneNumber (with provision/assign validation)
- CallLog (read-only)
- UserStats (read-only, computed)
- UserProfile (with update validation)
- ApiSuccessResponse / ApiErrorResponse (generic wrappers)

**Validation Schemas**: 6 Zod schemas for forms
- agentWizardStep1Schema
- agentWizardStep2Schema
- agentWizardStep3Schema
- phoneProvisionSchema
- phoneAssignSchema
- profileUpdateSchema

**No Database Changes**: All backend models already exist and are functional. This phase only defines TypeScript types and client-side validation.

**Next Step**: Generate API contracts in `/contracts/` directory.
