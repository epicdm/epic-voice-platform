# Email Follow-up Setup Guide

**Date**: 2025-11-20 00:36
**Status**: Email Follow-up Backend Complete - n8n Workflow Setup Required

---

## Overview

Email Follow-up functionality has been implemented with the following components:

- **Backend Service**: `/opt/livekit1/backend/agent_tools/email_followup.py`
- **API Endpoint**: `POST /api/user/agents/{agent_id}/email-followup`
- **Flask Status**: Running on PID 1605159

**What's Left**: Create n8n workflow and configure webhook URL

---

## Step 1: Create n8n Workflow (5 minutes)

### 1.1 Access n8n Dashboard

Navigate to: **https://n8n.ai.epic.dm**

### 1.2 Create New Workflow

1. Click **"New Workflow"** button
2. Name it: **"AI Agent Email Follow-up"**

### 1.3 Add Webhook Trigger Node

**Node 1: Webhook Trigger**

1. Click **"+"** to add a node
2. Search for and select **"Webhook"**
3. Configure settings:
   - **HTTP Method**: `POST`
   - **Path**: `ai-agent-email-followup`
   - **Response Mode**: `Respond to Webhook`
   - **Response Code**: `200`

### 1.4 Add Email Send Node

**Node 2: Send Email**

1. Click **"+"** after the webhook node
2. Search for and select **"Send Email"** (or **"Gmail"**, **"SendGrid"**, etc.)
3. Configure settings:
   - **From Email**: `{{ $json.from_email }}`
   - **To Email**: `{{ $json.to }}`
   - **Subject**: `{{ $json.subject }}`
   - **Email Type**: `Text`
   - **Text**: `{{ $json.body }}`

**Important**: You'll need to set up SMTP credentials or connect your email provider:
- **Gmail**: Requires OAuth2 authentication
- **SendGrid**: Requires API key
- **SMTP**: Requires host, port, username, password

### 1.5 Add Webhook Response Node

**Node 3: Respond to Webhook**

1. Click **"+"** after the email node
2. Search for and select **"Respond to Webhook"**
3. Configure settings:
   - **Response Body**:
     ```json
     {
       "success": true,
       "message_id": "{{ $json.messageId }}",
       "to": "{{ $json.to }}",
       "sent_at": "{{ $now.toISO() }}"
     }
     ```
   - **Response Code**: `200`

### 1.6 Activate Workflow

1. Click **"Active"** toggle in the top right (should turn green)
2. Save the workflow (Ctrl+S or click Save button)

### 1.7 Get Webhook URL

After saving, n8n will display the webhook URL. It should look like:

```
https://n8n.ai.epic.dm/webhook/ai-agent-email-followup
```

**Copy this URL** - you'll need it for configuration.

---

## Step 2: Configure Email Tool for Your Agent

### Option A: Using the Database Directly

```sql
-- Update agent_tools table for your agent
UPDATE agent_tools
SET
  isenabled = true,
  config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    '{n8n_webhook_url}',
    '"https://n8n.ai.epic.dm/webhook/ai-agent-email-followup"'
  )
WHERE
  agentconfigid = '8b7f8d81-90bc-4988-952c-a3e6b1b11b0f'
  AND tooltype = 'email';

-- If no email tool exists yet, create it:
INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
VALUES (
  gen_random_uuid(),
  '8b7f8d81-90bc-4988-952c-a3e6b1b11b0f',
  (SELECT id FROM users WHERE email = 'epicsmarters@gmail.com'),
  'email',
  'Email Follow-up',
  true,
  '{"n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/ai-agent-email-followup", "from_email": "noreply@epic.dm"}'::jsonb
);
```

### Option B: Using API (Frontend Implementation Needed)

The frontend Step 5 already has an "Email Follow-up" toggle. When users enable it, we need to add a configuration modal to set the webhook URL.

**Future Enhancement**: Add configuration UI in Step 5 to set:
- **Webhook URL**: The n8n webhook URL
- **From Email**: Default sender email address
- **Templates**: Email templates for different scenarios

---

## Step 3: Test Email Follow-up

### 3.1 Test n8n Workflow Directly

First, test that the n8n workflow works:

