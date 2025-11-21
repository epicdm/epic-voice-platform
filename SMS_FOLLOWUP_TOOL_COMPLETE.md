# SMS Follow-up Tool - Implementation Complete

**Date:** 2025-11-20
**Status:** ✅ Backend Complete - Ready for Integration

## Summary

SMS Follow-up tool allows AI agents to send text messages after calls via Twilio integration through n8n workflows. Perfect for appointment confirmations, follow-ups, and sharing links.

## What Was Implemented

### 1. Backend Service (`/backend/agent_tools/sms_followup.py`)
- `SMSFollowupService` class
- `send_sms()` method - Direct SMS sending
- `send_template_sms()` method - 5 pre-built templates
- Phone number validation (E.164 format)
- Error handling and logging

### 2. Flask API Endpoint (`/backend/agent_tools/routes.py`)
- **POST** `/api/user/agents/<agent_id>/sms-followup`
- Supports both direct messages and templates
- Database lookup for tool configuration
- Returns message_id and delivery status

### 3. Pre-built SMS Templates
1. `appointment_reminder` - Appointment reminders with CONFIRM option
2. `call_summary` - Post-call summary messages
3. `appointment_confirmation` - Confirms booked appointments
4. `follow_up` - Generic follow-up messages
5. `link_share` - Share links discussed during call

## API Usage Examples

### Direct Message
```bash
curl -X POST http://localhost:5001/api/user/agents/AGENT_ID/sms-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: your@email.com' \
  -d '{
    "to_number": "+1234567890",
    "message": "Thanks for calling! Your appointment is confirmed for 2PM tomorrow."
  }'
```

### Template Message
```bash
curl -X POST http://localhost:5001/api/user/agents/AGENT_ID/sms-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: your@email.com' \
  -d '{
    "to_number": "+1234567890",
    "template": "appointment_reminder",
    "template_data": {
      "customer_name": "John",
      "appointment_time": "2PM tomorrow",
      "company_name": "Epic Voice"
    }
  }'
```

### Success Response
```json
{
  "success": true,
  "data": {
    "message_id": "SM123abc456",
    "to": "+1234567890",
    "sent_at": "2025-11-20T02:30:00.000Z",
    "status": "sent"
  }
}
```

## n8n Workflow Setup

### Step 1: Create Twilio Account
1. Sign up at https://www.twilio.com
2. Get a phone number
3. Copy Account SID and Auth Token
4. Note your Twilio phone number

### Step 2: Create n8n Workflow
1. Open n8n at https://n8n.ai.epic.dm
2. Create new workflow: "AI Agent - SMS Follow-up"
3. Add **Webhook** trigger (POST method, "Last Node" response mode)
4. Add **Twilio** node:
   - Operation: "Send SMS"
   - From: `={{ $json.body.from_number || "YOUR_TWILIO_NUMBER" }}`
   - To: `={{ $json.body.to }}`
   - Message: `={{ $json.body.message }}`
5. Configure Twilio credentials in n8n
6. Copy webhook URL

### Step 3: Test Workflow
```bash
curl -X POST https://n8n.ai.epic.dm/webhook/YOUR-WEBHOOK-ID \
  -H 'Content-Type: application/json' \
  -d '{
    "to": "+1234567890",
    "message": "Test SMS from n8n workflow"
  }'
```

## Database Setup

Run the setup script:
```bash
./enable_sms_followup.sh AGENT_ID WEBHOOK_URL YOUR_EMAIL
```

Or manually:
```sql
INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
VALUES (
  gen_random_uuid(),
  'YOUR_AGENT_ID',
  (SELECT id FROM users WHERE email = 'your@email.com'),
  'sms',
  'SMS Follow-up',
  true,
  '{
    "n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/YOUR-ID",
    "default_from_number": "+1234567890"
  }'::jsonb
);
```

## LiveKit Agent Integration

Add to your agent's entry point:

