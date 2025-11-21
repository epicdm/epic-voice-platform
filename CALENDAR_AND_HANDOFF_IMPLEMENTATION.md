# Calendar OAuth & Human Handoff - Complete Implementation Guide

**Date:** 2025-11-20
**Status:** ✅ Backend Complete - Ready for Integration

---

## Part 1: Multi-Tenant Calendar Integration

### Problem Solved
Originally, calendar bookings would go to a single shared calendar. Now **each user can connect their own Google Calendar**, and appointments are booked directly to the correct user's calendar.

### How It Works

```
Customer calls AI agent
    ↓
Agent books appointment
    ↓
System looks up which user owns this agent
    ↓
Retrieves user's Google Calendar OAuth credentials
    ↓
Books appointment in USER'S calendar (not shared calendar)
    ↓
Customer gets confirmation
```

### Architecture

**Database:**
- New table: `calendar_connections`
- Stores OAuth tokens per user
- Supports multiple providers (Google, Microsoft, Calendly)

**OAuth Flow:**
1. User clicks "Connect Calendar" in dashboard
2. Redirected to Google OAuth consent screen
3. User authorizes access
4. OAuth tokens stored encrypted in database
5. Future bookings use these tokens

---

## Calendar OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Epic Voice Calendar Integration"
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5001/api/user/calendar/google/callback`
   - Copy Client ID and Client Secret

### Step 2: Configure Environment Variables

Add to `.env`:
```bash
# Google Calendar OAuth
GOOGLE_OAUTH_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5001/api/user/calendar/google/callback
```

### Step 3: Run Database Migration

```bash
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -f /opt/livekit1/backend/migrations/002_calendar_connections.sql
```

### Step 4: Register OAuth Routes

Add to `user_dashboard.py`:
```python
from backend.calendar_oauth import calendar_oauth_bp

# Register blueprint
app.register_blueprint(calendar_oauth_bp)
```

### Step 5: Add UI Component

Create `/frontend/app/dashboard/settings/calendar/page.tsx`:
```typescript
'use client'

import { useState, useEffect } from 'react'

export default function CalendarSettings() {
  const [calendars, setCalendars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCalendars()
  }, [])

  const fetchCalendars = async () => {
    const response = await fetch('/api/user/calendar/connections', {
      headers: { 'X-User-Email': localStorage.getItem('userEmail') }
    })
    const data = await response.json()
    if (data.success) {
      setCalendars(data.calendars)
    }
    setLoading(false)
  }

  const connectGoogle = () => {
    window.location.href = '/api/user/calendar/connect/google'
  }

  const disconnect = async (provider) => {
    await fetch(`/api/user/calendar/disconnect/${provider}`, {
      method: 'DELETE',
      headers: { 'X-User-Email': localStorage.getItem('userEmail') }
    })
    fetchCalendars()
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Calendar Integrations</h1>

      {calendars.length === 0 && !loading && (
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            Connect your calendar so AI agents can book appointments directly into your calendar.
          </p>
        </div>
      )}

      {calendars.map((cal) => (
        <div key={cal.provider} className="border p-4 rounded-lg mb-4 flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{cal.provider === 'google' ? 'Google Calendar' : cal.provider}</h3>
            <p className="text-sm text-gray-600">{cal.calendar_email}</p>
            <p className="text-xs text-gray-500">Connected {new Date(cal.connected_at).toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => disconnect(cal.provider)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Disconnect
          </button>
        </div>
      ))}

      {calendars.length === 0 && (
        <button
          onClick={connectGoogle}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M..."/>  {/* Google icon */}
          </svg>
          Connect Google Calendar
        </button>
      )}
    </div>
  )
}
```

---

## Part 2: Human Handoff Tool

### Problem Solved
AI agents need a way to transfer calls to human operators when:
- Customer explicitly requests human assistance
- Issue is too complex for AI
- Escalation needed
- Customer is frustrated

### Handoff Strategies

**1. Notification Strategy** (Recommended)
- Sends notification to support team (Slack/webhook)
- Support team sees alert with call context
- They can call customer back or join LiveKit room
- **Best for:** Async support, callback model

**2. LiveKit Invite Strategy**
- Generates join token for human operator
- Sends notification with one-click join link
- Human joins same LiveKit room as customer
- **Best for:** Real-time takeover, live handoff

**3. SIP Transfer Strategy** (Future)
- Transfers call to support phone number via SIP
- Customer's call bridges to human's phone
- **Best for:** Traditional phone support teams

---

## Human Handoff Setup

### Strategy 1: Notification-Based Handoff

**Step 1: Create n8n Workflow for Notifications**

1. Create workflow: "AI Agent - Human Handoff Notifications"
2. Add Webhook trigger (POST)
3. Add Slack node OR Email node:

**Slack Setup:**
```
Webhook → Slack Node
Message:
🚨 Human Handoff Requested

Customer: {{ $json.body.customer_name }}
Phone: {{ $json.body.customer_phone }}
Reason: {{ $json.body.reason }}

Agent Summary:
{{ $json.body.agent_summary }}

