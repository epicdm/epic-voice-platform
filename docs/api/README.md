# Epic Voice AI - Public API Documentation

**Version**: 1.0
**Base URL**: `https://ai.epic.dm` (Production) | `http://localhost:5001` (Development)
**Protocol**: REST API over HTTPS
**Authentication**: JWT Bearer Token or Session-based

---

## Table of Contents

1. [Authentication](#authentication)
2. [Call Outcomes API](#call-outcomes-api)
3. [CSV Export API](#csv-export-api)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Webhooks](#webhooks)
7. [Common Patterns](#common-patterns)

---

## Authentication

All API endpoints require authentication via JWT token or session cookie.

### JWT Authentication
```http
GET /api/endpoint
Authorization: Bearer <your-jwt-token>
```

### Session Authentication
```http
GET /api/endpoint
Cookie: session=<session-id>
```

### User Context
All API responses are scoped to the authenticated user (`userId`). Multi-tenant data isolation is enforced at the database level.

---

## Call Outcomes API

Track and retrieve call outcomes with automatic classification.

### Base Path
`/api/call-outcomes`

### Endpoints

#### 1. Get Call Outcome

Retrieve outcome details for a specific call.

**Endpoint**: `GET /api/call-outcomes/calls/{call_id}/outcome`

**Authentication**: Required

**Path Parameters**:
- `call_id` (string, required): Unique call identifier

**Response** (200 OK):
```json
{
  "id": "call-uuid-123",
  "userId": "user-uuid-456",
  "agentConfigId": "agent-uuid-789",
  "direction": "inbound",
  "phoneNumber": "+12345678900",
  "livekitRoomName": "sip-2345678900__abc123",
  "livekitRoomSid": "RM_xyz789",
  "duration": 45,
  "startedAt": "2025-10-30T12:34:56Z",
  "endedAt": "2025-10-30T12:35:41Z",
  "status": "ended",
  "outcome": "completed",
  "recordingUrl": "https://recordings.example.com/call-123.mp3",
  "metadata": {
    "disconnect_reason": "CLIENT_INITIATED",
    "participant_sid": "PA_participant123"
  },
  "cost": "0.025",
  "createdAt": "2025-10-30T12:34:56Z",
  "updatedAt": "2025-10-30T12:35:41Z"
}
```

**Outcome Values**:
- `completed`: Call answered and conversation occurred (≥10s)
- `no_answer`: Call went unanswered or quick hangup (<10s)
- `busy`: Called party was busy
- `failed`: Connection failure or system error (<3s)
- `voicemail`: Voicemail detected (future)

**Error Responses**:
- `404 Not Found`: Call not found or access denied
- `401 Unauthorized`: Authentication required
- `429 Too Many Requests`: Rate limit exceeded

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  https://ai.epic.dm/api/call-outcomes/calls/call-123/outcome
```

#### 2. Health Check

Check API health and configuration status.

**Endpoint**: `GET /api/call-outcomes/webhooks/call_completed/health`

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "status": "healthy",
  "webhook_secret_configured": true,
  "config_status": "✅ Configured"
}
```

**Example**:
```bash
curl https://ai.epic.dm/api/call-outcomes/webhooks/call_completed/health
```

---

## CSV Export API

Export data to CSV format with streaming for large datasets.

### Base Path
`/api/exports`

### Rate Limit
**10 requests per minute** (HEAVY tier)

### Common Query Parameters

All export endpoints support:
- `start_date` (string, optional): ISO 8601 date (e.g., `2025-10-01`)
- `end_date` (string, optional): ISO 8601 date (e.g., `2025-10-30`)
- `status` (string, optional): Filter by status
- `format` (string, optional): Response format (default: `csv`)

### Endpoints

#### 1. Export Call Logs

Export call history with outcomes and durations.

**Endpoint**: `GET /api/exports/calls`

**Authentication**: Required

**Query Parameters**:
- `start_date` (string, optional): Start date for filtering
- `end_date` (string, optional): End date for filtering
- `outcome` (string, optional): Filter by outcome (`completed`, `no_answer`, `busy`, `failed`)
- `direction` (string, optional): Filter by direction (`inbound`, `outbound`)

**Response** (200 OK):
```csv
id,userId,agentConfigId,direction,phoneNumber,duration,outcome,startedAt,endedAt,cost,metadata
call-123,user-456,agent-789,inbound,+12345678900,45,completed,2025-10-30T12:34:56Z,2025-10-30T12:35:41Z,0.025,"{'disconnect_reason':'CLIENT_INITIATED'}"
```

**Response Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename=calls_export_20251030.csv
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1698765432
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "https://ai.epic.dm/api/exports/calls?start_date=2025-10-01&outcome=completed" \
  -o calls_export.csv
```

#### 2. Export Agent Configurations

Export AI agent configurations.

**Endpoint**: `GET /api/exports/agents`

**Authentication**: Required

**Response** (200 OK):
```csv
id,userId,name,description,model,voice,instructions,createdAt
agent-123,user-456,Sales Agent,Handles sales calls,gpt-4,echo,"You are helpful",2025-10-30T12:00:00Z
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  https://ai.epic.dm/api/exports/agents \
  -o agents_export.csv
```

#### 3. Export Phone Numbers

Export phone number assignments and status.

**Endpoint**: `GET /api/exports/phone-numbers`

**Authentication**: Required

**Response** (200 OK):
```csv
id,userId,phoneNumber,agentConfigId,sipTrunkId,status,createdAt
phone-123,user-456,+12345678900,agent-789,trunk-abc,active,2025-10-30T12:00:00Z
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  https://ai.epic.dm/api/exports/phone-numbers \
  -o phone_numbers_export.csv
```

#### 4. Export LiveKit Events

Export raw LiveKit webhook events for debugging.

**Endpoint**: `GET /api/exports/events`

**Authentication**: Required

**Query Parameters**:
- `start_date` (string, optional): Start date
- `end_date` (string, optional): End date
- `event_type` (string, optional): Filter by event type

**Response** (200 OK):
```csv
id,eventId,event,roomName,participantIdentity,timestamp,processed,createdAt
event-123,evt_abc123,participant_left,room-xyz,agent,1698765432,1,2025-10-30T12:35:41Z
```

**Example**:
```bash
curl -H "Authorization: Bearer YOUR_JWT" \
  "https://ai.epic.dm/api/exports/events?event_type=participant_left" \
  -o events_export.csv
```

#### 5. Export Health Check

Verify export API is operational.

**Endpoint**: `GET /api/exports/health`

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "status": "healthy",
  "database_connected": true,
  "exports_enabled": true
}
```

#### 6. Export API Info

Get information about available export endpoints.

**Endpoint**: `GET /api/exports/info`

**Authentication**: Not required

**Response** (200 OK):
```json
{
  "version": "1.0",
  "endpoints": [
    {"path": "/calls", "description": "Export call logs"},
    {"path": "/agents", "description": "Export agent configs"},
    {"path": "/phone-numbers", "description": "Export phone numbers"},
    {"path": "/events", "description": "Export LiveKit events"}
  ],
  "rate_limit": "10 requests/minute"
}
```

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse and ensure fair usage.

### Rate Limit Tiers

| Tier | Limit | Endpoints |
|------|-------|-----------|
| **PUBLIC** | 20 req/min | Health checks, info endpoints |
| **AUTHENTICATED** | 100 req/min | Standard API operations |
| **HEAVY** | 10 req/min | CSV exports, bulk operations |
| **WEBHOOK** | 30 req/min | External webhook callbacks |

### Rate Limit Headers

All responses include rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1698765432
```

### Rate Limit Exceeded (429)

When rate limit is exceeded:

**Response** (429 Too Many Requests):
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Limit: 10 requests per 60 seconds.",
  "limit": 10,
  "remaining": 0,
  "reset": 1698765432,
  "retry_after": 45
}
```

**Headers**:
```http
Retry-After: 45
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1698765432
```

**Best Practices**:
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff when rate limited
- Respect `Retry-After` header value
- Use webhooks for real-time updates instead of polling

### Rate Limit Management API

#### Get Rate Limit Configuration

**Endpoint**: `GET /api/rate-limits`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "success": true,
  "rate_limits": {
    "/api/agents": "100 requests/minute",
    "/api/exports/calls": "10 requests/minute",
    "/api/call-outcomes": "100 requests/minute"
  },
  "total_endpoints": 15
}
```

#### Get Rate Limit Statistics

**Endpoint**: `GET /api/rate-limits/stats`

**Authentication**: Required (Admin)

**Response** (200 OK):
```json
{
  "success": true,
  "stats": {
    "total_endpoints": 15,
    "total_tracked_users": 42,
    "endpoints": {
      "/api/exports/calls": 12,
      "/api/call-outcomes": 8
    }
  }
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error description",
  "code": "ERROR_CODE",
  "timestamp": "2025-10-30T12:34:56Z"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required or failed |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error (contact support) |
| 503 | Service Unavailable | Temporary service outage |

### Common Errors

#### Authentication Error (401)
```json
{
  "error": "Unauthorized",
  "message": "Authentication required. Please provide valid JWT token.",
  "code": "AUTH_REQUIRED"
}
```

#### Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Call with ID 'call-123' not found or access denied",
  "code": "RESOURCE_NOT_FOUND"
}
```

#### Validation Error (400)
```json
{
  "error": "Bad Request",
  "message": "Invalid date format. Expected ISO 8601 (YYYY-MM-DD)",
  "code": "INVALID_PARAMETER",
  "field": "start_date"
}
```

---

## Webhooks

Epic Voice AI can send webhook notifications for call events.

### LiveKit Webhook Integration

**Endpoint**: `POST /api/call-outcomes/webhooks/call_completed`

**Authentication**: HMAC-SHA256 signature in `X-LiveKit-Signature` header

**Payload** (from LiveKit):
```json
{
  "event": "participant_left",
  "id": "evt_abc123xyz",
  "createdAt": 1698765432,
  "room": {
    "name": "sip-2345678900__abc123",
    "sid": "RM_xyz789",
    "creationTime": 1698765400
  },
  "participant": {
    "sid": "PA_participant123",
    "identity": "agent",
    "disconnectReason": "CLIENT_INITIATED"
  }
}
```

**Signature Validation**:
```python
import hmac
import hashlib

def validate_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Event processed",
  "event_id": "evt_abc123xyz"
}
```

**Idempotency**: Duplicate events (same `event_id`) are automatically ignored and return 200 OK.

---

## Common Patterns

### Pagination

For endpoints supporting pagination:

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `per_page` (integer, optional): Items per page (default: 50, max: 100)

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "per_page": 50,
    "total_pages": 5,
    "total_items": 234
  }
}
```

### Date Filtering

Use ISO 8601 format for dates:
- `YYYY-MM-DD`: Date only (e.g., `2025-10-30`)
- `YYYY-MM-DDTHH:MM:SSZ`: Full timestamp (e.g., `2025-10-30T12:34:56Z`)

**Example**:
```bash
curl "https://ai.epic.dm/api/exports/calls?start_date=2025-10-01&end_date=2025-10-30"
```

### Streaming Responses

CSV exports use chunked transfer encoding for memory efficiency:

```python
import requests

response = requests.get(
    'https://ai.epic.dm/api/exports/calls',
    headers={'Authorization': f'Bearer {token}'},
    stream=True
)

with open('export.csv', 'wb') as f:
    for chunk in response.iter_content(chunk_size=8192):
        f.write(chunk)
```

### CORS Support

API supports CORS for browser-based applications:

**Allowed Origins**:
- `https://ai.epic.dm`
- `http://localhost:3000` (development)
- `http://localhost:3001` (development)

**Allowed Methods**: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

**Credentials**: Supported (cookies, authorization headers)

---

## SDK Examples

### Python

```python
import requests

class EpicVoiceAPI:
    def __init__(self, api_key, base_url='https://ai.epic.dm'):
        self.api_key = api_key
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {api_key}'
        })

    def get_call_outcome(self, call_id):
        """Retrieve call outcome by ID"""
        response = self.session.get(
            f'{self.base_url}/api/call-outcomes/calls/{call_id}/outcome'
        )
        response.raise_for_status()
        return response.json()

    def export_calls(self, start_date=None, end_date=None, outcome=None):
        """Export call logs to CSV"""
        params = {}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        if outcome:
            params['outcome'] = outcome

        response = self.session.get(
            f'{self.base_url}/api/exports/calls',
            params=params,
            stream=True
        )
        response.raise_for_status()
        return response.content

# Usage
api = EpicVoiceAPI('your-api-key')
outcome = api.get_call_outcome('call-123')
print(f"Call outcome: {outcome['outcome']}")
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

class EpicVoiceAPI {
  constructor(apiKey, baseURL = 'https://ai.epic.dm') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
  }

  async getCallOutcome(callId) {
    const response = await this.client.get(
      `/api/call-outcomes/calls/${callId}/outcome`
    );
    return response.data;
  }

  async exportCalls(filters = {}) {
    const response = await this.client.get('/api/exports/calls', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  }
}

// Usage
const api = new EpicVoiceAPI('your-api-key');
const outcome = await api.getCallOutcome('call-123');
console.log(`Call outcome: ${outcome.outcome}`);
```

### cURL

```bash
# Get call outcome
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://ai.epic.dm/api/call-outcomes/calls/call-123/outcome

# Export calls with filters
curl -H "Authorization: Bearer YOUR_API_KEY" \
  "https://ai.epic.dm/api/exports/calls?start_date=2025-10-01&outcome=completed" \
  -o calls_export.csv

# Check rate limit status
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://ai.epic.dm/api/rate-limits
```

---

## Support & Resources

- **Documentation**: https://ai.epic.dm/docs
- **API Status**: https://status.epic.dm
- **Support Email**: support@epic.dm
- **GitHub Issues**: https://github.com/epicvoice/issues

---

## Changelog

### Version 1.0 (2025-10-30)
- ✅ Call Outcomes API with automatic classification
- ✅ CSV Export API with streaming support
- ✅ Rate limiting with tiered limits
- ✅ LiveKit webhook integration
- ✅ Multi-tenant data isolation
- ✅ HMAC signature validation
- ✅ Comprehensive error handling

---

**Last Updated**: October 30, 2025
**API Version**: 1.0
**Documentation Version**: 1.0.0
