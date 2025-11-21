# API Contracts: Phase 1 - UX Polish & Frontend-Backend Integration

**Branch**: `001-ux-frontend-integration` | **Date**: 2025-10-23

## Overview

This directory contains API contract specifications for all backend endpoints used by the frontend. These contracts document the **existing backend APIs** (no backend changes in Phase 1). Frontend integration will consume these endpoints.

## Contract Files

- `agents-api.md` - Agent CRUD operations (FR-API-001 to FR-API-005, FR-API-011)
- `phone-numbers-api.md` - Phone number provisioning and management (FR-API-006 to FR-API-009, FR-API-013)
- `stats-api.md` - User statistics and analytics (FR-API-010, FR-API-014)
- `profile-api.md` - User profile management (FR-API-015, FR-API-016)
- `call-logs-api.md` - Call history and logs (FR-API-012)

## Authentication

**All endpoints require authentication** via NextAuth v5:
- Authorization header: `Bearer <access_token>`
- Session-based authentication using HTTP-only cookies
- User ID extracted from authenticated session (multi-tenant isolation)

## Error Handling

All endpoints return consistent error format:

```json
{
  "success": false,
  "error": {
    "message": "User-friendly error message",
    "code": "ERROR_CODE",
    "details": {
      "field_name": ["Error message 1", "Error message 2"]
    }
  }
}
```

**HTTP Status Codes**:
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (user doesn't own resource)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (Magnus Billing down, etc.)

## Rate Limiting

- **Rate limit**: 100 requests per minute per user (per constitution)
- **Rate limit headers**:
  - `X-RateLimit-Limit`: 100
  - `X-RateLimit-Remaining`: (requests remaining)
  - `X-RateLimit-Reset`: (Unix timestamp when limit resets)

## Base URL

- **Development**: `http://localhost:5000`
- **Production**: `https://api.epic.ai` (or configured backend URL)

All endpoints are relative to this base URL.
