# Call Outcomes API Reference

**Version**: 1.0.0
**Base URL**: `/api`
**Authentication**: Bearer Token (JWT) for protected endpoints

---

## Table of Contents

1. [Endpoints Overview](#endpoints-overview)
2. [Webhook Endpoint](#webhook-endpoint)
3. [Outcome Retrieval Endpoint](#outcome-retrieval-endpoint)
4. [Health Check Endpoint](#health-check-endpoint)
5. [Data Models](#data-models)
6. [Error Responses](#error-responses)
7. [Code Examples](#code-examples)

---

## Endpoints Overview

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/webhooks/call_completed` | Receive LiveKit webhook events | No (Signature) |
| GET | `/calls/:id/outcome` | Retrieve call outcome by ID | Yes (User JWT) |
| GET | `/webhooks/call_completed/health` | Health check endpoint | No |

---

## Webhook Endpoint

### POST /api/webhooks/call_completed

Receives webhook events from LiveKit when calls are completed. This endpoint validates webhook signatures, processes events idempotently, and updates call outcomes in the database.

**Request Headers**:
```
Content-Type: application/json
X-LiveKit-Signature: <hmac-sha256-signature>
```

**Sample LiveKit Webhook Payload**:
```json
{
  "id": "evt_abc123def456",
  "event": "participant_left",
  "createdAt": "2025-10-29T15:30:45.123Z",
  "room": {
    "name": "sip-7678189426__1730217045__abc123",
    "sid": "RM_xyz789abc123",
    "creationTime": "2025-10-29T15:30:00.000Z",
    "metadata": ""
  },
  "participant": {
    "sid": "PA_participant123",
    "identity": "agent",
    "state": "disconnected",
    "metadata": "",
    "joinedAt": "2025-10-29T15:30:02.000Z",
    "name": "",
    "version": 0,
    "permission": {
      "canSubscribe": true,
      "canPublish": true,
      "canPublishData": true,
      "hidden": false,
      "recorder": false
    },
    "disconnectReason": "CLIENT_INITIATED"
  },
  "egressInfo": {
    "egressId": "EG_recording123",
    "roomId": "RM_xyz789abc123",
    "status": "EGRESS_COMPLETE",
    "startedAt": "2025-10-29T15:30:05.000Z",
    "endedAt": "2025-10-29T15:30:45.123Z",
    "fileResults": [
      {
        "filename": "recording.mp3",
        "duration": 40123,
        "size": 320984,
        "location": "s3://bucket/recordings/recording.mp3",
        "downloadUrl": "https://cdn.example.com/recordings/recording.mp3"
      }
    ]
  }
}
```

**Normalized Event (Internal Processing)**:

After transformation, the webhook payload is normalized to:
```json
{
  "event_id": "evt_abc123def456",
  "event_type": "participant_left",
  "room_name": "sip-7678189426__1730217045__abc123",
  "room_sid": "RM_xyz789abc123",
  "participant_identity": "agent",
  "disconnect_reason": "CLIENT_INITIATED",
  "room_creation_time": "2025-10-29T15:30:00.000Z",
  "event_created_at": "2025-10-29T15:30:45.123Z",
  "phone_number": "+17678189426",
  "campaign_id": null,
  "duration": 45,
  "recording_url": "https://cdn.example.com/recordings/recording.mp3",
  "raw_payload": { /* original webhook payload */ }
}
```

**Success Response** (200 OK):
```json
{
  "status": "processed",
  "message": "Event processed successfully. Outcome: completed",
  "event_id": "evt_abc123def456",
  "call_id": "call_log_123"
}
```

**Duplicate Event Response** (200 OK):
```json
{
  "status": "processed",
  "message": "Event already processed (idempotency)",
  "event_id": "evt_abc123def456"
}
```

**Ignored Event Response** (200 OK):
```json
{
  "status": "ignored",
  "message": "Event type 'track_published' is not processable",
  "event_type": "track_published"
}
```

**Error Responses**:

**401 Unauthorized** - Invalid signature:
```json
{
  "error": "Invalid webhook signature",
  "status": 401
}
```

**400 Bad Request** - Malformed payload:
```json
{
  "error": "Invalid webhook payload",
  "details": "Missing required field: event_id",
  "status": 400
}
```

**500 Internal Server Error** - Processing failure:
```json
{
  "error": "Failed to process webhook event",
  "message": "Database connection failed",
  "status": 500
}
```

---

## Outcome Retrieval Endpoint

### GET /api/calls/:id/outcome

Retrieves the outcome and metadata for a completed call. Enforces multi-tenant isolation by requiring userId parameter.

**Path Parameters**:
- `id` (string, required) - Call log ID (UUID format)

**Query Parameters**:
- `user_id` (string, required) - User ID for multi-tenant isolation

**Request Headers**:
```
Authorization: Bearer <jwt-token>
```

**Example Request**:
```http
GET /api/calls/call_log_abc123/outcome?user_id=user_xyz789
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Success Response** (200 OK):
```json
{
  "id": "call_log_abc123",
  "userId": "user_xyz789",
  "agentConfigId": "agent_config_456",
  "livekitRoomName": "sip-7678189426__1730217045__abc123",
  "livekitRoomSid": "RM_xyz789abc123",
  "direction": "inbound",
  "phoneNumber": "+17678189426",
  "sipCallId": "sip-call-123",
  "status": "ended",
  "outcome": "completed",
  "duration": 45,
  "recordingUrl": "https://cdn.example.com/recordings/recording.mp3",
  "metadata": {
    "disconnect_reason": "CLIENT_INITIATED",
    "participant_identity": "agent",
    "room_creation_time": "2025-10-29T15:30:00.000Z"
  },
  "startedAt": "2025-10-29T15:30:00.000Z",
  "endedAt": "2025-10-29T15:30:45.123Z",
  "createdAt": "2025-10-29T15:30:00.500Z",
  "updatedAt": "2025-10-29T15:30:45.500Z"
}
```

**Outcome Types**:
- `completed` - Call duration ≥ 10 seconds, successful conversation
- `no_answer` - Call duration < 10 seconds, party did not answer
- `busy` - Disconnect reason contains "busy" signal
- `failed` - Call duration < 3 seconds or error in disconnect reason

**Error Responses**:

**404 Not Found** - Call not found or unauthorized:
```json
{
  "error": "Call not found",
  "call_id": "call_log_abc123",
  "status": 404
}
```

**400 Bad Request** - Missing user_id:
```json
{
  "error": "Missing required parameter: user_id",
  "status": 400
}
```

**401 Unauthorized** - Invalid or missing token:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired JWT token",
  "status": 401
}
```

---

## Health Check Endpoint

### GET /api/webhooks/call_completed/health

Simple health check endpoint to verify the service is running.

**Request**:
```http
GET /api/webhooks/call_completed/health
```

**Success Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "call_outcomes",
  "version": "1.0.0",
  "timestamp": "2025-10-29T15:30:45.123Z"
}
```

---

## Data Models

### CallLog Model

Database model for call logs with outcome tracking.

```typescript
interface CallLog {
  id: string;                    // UUID primary key
  userId: string;                // Foreign key to users table
  agentConfigId?: string;        // Foreign key to agent_configs table
  livekitRoomName: string;       // LiveKit room identifier
  livekitRoomSid: string;        // LiveKit room SID (unique)
  direction: 'inbound' | 'outbound';
  phoneNumber: string;           // E.164 format (e.g., +17678189426)
  sipCallId?: string;            // SIP call identifier
  status: 'active' | 'ended' | 'failed';
  outcome?: 'completed' | 'no_answer' | 'busy' | 'failed';
  duration?: number;             // Call duration in seconds
  recordingUrl?: string;         // URL to call recording
  metadata?: Record<string, any>; // JSONB flexible metadata
  startedAt: string;             // ISO 8601 timestamp
  endedAt?: string;              // ISO 8601 timestamp
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

### LiveKitCallEvent Model

Database model for webhook event records with idempotency.

```typescript
interface LiveKitCallEvent {
  id: string;                    // UUID primary key
  userId: string;                // Foreign key to users table
  callLogId?: string;            // Foreign key to call_logs table
  eventId: string;               // LiveKit event ID (UNIQUE - idempotency key)
  event: string;                 // Event type (e.g., 'participant_left')
  roomName: string;              // Room identifier
  roomSid?: string;              // LiveKit room SID
  participantIdentity?: string;  // Participant identifier
  disconnectReason?: string;     // Disconnect reason
  rawPayload: Record<string, any>; // JSONB original webhook payload
  processed: 0 | 1;              // Processing status flag
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

---

## Error Responses

### Standard Error Format

All error responses follow this structure:

```typescript
interface ErrorResponse {
  error: string;          // Human-readable error message
  status: number;         // HTTP status code
  details?: string;       // Additional error details
  field?: string;         // Field that caused validation error (if applicable)
  timestamp?: string;     // ISO 8601 timestamp
}
```

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful request |
| 400 | Bad Request | Invalid request payload or parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 404 | Not Found | Resource not found or unauthorized access |
| 500 | Internal Server Error | Server-side processing error |

---

## Code Examples

### Example 1: LiveKit Webhook Configuration

Configure LiveKit Cloud to send webhooks to your endpoint:

```python
# LiveKit Cloud Dashboard Configuration
webhook_url = "https://your-domain.com/api/webhooks/call_completed"
webhook_secret = "your-webhook-secret-here"

events = [
    "participant_left",
    "room_finished",
    "egress_ended"
]
```

### Example 2: Webhook Signature Verification (Python)

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload_bytes: bytes, signature: str, secret: str) -> bool:
    """Verify HMAC-SHA256 signature from LiveKit webhook."""
    expected = hmac.new(
        secret.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    ).hexdigest()

    # Constant-time comparison (timing-attack safe)
    return hmac.compare_digest(expected, signature)

# Usage
payload = request.data  # Raw request body bytes
signature = request.headers.get('X-LiveKit-Signature')
secret = os.environ.get('LIVEKIT_WEBHOOK_SECRET')

if verify_webhook_signature(payload, signature, secret):
    # Process webhook
    event = json.loads(payload)
else:
    # Reject invalid signature
    return {"error": "Invalid signature"}, 401
```

### Example 3: Processing Webhook (Python)

```python
from flask import Blueprint, request, jsonify
from backend.call_outcomes.transformer import LiveKitWebhookTransformer
from backend.call_outcomes.service import CallOutcomeService

call_outcomes_bp = Blueprint('call_outcomes', __name__)
transformer = LiveKitWebhookTransformer()
service = CallOutcomeService()

@call_outcomes_bp.route('/webhooks/call_completed', methods=['POST'])
def webhook_call_completed():
    """Receive LiveKit webhook events."""
    # Verify signature
    signature = request.headers.get('X-LiveKit-Signature', '')
    secret = os.environ.get('LIVEKIT_WEBHOOK_SECRET')

    if not transformer.validate_signature(request.data, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401

    # Transform webhook payload
    event = transformer.transform(request.json)
    if not event:
        return jsonify({'status': 'ignored'}), 200

    # Process event
    success, message = service.process_webhook_event(event)

    if success:
        return jsonify({
            'status': 'processed',
            'message': message
        }), 200
    else:
        return jsonify({
            'error': 'Processing failed',
            'message': message
        }), 500
```

### Example 4: Retrieving Call Outcome (Python)

```python
@call_outcomes_bp.route('/calls/<call_id>/outcome', methods=['GET'])
def get_call_outcome(call_id: str):
    """Retrieve call outcome by ID."""
    # Extract user_id from JWT token (in production)
    user_id = request.args.get('user_id')

    if not user_id:
        return jsonify({'error': 'Missing user_id parameter'}), 400

    # Retrieve outcome (multi-tenant safe)
    outcome = service.get_call_outcome(call_id, user_id)

    if not outcome:
        return jsonify({'error': 'Call not found'}), 404

    return jsonify(outcome), 200
```

### Example 5: JavaScript/TypeScript Client

```typescript
// Retrieve call outcome from client
async function getCallOutcome(callId: string, userId: string): Promise<CallLog> {
  const response = await fetch(
    `/api/calls/${callId}/outcome?user_id=${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retrieve call outcome');
  }

  return await response.json();
}

// Usage
try {
  const outcome = await getCallOutcome('call_log_abc123', 'user_xyz789');
  console.log(`Call outcome: ${outcome.outcome}`);
  console.log(`Duration: ${outcome.duration}s`);

  if (outcome.recordingUrl) {
    console.log(`Recording: ${outcome.recordingUrl}`);
  }
} catch (error) {
  console.error('Error:', error.message);
}
```

### Example 6: React Hook for Call Outcomes

```typescript
import { useState, useEffect } from 'react';

interface UseCallOutcomeResult {
  outcome: CallLog | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

function useCallOutcome(callId: string, userId: string): UseCallOutcomeResult {
  const [outcome, setOutcome] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcome = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/calls/${callId}/outcome?user_id=${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch call outcome');
      }

      const data = await response.json();
      setOutcome(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutcome();
  }, [callId, userId]);

  return { outcome, loading, error, refresh: fetchOutcome };
}

// Usage in component
function CallOutcomeDisplay({ callId, userId }: Props) {
  const { outcome, loading, error, refresh } = useCallOutcome(callId, userId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!outcome) return <div>Call not found</div>;

  return (
    <div>
      <h3>Call Outcome: {outcome.outcome}</h3>
      <p>Duration: {outcome.duration}s</p>
      <p>Phone: {outcome.phoneNumber}</p>

      {outcome.recordingUrl && (
        <audio controls src={outcome.recordingUrl} />
      )}

      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Example 7: Curl Commands for Testing

```bash
# Health check
curl -X GET http://localhost:5000/api/webhooks/call_completed/health

# Retrieve call outcome
curl -X GET "http://localhost:5000/api/calls/call_log_abc123/outcome?user_id=user_xyz789" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send test webhook (for local testing)
curl -X POST http://localhost:5000/api/webhooks/call_completed \
  -H "Content-Type: application/json" \
  -H "X-LiveKit-Signature: YOUR_HMAC_SIGNATURE" \
  -d '{
    "id": "evt_test_123",
    "event": "participant_left",
    "createdAt": "2025-10-29T15:30:45.123Z",
    "room": {
      "name": "sip-7678189426__1730217045__test",
      "sid": "RM_test_123",
      "creationTime": "2025-10-29T15:30:00.000Z"
    },
    "participant": {
      "sid": "PA_test_123",
      "identity": "agent",
      "disconnectReason": "CLIENT_INITIATED"
    }
  }'
```

---

## OpenAPI 3.0 Specification

Complete OpenAPI specification for the Call Outcomes API:

```yaml
openapi: 3.0.3
info:
  title: Call Outcomes API
  description: API for receiving LiveKit webhooks and retrieving call outcomes
  version: 1.0.0
  contact:
    name: Epic Voice Suite Support
    email: support@epicvoice.com

servers:
  - url: https://your-domain.com/api
    description: Production server
  - url: http://localhost:5000/api
    description: Development server

paths:
  /webhooks/call_completed:
    post:
      summary: Receive LiveKit webhook events
      description: |
        Endpoint for receiving webhook events from LiveKit when calls are completed.
        Validates HMAC-SHA256 signature, processes events idempotently, and updates call outcomes.
      operationId: receiveWebhook
      tags:
        - Webhooks
      parameters:
        - name: X-LiveKit-Signature
          in: header
          required: true
          schema:
            type: string
          description: HMAC-SHA256 signature for webhook validation
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/LiveKitWebhook'
            examples:
              participant_left:
                $ref: '#/components/examples/ParticipantLeftWebhook'
      responses:
        '200':
          description: Webhook processed successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WebhookResponse'
              examples:
                processed:
                  value:
                    status: processed
                    message: "Event processed successfully. Outcome: completed"
                    event_id: evt_abc123def456
                duplicate:
                  value:
                    status: processed
                    message: "Event already processed (idempotency)"
                    event_id: evt_abc123def456
                ignored:
                  value:
                    status: ignored
                    message: "Event type 'track_published' is not processable"
        '401':
          description: Invalid webhook signature
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: Malformed webhook payload
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '500':
          description: Internal server error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /calls/{callId}/outcome:
    get:
      summary: Retrieve call outcome
      description: |
        Retrieves the outcome and metadata for a completed call.
        Enforces multi-tenant isolation by requiring userId parameter.
      operationId: getCallOutcome
      tags:
        - Calls
      security:
        - bearerAuth: []
      parameters:
        - name: callId
          in: path
          required: true
          schema:
            type: string
          description: Call log ID (UUID format)
        - name: user_id
          in: query
          required: true
          schema:
            type: string
          description: User ID for multi-tenant isolation
      responses:
        '200':
          description: Call outcome retrieved successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CallLog'
              examples:
                completed_call:
                  $ref: '#/components/examples/CompletedCall'
        '404':
          description: Call not found or unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '400':
          description: Missing required parameters
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
        '401':
          description: Unauthorized
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

  /webhooks/call_completed/health:
    get:
      summary: Health check
      description: Simple health check endpoint to verify service is running
      operationId: healthCheck
      tags:
        - Health
      responses:
        '200':
          description: Service is healthy
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    LiveKitWebhook:
      type: object
      required:
        - id
        - event
        - createdAt
        - room
      properties:
        id:
          type: string
          description: Unique event identifier from LiveKit
        event:
          type: string
          enum: [participant_left, room_finished, egress_ended]
          description: Event type
        createdAt:
          type: string
          format: date-time
          description: ISO 8601 timestamp
        room:
          type: object
          required:
            - name
            - sid
          properties:
            name:
              type: string
            sid:
              type: string
            creationTime:
              type: string
              format: date-time
        participant:
          type: object
          properties:
            sid:
              type: string
            identity:
              type: string
            disconnectReason:
              type: string
        egressInfo:
          type: object
          properties:
            egressId:
              type: string
            status:
              type: string
            fileResults:
              type: array
              items:
                type: object
                properties:
                  downloadUrl:
                    type: string

    CallLog:
      type: object
      required:
        - id
        - userId
        - direction
        - status
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        agentConfigId:
          type: string
          format: uuid
        livekitRoomName:
          type: string
        livekitRoomSid:
          type: string
        direction:
          type: string
          enum: [inbound, outbound]
        phoneNumber:
          type: string
          pattern: '^\+[1-9]\d{1,14}$'
        sipCallId:
          type: string
        status:
          type: string
          enum: [active, ended, failed]
        outcome:
          type: string
          enum: [completed, no_answer, busy, failed]
          nullable: true
        duration:
          type: integer
          nullable: true
        recordingUrl:
          type: string
          format: uri
          nullable: true
        metadata:
          type: object
          additionalProperties: true
          nullable: true
        startedAt:
          type: string
          format: date-time
        endedAt:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    WebhookResponse:
      type: object
      required:
        - status
        - message
      properties:
        status:
          type: string
          enum: [processed, ignored]
        message:
          type: string
        event_id:
          type: string
        call_id:
          type: string

    HealthResponse:
      type: object
      required:
        - status
        - service
      properties:
        status:
          type: string
          enum: [healthy]
        service:
          type: string
        version:
          type: string
        timestamp:
          type: string
          format: date-time

    Error:
      type: object
      required:
        - error
        - status
      properties:
        error:
          type: string
        status:
          type: integer
        details:
          type: string
        field:
          type: string
        timestamp:
          type: string
          format: date-time

  examples:
    ParticipantLeftWebhook:
      value:
        id: evt_abc123def456
        event: participant_left
        createdAt: "2025-10-29T15:30:45.123Z"
        room:
          name: sip-7678189426__1730217045__abc123
          sid: RM_xyz789abc123
          creationTime: "2025-10-29T15:30:00.000Z"
        participant:
          sid: PA_participant123
          identity: agent
          disconnectReason: CLIENT_INITIATED
        egressInfo:
          egressId: EG_recording123
          status: EGRESS_COMPLETE
          fileResults:
            - downloadUrl: https://cdn.example.com/recordings/recording.mp3

    CompletedCall:
      value:
        id: call_log_abc123
        userId: user_xyz789
        agentConfigId: agent_config_456
        livekitRoomName: sip-7678189426__1730217045__abc123
        livekitRoomSid: RM_xyz789abc123
        direction: inbound
        phoneNumber: "+17678189426"
        sipCallId: sip-call-123
        status: ended
        outcome: completed
        duration: 45
        recordingUrl: https://cdn.example.com/recordings/recording.mp3
        metadata:
          disconnect_reason: CLIENT_INITIATED
          participant_identity: agent
        startedAt: "2025-10-29T15:30:00.000Z"
        endedAt: "2025-10-29T15:30:45.123Z"
        createdAt: "2025-10-29T15:30:00.500Z"
        updatedAt: "2025-10-29T15:30:45.500Z"
```

---

## Rate Limiting

Currently, no rate limiting is enforced. Future versions may implement:
- Webhook endpoint: 100 requests/minute per IP
- Outcome retrieval: 1000 requests/minute per user

---

## Changelog

### Version 1.0.0 (2025-10-29)
- Initial release
- POST /webhooks/call_completed endpoint
- GET /calls/:id/outcome endpoint
- GET /webhooks/call_completed/health endpoint
- HMAC-SHA256 signature validation
- Idempotency protection
- Multi-tenant isolation

---

**Last Updated**: 2025-10-29
**API Version**: 1.0.0
**Status**: Production Ready