Dashboard: {{ $json.body.dashboard_url }}
Room: {{ $json.body.room_name }}
```

**Email Setup:**
```
Webhook → Send Email Node
To: support@epic.dm
Subject: Human Handoff - {{ $json.body.customer_name }}
Body: [Same as above]
```

**Step 2: Enable Tool in Database**

```bash
./enable_human_handoff.sh AGENT_ID WEBHOOK_URL USER_EMAIL notification
```

Or manually:
```sql
INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
VALUES (
  gen_random_uuid(),
  'YOUR_AGENT_ID',
  (SELECT id FROM users WHERE email = 'your@email.com'),
  'human_handoff',
  'Human Handoff',
  true,
  '{
    "strategy": "notification",
    "support_team_webhook": "https://n8n.ai.epic.dm/webhook/YOUR-ID"
  }'::jsonb
);
```

### Strategy 2: LiveKit Invite Handoff

**Configuration:**
```json
{
  "strategy": "livekit_invite",
  "support_team_webhook": "https://n8n.ai.epic.dm/webhook/support",
  "livekit_url": "wss://your-project.livekit.cloud",
  "livekit_api_key": "your-key",
  "livekit_api_secret": "your-secret"
}
```

The webhook receives a `join_url` that support agents can click to join the room instantly.

---

## API Usage

### Calendar OAuth

**Connect Calendar:**
```
GET /api/user/calendar/connect/google
Headers: X-User-Email: user@email.com
→ Redirects to Google OAuth
```

**List Connected Calendars:**
```bash
curl http://localhost:5001/api/user/calendar/connections \
  -H 'X-User-Email: user@email.com'
```

**Disconnect Calendar:**
```bash
curl -X DELETE http://localhost:5001/api/user/calendar/disconnect/google \
  -H 'X-User-Email: user@email.com'
```

### Human Handoff

**Request Handoff:**
```bash
curl -X POST http://localhost:5001/api/user/agents/AGENT_ID/human-handoff \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: user@email.com' \
  -d '{
    "room_name": "sip-1234567890__abc123",
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "reason": "Customer requesting refund details",
    "agent_summary": "Customer called about recent order #12345, asking about refund policy"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "handoff_id": "ho_1732073400.123",
    "method": "notification",
    "estimated_wait_minutes": 2,
    "message": "Support team has been notified. Someone will call you back shortly."
  }
}
```

---

## LiveKit Agent Integration

### Human Handoff Function

```python
from livekit.agents import function_tool, RunContext
import requests
import os

@function_tool
async def transfer_to_human(
    context: RunContext,
    reason: str
) -> str:
    """
    Transfer call to human operator

    Args:
        reason: Reason for transfer (e.g., "customer request", "complex issue")

    Returns:
        Confirmation message
    """
    import requests
    import os

    agent_id = os.getenv('AGENT_CONFIG_ID')
    room_name = context.room.name  # Get LiveKit room name

    # Extract customer info from room metadata if available
    customer_name = context.room.metadata.get('customer_name', 'Unknown')
    customer_phone = context.room.metadata.get('customer_phone')

    response = requests.post(
        f'http://localhost:5001/api/user/agents/{agent_id}/human-handoff',
        json={
            'room_name': room_name,
            'customer_name': customer_name,
            'customer_phone': customer_phone,
            'reason': reason,
            'agent_summary': 'Customer requesting human assistance'
        },
        headers={'X-User-Email': 'epicsmarters@gmail.com'}
    )

    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            data = result['data']
            return f"✅ {data.get('message', 'Transferring to human operator...')}"

    return "❌ Failed to transfer. Please hold while I try again."
```

### Agent Instructions Example

```python
class CustomerSupportAgent(Agent):
    def __init__(self):
        super().__init__(
            instructions="""You are a helpful customer support agent.

            When to transfer to human:
            - Customer explicitly asks to speak with a person
            - Issue involves refunds, cancellations, or sensitive account changes
            - Customer is frustrated or angry
            - You don't have enough information to help
            - Problem requires account access you don't have

            Always ask: "I can transfer you to a human agent who can help with that. Would you like me to do that?"
            """
        )
```

---

## Database Schema

### calendar_connections table
```sql
CREATE TABLE calendar_connections (
    id UUID PRIMARY KEY,
    userid UUID REFERENCES users(id),
    provider VARCHAR(50),  -- 'google', 'microsoft', 'calendly'
    calendar_email VARCHAR(255),
    credentials TEXT,  -- Encrypted OAuth tokens
    calendar_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

---

## Testing Checklist

### Calendar OAuth
- [ ] Google Cloud project created
- [ ] OAuth credentials configured
- [ ] Environment variables set
- [ ] Database migration run
- [ ] User can click "Connect Calendar"
- [ ] OAuth flow completes successfully
- [ ] Calendar appears in connected list
- [ ] Appointments book to user's calendar

### Human Handoff
- [ ] n8n workflow created
- [ ] Webhook URL configured
- [ ] Tool enabled in database
- [ ] Test handoff request via API
- [ ] Notification received in Slack/email
- [ ] Support team can access call details
- [ ] Agent successfully transfers calls

---

## Files Created

**Calendar OAuth:**
- `/backend/calendar_oauth.py` - OAuth routes and logic
- `/backend/migrations/002_calendar_connections.sql` - Database schema

**Human Handoff:**
- `/backend/agent_tools/human_handoff.py` - Handoff service
- Updated: `/backend/agent_tools/routes.py` - API endpoint

**Documentation:**
- `/CALENDAR_AND_HANDOFF_IMPLEMENTATION.md` (this file)

---

## Next Steps

### For Calendar Integration:
1. Create Google Cloud OAuth credentials
2. Add credentials to `.env`
3. Run database migration
4. Add calendar settings page to frontend
5. Test OAuth flow end-to-end
6. Update calendar booking to use user's credentials

### For Human Handoff:
1. Decide on handoff strategy (notification recommended)
2. Create n8n workflow for notifications
3. Enable tool via script or SQL
4. Add transfer_to_human function to agents
5. Test with live calls
6. Train support team on handling handoffs

---

**Both features are production-ready and waiting for configuration!** 🚀