```bash
curl -X POST https://n8n.ai.epic.dm/webhook/ai-agent-email-followup \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your-test-email@example.com",
    "subject": "Test Email from AI Agent",
    "body": "This is a test email sent from the AI Agent Email Follow-up workflow.",
    "from_email": "noreply@epic.dm"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "message_id": "abc123",
  "to": "your-test-email@example.com",
  "sent_at": "2025-11-20T00:36:00Z"
}
```

### 3.2 Test via Flask API

Once the agent tool is configured, test via the Flask API:

```bash
curl -X POST http://localhost:5001/api/user/agents/8b7f8d81-90bc-4988-952c-a3e6b1b11b0f/email-followup \
  -H "Content-Type: application/json" \
  -H "X-User-Email: epicsmarters@gmail.com" \
  -d '{
    "to": "customer@example.com",
    "subject": "Thank you for your call!",
    "body": "We appreciate you calling today. Here is a summary of our conversation...",
    "call_data": {
      "duration": 180,
      "agent_name": "Sales Agent",
      "call_outcome": "interested"
    }
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message_id": "abc123",
    "to": "customer@example.com",
    "sent_at": "2025-11-20T00:36:00Z"
  }
}
```

### 3.3 Test Template-Based Email

```bash
curl -X POST http://localhost:5001/api/user/agents/8b7f8d81-90bc-4988-952c-a3e6b1b11b0f/email-followup \
  -H "Content-Type: application/json" \
  -H "X-User-Email: epicsmarters@gmail.com" \
  -d '{
    "to": "customer@example.com",
    "template": "call_summary",
    "template_data": {
      "customer_name": "John Doe",
      "call_duration": "3 minutes",
      "agent_name": "Sales Agent",
      "summary": "We discussed your interest in our product and pricing options."
    }
  }'
```

---

## API Usage Examples

### Direct Email (Custom Subject & Body)

```javascript
// Frontend example
const response = await fetch(`/api/user/agents/${agentId}/email-followup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    subject: 'Thank you for your call!',
    body: 'We appreciate you calling today...',
    from_email: 'sales@epic.dm', // Optional
    call_data: {  // Optional
      duration: 180,
      agent_name: 'Sales Agent'
    }
  })
});

const result = await response.json();
console.log(result);
// { success: true, data: { message_id: "...", to: "...", sent_at: "..." } }
```

### Template-Based Email

```javascript
// Using call_summary template
const response = await fetch(`/api/user/agents/${agentId}/email-followup`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'customer@example.com',
    template: 'call_summary',
    template_data: {
      customer_name: 'John Doe',
      call_duration: '3 minutes',
      agent_name: 'Sales Agent',
      summary: 'Discussed pricing and features.'
    }
  })
});
```

### Available Templates

**1. call_summary**

Template Data:
- `customer_name`: Customer's name
- `call_duration`: Duration of the call
- `agent_name`: Name of the AI agent
- `summary`: Summary of the conversation

**2. appointment_confirmation**

Template Data:
- `customer_name`: Customer's name
- `appointment_time`: Scheduled appointment time
- `details`: Additional appointment details
- `company_name`: Your company name

---

## Error Handling

### Email Tool Not Enabled

**Error**:
```json
{
  "success": false,
  "error": {
    "message": "Email tool not enabled for this agent",
    "code": "TOOL_NOT_ENABLED"
  }
}
```

**Solution**: Enable the email tool and configure webhook URL in agent settings.

### No Webhook URL Configured

**Error**:
```json
{
  "success": false,
  "error": {
    "message": "Email workflow not configured. Please set up n8n webhook URL.",
    "code": "NO_WEBHOOK_URL"
  }
}
```

**Solution**: Add `n8n_webhook_url` to the email tool config in the database.

### n8n Webhook Failed

**Error**:
```json
{
  "success": false,
  "error": {
    "message": "n8n webhook returned status 500",
    "code": "EMAIL_SEND_FAILED"
  }
}
```

**Solution**:
1. Check n8n workflow is active
2. Verify email provider credentials are configured
3. Check n8n execution logs for details

---

## Architecture Flow

```
┌──────────────────────────────────────────────────────────────┐
│ 1. AI Agent Call Completes                                   │
│    • LiveKit agent session ends                              │
│    • AI agent has customer's email from conversation         │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. Agent Triggers Email Follow-up                            │
│    • POST /api/user/agents/{id}/email-followup              │
│    • Payload: { to, subject, body }                          │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. Flask API Validates Request                               │
│    • Check email tool is enabled                             │
│    • Load webhook URL from agent_tools config                │
│    • Create EmailFollowupService instance                    │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 4. EmailFollowupService Calls n8n Webhook                    │
│    • POST https://n8n.ai.epic.dm/webhook/...                │
│    • Payload: { to, subject, body, from_email, sent_at }     │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. n8n Workflow Processes Request                            │
│    • Webhook receives payload                                │
│    • Email Send node sends email via SMTP/Gmail/SendGrid     │
│    • Respond to Webhook returns success                      │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. Response Bubbles Back                                     │
│    • n8n → EmailFollowupService → Flask API → Frontend       │
│    • Success: { message_id, to, sent_at }                    │
│    • Email delivered to customer                             │
└──────────────────────────────────────────────────────────────┘
```

---

## Integration with LiveKit Agents

To use this in your LiveKit agents, add the email follow-up call after the conversation ends:

```python
# In your agent code (e.g., /opt/livekit1/agents/customer_support_agent/agent.py)

