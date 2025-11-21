# Agent Tools Implementation Guide 🛠️

**Date**: 2025-11-20 00:20
**Status**: Implementation Guide

---

## 🎯 Overview

You have **3 tools** to implement for your AI agents:
1. **Email Follow-up** - Send emails after calls
2. **Calendar Booking** - Schedule appointments
3. **Human Handoff** - Transfer to live agents

You also mentioned **SMS Follow-up**, which follows the same pattern as Email.

---

## 🤔 Two Approaches

### Option 1: Direct Implementation (Pure Python/Flask)
**Pros:**
- Full control over logic
- No external dependencies
- Faster for simple operations

**Cons:**
- More code to write
- Need to handle retries, rate limits, etc.
- Each integration requires custom code

### Option 2: n8n Workflows (Recommended for Email/Calendar/SMS)
**Pros:**
- Visual workflow editor
- 400+ pre-built integrations
- Easy to modify without code changes
- Built-in retry/error handling
- You ALREADY have n8n set up! (https://n8n.ai.epic.dm)

**Cons:**
- External dependency
- Slight latency (network call to n8n)

---

## 💡 Recommended Approach (Hybrid)

| Tool | Method | Why |
|------|--------|-----|
| **Email Follow-up** | n8n Workflow | Multiple email providers, template support, scheduling |
| **Calendar Booking** | n8n Workflow | Google Calendar API complex, n8n handles OAuth |
| **Human Handoff** | Direct Implementation | Real-time SIP transfer, needs LiveKit integration |
| **SMS Follow-up** | n8n Workflow | Twilio/other SMS providers, same as email |

---

## 🚀 Implementation Plan

### Phase 1: Human Handoff (Direct - Highest Priority)

**Why Direct?** Real-time call transfer requires LiveKit SIP integration.

**Backend Implementation**:

1. **Create Tool Handler** - `/opt/livekit1/backend/agent_tools/handoff.py`
```python
"""
Human Handoff Tool - Transfer calls to live agents
"""
from livekit import api
import logging

logger = logging.getLogger(__name__)

class HandoffService:
    """Service for handling live agent handoffs"""

    def __init__(self, livekit_url: str, api_key: str, api_secret: str):
        self.livekit_url = livekit_url
        self.api_key = api_key
        self.api_secret = api_secret

    async def transfer_to_agent(
        self,
        room_name: str,
        agent_phone: str,
        caller_context: dict
    ) -> dict:
        """
        Transfer current call to a live agent

        Args:
            room_name: Current LiveKit room
            agent_phone: Phone number of live agent
            caller_context: Context about the caller/call

        Returns:
            dict with transfer status
        """
        try:
            # 1. Create SIP participant for live agent
            # 2. Add them to the room
            # 3. Remove AI agent from room
            # 4. Log handoff event

            logger.info(f"Transferring {room_name} to agent at {agent_phone}")

            # Implementation here...

            return {
                'success': True,
                'agent_phone': agent_phone,
                'timestamp': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"Handoff failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
```

2. **Add API Endpoint** - Update `/opt/livekit1/backend/agent_tools/routes.py`
```python
@agent_tools_bp.route('/<agent_id>/handoff', methods=['POST'])
def trigger_handoff(agent_id):
    """
    Trigger human handoff

    Request:
        {
            "room_name": "room-123",
            "agent_phone": "+15551234567",
            "context": {
                "reason": "Customer requested supervisor",
                "summary": "Issue with billing"
            }
        }
    """
    try:
        data = request.get_json()

        # Get user ID from email header
        user_id, error_response, status_code = get_user_id_from_email()
        if error_response:
            return error_response, status_code

        handoff_service = HandoffService(
            livekit_url=os.getenv('LIVEKIT_URL'),
            api_key=os.getenv('LIVEKIT_API_KEY'),
            api_secret=os.getenv('LIVEKIT_API_SECRET')
        )

        result = await handoff_service.transfer_to_agent(
            room_name=data['room_name'],
            agent_phone=data['agent_phone'],
            caller_context=data.get('context', {})
        )

        return jsonify({
            'success': True,
            'data': result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'code': 'HANDOFF_FAILED'}
        }), 500
```

3. **Agent Configuration** - Add handoff settings to agent config
```python
# In agent_configs table, add field:
handoff_numbers: JSON = Column(JSON)  # List of agent phone numbers

# Example:
{
    "handoff_numbers": [
        {"name": "Sales Manager", "phone": "+15551234567"},
        {"name": "Technical Support", "phone": "+15557654321"}
    ]
}
```

---

### Phase 2: Email Follow-up (n8n Workflow)

**Why n8n?** Email providers vary (Gmail, SendGrid, SMTP) - n8n handles all of them.

**Steps:**

1. **Create n8n Workflow** (via n8n UI at https://n8n.ai.epic.dm)

**Workflow Structure:**
```
Webhook Trigger
    ↓
Extract Call Data
    ↓
Load Email Template
    ↓
Send Email (Gmail/SendGrid/SMTP)
    ↓
Log Success/Failure
    ↓
Webhook Response
```

2. **Python Integration** - Add to `/opt/livekit1/backend/agent_tools/email_followup.py`
```python
"""
Email Follow-up Tool - Send emails after calls via n8n
"""
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class EmailFollowupService:
    """Service for email follow-ups via n8n"""

    def __init__(self, n8n_webhook_url: str):
        self.webhook_url = n8n_webhook_url

    def send_followup_email(
        self,
        to_email: str,
        call_summary: str,
        agent_name: str,
        template: str = "default"
    ) -> dict:
        """
        Send follow-up email via n8n workflow

        Args:
            to_email: Recipient email
            call_summary: Summary of the call
            agent_name: Name of the AI agent
            template: Email template to use

        Returns:
            dict with send status
        """
        try:
            payload = {
                'to': to_email,
                'subject': f'Follow-up from {agent_name}',
                'template': template,
                'data': {
                    'call_summary': call_summary,
                    'agent_name': agent_name,
                    'timestamp': datetime.utcnow().isoformat()
                }
            }

            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=30
            )
            response.raise_for_status()

            result = response.json()
            logger.info(f"✅ Email sent to {to_email}")

            return {
                'success': True,
                'message_id': result.get('message_id'),
                'sent_at': datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"❌ Email send failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
```

3. **Create n8n Workflow Using Your Client**
```python
from backend.n8n_integration.client import N8nClient

# Initialize client
n8n = N8nClient(
    base_url="https://n8n.ai.epic.dm",
    api_key=os.getenv('N8N_API_KEY')
)

# Create email follow-up workflow
workflow_data = {
    "name": "AI Agent Email Follow-up",
    "active": True,
    "nodes": [
        {
            "type": "n8n-nodes-base.webhook",
            "name": "Webhook Trigger",
            "parameters": {
                "path": "agent-email-followup",
                "httpMethod": "POST"
            }
        },
        {
            "type": "n8n-nodes-base.emailSend",
            "name": "Send Email",
            "parameters": {
                "fromEmail": "noreply@epic.dm",
                "toEmail": "={{ $json.to }}",
                "subject": "={{ $json.subject }}",
                "message": "={{ $json.data.call_summary }}"
            }
        }
    ],
    "connections": {
        "Webhook Trigger": {
            "main": [[{"node": "Send Email", "type": "main", "index": 0}]]
        }
    }
}

# Create workflow
workflow = n8n.create_workflow(workflow_data)
print(f"Webhook URL: {workflow['webhookUrl']}")
```

4. **Store Webhook URL** - Save to agent_tools table
```python
# When enabling email tool, create n8n workflow and store URL
agent_tool = AgentTool(
    id=str(uuid.uuid4()),
    agentconfigid=agent_id,
    userid=user_id,
    tooltype='email',
    toolname='Email Follow-up',
    isenabled=True,
    config=json.dumps({
        'enabled': True,
        'n8n_workflow_id': workflow['id'],
        'n8n_webhook_url': workflow['webhookUrl'],
        'template': 'default'
    })
)
```

---

### Phase 3: Calendar Booking (n8n Workflow)

**Why n8n?** Google Calendar OAuth is complex - n8n handles authentication.

**n8n Workflow Structure:**
```
Webhook Trigger
    ↓
Extract Booking Details
    ↓
Check Calendar Availability (Google Calendar API)
    ↓
Create Calendar Event
    ↓
Send Confirmation Email
    ↓
Return Booking Details
```

**Python Integration:**
```python
class CalendarService:
    """Service for calendar bookings via n8n"""

    def __init__(self, n8n_webhook_url: str):
        self.webhook_url = n8n_webhook_url

    def create_booking(
        self,
        customer_email: str,
        date_time: str,
        duration_minutes: int,
        meeting_type: str
    ) -> dict:
        """Create calendar booking via n8n"""
        try:
            payload = {
                'attendee_email': customer_email,
                'start_time': date_time,
                'duration': duration_minutes,
                'meeting_type': meeting_type
            }

            response = requests.post(
                self.webhook_url,
                json=payload,
                timeout=30
            )
            response.raise_for_status()

            booking = response.json()

            return {
                'success': True,
                'booking_id': booking['event_id'],
                'calendar_link': booking['meeting_link'],
                'confirmation_sent': True
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
```

---

### Phase 4: SMS Follow-up (n8n Workflow - Same as Email)

**n8n Workflow with Twilio:**
```
Webhook Trigger
    ↓
Extract SMS Data
    ↓
Send SMS (Twilio node)
    ↓
Log Delivery Status
    ↓
Webhook Response
```

---

## 🗂️ Database Schema Updates

Add to `agent_tools` config field:

```json
{
  "email": {
    "enabled": true,
    "n8n_workflow_id": "abc123",
    "n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/...",
    "provider": "gmail",
    "from_email": "agent@epic.dm",
    "templates": {
      "default": "Thank you for calling...",
      "followup": "As discussed..."
    }
  },
  "calendar": {
    "enabled": true,
    "n8n_workflow_id": "def456",
    "n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/...",
    "calendar_id": "primary",
    "timezone": "America/New_York",
    "booking_buffer_minutes": 15
  },
  "handoff": {
    "enabled": true,
    "agents": [
      {"name": "Sales Manager", "phone": "+15551234567"},
      {"name": "Tech Support", "phone": "+15557654321"}
    ],
    "default_agent": "+15551234567"
  },
  "sms": {
    "enabled": true,
    "n8n_workflow_id": "ghi789",
    "n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/...",
    "from_number": "+15559876543"
  }
}
```

---

## 📊 Implementation Priority

### Week 1: Human Handoff (Direct)
- **Day 1-2**: Implement `HandoffService` class
- **Day 3**: Add API endpoint
- **Day 4**: Test with LiveKit SIP
- **Day 5**: UI for configuring handoff numbers

### Week 2: Email Follow-up (n8n)
- **Day 1**: Create n8n workflow via UI
- **Day 2**: Implement `EmailFollowupService`
- **Day 3**: Add API endpoint
- **Day 4**: Store webhook URL in database
- **Day 5**: Test end-to-end

### Week 3: Calendar Booking (n8n)
- **Day 1-2**: Create n8n workflow with Google Calendar
- **Day 3**: Implement `CalendarService`
- **Day 4**: Add API endpoint
- **Day 5**: Test bookings

### Week 4: SMS Follow-up (n8n)
- **Day 1**: Create n8n workflow with Twilio
- **Day 2**: Implement `SMSService`
- **Day 3**: Add API endpoint
- **Day 4-5**: Test and polish

---

## 🧪 Testing Strategy

### Human Handoff Testing
1. Make AI agent call
2. Trigger handoff during call
3. Verify live agent receives call
4. Check AI agent disconnects
5. Verify handoff logged

### Email Follow-up Testing
1. Complete AI agent call
2. Trigger email follow-up
3. Check email delivered
4. Verify email content correct
5. Check delivery status logged

### Calendar Booking Testing
1. Request booking during call
2. Check calendar availability
3. Create calendar event
4. Verify confirmation email sent
5. Test calendar invite received

---

## 🎯 Quick Start (Next Steps)

### Option A: Start with Human Handoff (Recommended)
```bash
# 1. Create handoff service file
touch /opt/livekit1/backend/agent_tools/handoff.py

# 2. Implement HandoffService class (copy from guide above)

# 3. Add endpoint to routes.py

# 4. Test with your LiveKit setup
```

### Option B: Start with Email (Easier, n8n)
```bash
# 1. Go to https://n8n.ai.epic.dm

# 2. Create new workflow:
#    - Webhook trigger
#    - Email send node
#    - Activate workflow

# 3. Test webhook URL with curl:
curl -X POST https://n8n.ai.epic.dm/webhook/your-url \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "data": {"call_summary": "Test call"}
  }'

# 4. Implement Python service (copy from guide above)
```

---

## 📚 Resources

### n8n Documentation
- Workflows: https://docs.n8n.io/workflows/
- Google Calendar: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.googlecalendar/
- Email: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.emailsend/
- Twilio: https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio/

### Your Existing n8n Setup
- URL: https://n8n.ai.epic.dm
- API Key: In `.env` file
- Client Library: `/opt/livekit1/backend/n8n_integration/client.py`
- Existing Workflows: 19 workflows already created

### LiveKit SIP Documentation
- SIP Participants: https://docs.livekit.io/home/client/sip/
- Room API: https://docs.livekit.io/reference/server/room-service/

---

## 🤝 Need Help?

The architecture is **already set up** for n8n integration! You have:
- ✅ n8n instance running
- ✅ Python client library
- ✅ 19 existing workflows
- ✅ API integration code

**You just need to**:
1. Create the n8n workflows (visual editor)
2. Add Python service classes
3. Wire up API endpoints
4. Test each tool

**I recommend starting with Email Follow-up** because it's the easiest and will help you understand the n8n workflow pattern before tackling the more complex Calendar and Handoff implementations.

Would you like me to help implement any of these tools right now?
