# CSV Export API - Complete Documentation

**API Version**: 1.0.0
**Base URL**: `https://ai.epic.dm`
**Documentation Date**: October 31, 2025
**Status**: ✅ Production Ready

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Export Endpoints](#export-endpoints)
5. [Code Examples](#code-examples)
6. [Error Handling](#error-handling)
7. [Postman Collection](#postman-collection)

---

## Overview

The CSV Export API provides secure, authenticated endpoints for exporting platform data as CSV files. All endpoints support filtering, streaming responses for large datasets, and multi-tenant data isolation.

### Key Features

- **Streaming CSV**: Memory-efficient export of large datasets
- **Multi-tenant Isolation**: Automatic user data scoping
- **PII Protection**: Phone number masking
- **Rate Limiting**: Heavy tier protection (10 requests/60 seconds)
- **Audit Logging**: All exports are logged for compliance

---

## Authentication

### Session-Based Authentication (Production)

**Login Endpoint**: `POST /api/auth/login`

**Request**:
```bash
curl -X POST https://ai.epic.dm/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your_password"
  }'
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

**Authentication Method**: Session cookies are automatically set after successful login. All subsequent requests use these cookies for authentication.

### Development Authentication

For development/testing, endpoints also accept the `X-User-Email` header:

```bash
curl -X GET https://ai.epic.dm/api/exports/calls \
  -H "X-User-Email: user@example.com"
```

---

## Rate Limiting

**Tier**: HEAVY
**Limit**: 10 requests per 60 seconds per user
**Headers**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

**429 Response** (Rate Limit Exceeded):
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again in 60 seconds."
}
```

---

## Export Endpoints

### 1. Export Call Logs

**Endpoint**: `GET /api/exports/calls`

**Description**: Export call logs with outcomes, duration, costs, and metadata.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (ISO 8601) | No | Filter calls after this date |
| `end_date` | string (ISO 8601) | No | Filter calls before this date |
| `status` | string | No | Filter by status: `answered`, `missed`, `failed`, `completed` |
| `agent_id` | string | No | Filter by agent configuration ID |
| `outcome` | string | No | Filter by call outcome |

**Example Request**:
```bash
curl -X GET "https://ai.epic.dm/api/exports/calls?start_date=2025-10-01&status=completed" \
  -H "Cookie: session=your_session_cookie"
```

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="calls_export_20251031_003045.csv"
X-Export-Type: calls
X-Export-Timestamp: 2025-10-31T00:30:45.123456
```

**CSV Columns**:
- id
- livekitRoomName
- livekitRoomSid
- direction (inbound/outbound)
- phoneNumber (masked: +176***9426)
- sipCallId
- duration (seconds)
- startedAt (ISO 8601)
- endedAt (ISO 8601)
- status
- outcome
- recordingUrl
- cost (USD)
- metadata (JSON string)
- createdAt (ISO 8601)

---

### 2. Export Leads

**Endpoint**: `GET /api/exports/leads`

**Description**: Export campaign leads with call history and contact information.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (ISO 8601) | No | Filter leads created after this date |
| `end_date` | string (ISO 8601) | No | Filter leads created before this date |
| `status` | string | No | Filter by status: `new`, `queued`, `calling`, `completed`, `failed`, `dnc` |
| `campaign_id` | string | No | Filter by campaign ID |
| `source` | string | No | Filter by lead source |

**Example Request**:
```bash
curl -X GET "https://ai.epic.dm/api/exports/leads?status=new&campaign_id=campaign-123" \
  -H "Cookie: session=your_session_cookie"
```

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="leads_export_20251031_003045.csv"
```

**CSV Columns**:
- id
- user_id
- campaign_id
- phone_number
- first_name
- last_name
- email
- company
- status
- metadata (JSON string)
- source
- last_called_at (ISO 8601)
- times_called
- last_call_status
- last_call_duration
- created_at (ISO 8601)
- updated_at (ISO 8601)

---

### 3. Export Agents

**Endpoint**: `GET /api/exports/agents`

**Description**: Export agent configurations including voice settings and instructions.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `is_active` | boolean | No | Filter by active status (`true`/`false`) |
| `agent_mode` | string | No | Filter by mode: `inbound`, `outbound`, `both` |

**Example Request**:
```bash
curl -X GET "https://ai.epic.dm/api/exports/agents?is_active=true" \
  -H "Cookie: session=your_session_cookie"
```

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="agents_export_20251031_003045.csv"
```

**CSV Columns**:
- id
- agentId
- name
- description
- agentMode
- language
- llmProvider
- llmModel
- sttProvider
- sttModel
- ttsProvider
- ttsVoiceId
- realtimeVoice
- greetingEnabled
- greetingMessage
- isActive
- createdAt (ISO 8601)

---

### 4. Export Phone Numbers

**Endpoint**: `GET /api/exports/phone-numbers`

**Description**: Export phone number mappings with agent assignments and SIP configuration.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `is_active` | boolean | No | Filter by active status |
| `agent_id` | string | No | Filter by assigned agent |

**Example Request**:
```bash
curl -X GET "https://ai.epic.dm/api/exports/phone-numbers?agent_id=agent-123" \
  -H "Cookie: session=your_session_cookie"
```

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="phone_numbers_export_20251031_003045.csv"
```

**CSV Columns**:
- id
- phoneNumber
- agentConfigId
- sipTrunkId
- sipConfigId
- isActive
- createdAt (ISO 8601)

---

### 5. Export Events

**Endpoint**: `GET /api/exports/events`

**Description**: Export LiveKit call events for debugging and monitoring.

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string (ISO 8601) | No | Filter events after this date |
| `end_date` | string (ISO 8601) | No | Filter events before this date |
| `event` | string | No | Filter by event type |
| `room_name` | string | No | Filter by LiveKit room name |

**Example Request**:
```bash
curl -X GET "https://ai.epic.dm/api/exports/events?start_date=2025-10-01&event=participant_joined" \
  -H "Cookie: session=your_session_cookie"
```

**Response Headers**:
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="events_export_20251031_003045.csv"
```

**CSV Columns**:
- id
- event_type
- room_name
- room_sid
- participant_identity
- participant_sid
- timestamp (ISO 8601)
- metadata (JSON string)
- user_id
- created_at (ISO 8601)

---

### 6. Health Check

**Endpoint**: `GET /api/exports/health`

**Description**: Verify export service is operational. No authentication required.

**Example Request**:
```bash
curl -X GET https://ai.epic.dm/api/exports/health
```

**Response**:
```json
{
  "status": "healthy",
  "service": "csv-exports",
  "version": "1.0.0",
  "timestamp": "2025-10-31T00:30:45.123456"
}
```

---

### 7. Export Info

**Endpoint**: `GET /api/exports/info`

**Description**: Get information about available exports. Requires authentication.

**Example Request**:
```bash
curl -X GET https://ai.epic.dm/api/exports/info \
  -H "Cookie: session=your_session_cookie"
```

**Response**:
```json
{
  "exports": [
    {
      "endpoint": "/api/exports/calls",
      "description": "Export call logs with outcomes",
      "filters": ["start_date", "end_date", "status", "agent_id", "outcome"]
    },
    ...
  ],
  "user_id": "user-uuid",
  "timestamp": "2025-10-31T00:30:45.123456"
}
```

---

## Code Examples

### Python (requests)

```python
import requests
from datetime import datetime, timedelta

# Login
session = requests.Session()
login_response = session.post(
    'https://ai.epic.dm/api/auth/login',
    json={
        'email': 'user@example.com',
        'password': 'your_password'
    }
)

if login_response.json()['success']:
    # Export calls from last 30 days
    start_date = (datetime.utcnow() - timedelta(days=30)).isoformat() + 'Z'

    response = session.get(
        'https://ai.epic.dm/api/exports/calls',
        params={
            'start_date': start_date,
            'status': 'completed'
        }
    )

    # Save CSV file
    with open('calls_export.csv', 'wb') as f:
        f.write(response.content)

    print(f"Exported {len(response.content)} bytes")
```

### JavaScript (fetch)

```javascript
// Login
const loginResponse = await fetch('https://ai.epic.dm/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'your_password'
  })
});

const { success } = await loginResponse.json();

if (success) {
  // Export leads
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const response = await fetch(
    `https://ai.epic.dm/api/exports/leads?start_date=${startDate.toISOString()}&status=new`,
    { credentials: 'include' }
  );

  // Download CSV
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads_export.csv';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
```

### curl

```bash
#!/bin/bash

# Login and save cookies
curl -X POST https://ai.epic.dm/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your_password"}' \
  -c cookies.txt

# Export agents
curl -X GET "https://ai.epic.dm/api/exports/agents?is_active=true" \
  -b cookies.txt \
  -o agents_export.csv

echo "Export complete: agents_export.csv"
```

---

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | CSV file generated and downloaded |
| 401 | Unauthorized | Not authenticated or session expired |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error during export |

### Error Response Format

```json
{
  "error": "error_type",
  "message": "Human-readable error message"
}
```

### Error Types

- `authentication_required`: User not logged in
- `rate_limit_exceeded`: Too many requests
- `invalid_parameters`: Bad query parameters
- `export_failed`: Internal error during export

### Handling Rate Limits

```python
import time
import requests

def export_with_retry(url, params, max_retries=3):
    session = requests.Session()

    for attempt in range(max_retries):
        response = session.get(url, params=params)

        if response.status_code == 200:
            return response.content
        elif response.status_code == 429:
            # Rate limited, wait and retry
            retry_after = int(response.headers.get('X-RateLimit-Reset', 60))
            print(f"Rate limited. Waiting {retry_after} seconds...")
            time.sleep(retry_after)
        else:
            raise Exception(f"Export failed: {response.status_code}")

    raise Exception("Max retries exceeded")
```

---

## Postman Collection

### Collection Setup

1. **Create Collection**: "LiveKit Voice Agent Platform API"
2. **Add Variables**:
   - `base_url`: `https://ai.epic.dm`
   - `user_email`: Your email
   - `user_password`: Your password

3. **Add Pre-request Script** (Collection level):
```javascript
// Auto-login if not authenticated
if (!pm.cookies.has('session')) {
    pm.sendRequest({
        url: pm.variables.get('base_url') + '/api/auth/login',
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        body: {
            mode: 'raw',
            raw: JSON.stringify({
                email: pm.variables.get('user_email'),
                password: pm.variables.get('user_password')
            })
        }
    });
}
```

### Example Requests

#### 1. Login
```
POST {{base_url}}/api/auth/login
Content-Type: application/json

{
  "email": "{{user_email}}",
  "password": "{{user_password}}"
}
```

#### 2. Export Calls (Last 30 Days)
```
GET {{base_url}}/api/exports/calls?start_date={{$isoTimestamp}}&status=completed
```

#### 3. Export Leads (By Campaign)
```
GET {{base_url}}/api/exports/leads?campaign_id={{campaign_id}}&status=new
```

#### 4. Export Active Agents
```
GET {{base_url}}/api/exports/agents?is_active=true
```

#### 5. Export Phone Numbers
```
GET {{base_url}}/api/exports/phone-numbers?is_active=true
```

#### 6. Health Check
```
GET {{base_url}}/api/exports/health
```

### Test Scripts

Add to each export request:

```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Content-Type is CSV", function () {
    pm.response.to.have.header("Content-Type", "text/csv; charset=utf-8");
});

pm.test("Has Content-Disposition header", function () {
    pm.expect(pm.response.headers.has("Content-Disposition")).to.be.true;
});

pm.test("CSV content is not empty", function () {
    pm.expect(pm.response.text()).to.not.be.empty;
});
```

---

## Best Practices

### 1. Authentication
- Always login before making export requests
- Handle session expiration (401 responses)
- Store credentials securely (environment variables)

### 2. Rate Limiting
- Implement exponential backoff for 429 responses
- Batch exports during off-peak hours
- Monitor `X-RateLimit-Remaining` header

### 3. Large Exports
- Use date range filters to limit data size
- Process exports asynchronously in your application
- Consider pagination for very large datasets

### 4. Error Handling
- Always check HTTP status codes
- Parse error responses for detailed messages
- Implement retry logic with backoff

### 5. Security
- Never commit credentials to version control
- Use HTTPS for all requests
- Validate and sanitize exported data

---

## Support & Contact

**Documentation**: https://ai.epic.dm/api/docs
**Health Check**: https://ai.epic.dm/api/exports/health
**API Version**: 1.0.0

For issues or questions:
1. Check `/api/exports/health` endpoint
2. Review error messages in response
3. Verify authentication and rate limits

---

## Changelog

### Version 1.0.0 (2025-10-31)
- Initial release of CSV Export API
- 5 export endpoints (calls, leads, agents, phone-numbers, events)
- Session-based authentication
- Rate limiting (HEAVY tier)
- PII protection (phone masking)
- Audit logging
- OpenAPI/Swagger documentation

### Planned Enhancements
- Column selection for exports
- Scheduled exports
- Email delivery
- Export history
- Alternative formats (JSON, Excel)

---

**Implementation**: Claude Code (Sonnet 4.5)
**Date**: October 31, 2025
**Status**: Production Ready ✅