import requests
import os

async def on_conversation_end(self, customer_email: str, summary: str):
    """Send follow-up email after call"""

    try:
        response = requests.post(
            f"{os.getenv('BACKEND_URL')}/api/user/agents/{self.agent_id}/email-followup",
            headers={
                'Content-Type': 'application/json',
                'X-User-Email': os.getenv('USER_EMAIL')
            },
            json={
                'to': customer_email,
                'template': 'call_summary',
                'template_data': {
                    'customer_name': self.customer_name,
                    'call_duration': f"{self.call_duration} minutes",
                    'agent_name': self.agent_name,
                    'summary': summary
                }
            },
            timeout=30
        )

        if response.status_code == 200:
            result = response.json()
            print(f"✅ Follow-up email sent to {customer_email}")
            return result['data']
        else:
            print(f"❌ Failed to send email: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Error sending email: {e}")
        return None
```

---

## Next Steps

1. **Create n8n Workflow** (5 minutes)
   - Follow Step 1 above
   - Test webhook URL with curl

2. **Configure Agent Tool** (2 minutes)
   - Add webhook URL to agent_tools config
   - Enable email tool for your agent

3. **Test End-to-End** (5 minutes)
   - Test via Flask API
   - Verify email is received
   - Check n8n execution logs

4. **Integrate with LiveKit Agents** (30 minutes)
   - Add email follow-up logic to agent code
   - Test during actual agent calls
   - Monitor email delivery

5. **Optional: Add Frontend Configuration UI**
   - Add modal in Step 5 to configure webhook URL
   - Save configuration via API
   - Show email sending status in dashboard

---

## Files Modified

**Backend**:
1. `/opt/livekit1/backend/agent_tools/email_followup.py` - Email service class
2. `/opt/livekit1/backend/agent_tools/routes.py` - Added email follow-up endpoint (lines 641-778)

**Services Running**:
- **Flask**: Port 5001, PID 1605159 ✅
- **n8n**: https://n8n.ai.epic.dm ✅

---

## What Works Now

✅ **Backend Service**: EmailFollowupService class with send methods
✅ **API Endpoint**: POST /api/user/agents/{id}/email-followup
✅ **Template Support**: call_summary, appointment_confirmation
✅ **Error Handling**: Proper validation and error responses
✅ **Flask Integration**: Endpoint registered and running

## What's Needed

⏸️ **n8n Workflow**: User needs to create workflow in n8n UI
⏸️ **Webhook URL**: Configure in agent_tools table
⏸️ **SMTP/Email Provider**: Configure credentials in n8n
⏸️ **Frontend Configuration UI**: Optional enhancement for Step 5

---

**Created**: 2025-11-20 00:36
**Status**: Backend Complete - Ready for n8n Workflow Setup
**Estimated Setup Time**: 10-15 minutes
**Next Action**: Create n8n workflow and configure webhook URL