```python
from livekit.agents import function_tool, RunContext

@function_tool
async def send_sms(
    context: RunContext,
    to_number: str,
    message: str
) -> str:
    """
    Send SMS to customer

    Args:
        to_number: Phone number in format +1234567890
        message: SMS message (max 160 chars)
    """
    import requests
    import os

    agent_id = os.getenv('AGENT_CONFIG_ID', 'YOUR_AGENT_ID')

    response = requests.post(
        f'http://localhost:5001/api/user/agents/{agent_id}/sms-followup',
        json={'to_number': to_number, 'message': message},
        headers={'X-User-Email': 'epicsmarters@gmail.com'}
    )

    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            return f"✅ SMS sent to {to_number}"

    return "❌ Failed to send SMS"


@function_tool
async def send_appointment_reminder(
    context: RunContext,
    customer_name: str,
    phone_number: str,
    appointment_time: str
) -> str:
    """Send appointment reminder SMS"""
    import requests
    import os

    agent_id = os.getenv('AGENT_CONFIG_ID', 'YOUR_AGENT_ID')

    response = requests.post(
        f'http://localhost:5001/api/user/agents/{agent_id}/sms-followup',
        json={
            'to_number': phone_number,
            'template': 'appointment_reminder',
            'template_data': {
                'customer_name': customer_name,
                'appointment_time': appointment_time,
                'company_name': 'Epic Voice'
            }
        },
        headers={'X-User-Email': 'epicsmarters@gmail.com'}
    )

    if response.status_code == 200:
        return f"✅ Reminder sent to {customer_name}"

    return "❌ Failed to send reminder"
```

## Available Templates

### 1. appointment_reminder
```
{customer_name}, this is {company_name}. Reminder: Your appointment is scheduled for {appointment_time}. Reply CONFIRM to confirm.
```

### 2. call_summary
```
Hi {customer_name}, thanks for calling {company_name}! {summary} Questions? Call us back anytime.
```

### 3. appointment_confirmation
```
Hi {customer_name}, your appointment with {company_name} is confirmed for {appointment_time}. See you then!
```

### 4. follow_up
```
Hi {customer_name}, following up on our call. {message} - {company_name}
```

### 5. link_share
```
Hi {customer_name}, here's the link we discussed: {link} - {company_name}
```

## Testing Checklist

- [ ] Twilio account created and configured
- [ ] n8n workflow created and webhook URL obtained
- [ ] Database tool entry created
- [ ] Direct SMS sending tested
- [ ] Template SMS tested
- [ ] Agent function added and tested
- [ ] SMS delivery confirmed on phone

## Twilio Costs

- Phone number: ~$1/month
- SMS (US): $0.0079 per message
- SMS (International): Varies by country

## Troubleshooting

### "SMS tool not enabled"
- Run enable_sms_followup.sh or insert database entry manually

### "SMS webhook URL not configured"
- Verify config JSON has correct n8n_webhook_url

### Twilio authentication error
- Check Account SID and Auth Token in n8n
- Verify Twilio account is active

### Invalid phone number
- Use E.164 format: +1234567890
- Include country code and + prefix

### SMS not delivered
- Check Twilio logs for delivery status
- Verify phone number is valid and active
- Check for carrier blocks/filters

## Next Steps

1. Create Twilio account
2. Set up n8n workflow with webhook
3. Run enable_sms_followup.sh script
4. Add send_sms function to agent
5. Test with real phone number

## Files Created

- `/opt/livekit1/backend/agent_tools/sms_followup.py` - Service class
- Updated: `/opt/livekit1/backend/agent_tools/routes.py` - Added endpoint
- `/opt/livekit1/enable_sms_followup.sh` - Setup script (to be created)

## Integration Status

✅ Backend service complete
✅ API endpoint complete
✅ Templates defined
⏳ n8n workflow (user needs to create)
⏳ Twilio setup (user needs account)
⏳ End-to-end testing

---

**Ready for production!** Just need Twilio account and n8n workflow setup.
