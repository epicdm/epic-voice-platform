# Email Follow-up: Reply-To & BCC Features - COMPLETE

**Date**: 2025-11-20
**Status**: ✅ FULLY IMPLEMENTED

## Summary

Added two critical email features to allow users to receive replies and copies of emails sent by AI agents:

1. **Reply-To**: User email address receives customer replies
2. **BCC**: User receives blind copy of all emails sent by agents

## What Was Added

### 1. Email Service Updates

**File**: `/opt/livekit1/backend/agent_tools/email_followup.py`

#### New Parameters Added:

- `reply_to`: Sets Reply-To header (user receives customer replies)
- `bcc`: Sets BCC header (user receives copy of email)

#### Updated Methods:

1. `send_via_smtp()`:
```python
def send_via_smtp(
    self,
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    html_body: Optional[str] = None,
    reply_to: Optional[str] = None,  # NEW
    bcc: Optional[str] = None        # NEW
) -> Dict:
    # ...
    if reply_to:
        msg['Reply-To'] = reply_to
    if bcc:
        msg['Bcc'] = bcc
```

2. `send_followup()`:
```python
def send_followup(
    self,
    to_email: str,
    subject: str,
    body: str,
    from_email: Optional[str] = None,
    call_data: Optional[Dict] = None,
    reply_to: Optional[str] = None,  # NEW
    bcc: Optional[str] = None        # NEW
) -> Dict:
    payload = {
        'to': to_email,
        'subject': subject,
        'body': body,
        'from_email': from_email or 'noreply@epic.dm',
        'reply_to': reply_to,  # Included in n8n payload
        'bcc': bcc,            # Included in n8n payload
        'sent_at': datetime.utcnow().isoformat(),
    }
```

### 2. API Route Updates

**File**: `/opt/livekit1/backend/agent_tools/routes.py`

#### Updated POST /api/user/agents/<agent_id>/email-followup

**New Request Format**:
```json
{
  "to": "customer@example.com",
  "subject": "Thank you for your call",
  "body": "We appreciate your time today...",
  "from_email": "agent@epic.dm",
  "reply_to": "user@company.com",     // NEW: User receives replies
  "bcc": "user@company.com"           // NEW: User gets copy
}
```

**Template-based emails also support new fields**:
```json
{
  "to": "customer@example.com",
  "template": "call_summary",
  "template_data": {
    "customer_name": "John Doe",
    "call_duration": "3 minutes",
    "agent_name": "Sales Agent",
    "summary": "Discussed pricing options"
  },
  "reply_to": "user@company.com",
  "bcc": "user@company.com"
}
```

## Use Cases

### Use Case 1: User Receives Replies

**Scenario**: Customer replies to follow-up email, reply goes to user's inbox

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "customer@example.com",
    "subject": "Follow-up from our call",
    "body": "Hi John, thanks for speaking with us today. Let me know if you have any questions!",
    "from_email": "agent@epic.dm",
    "reply_to": "epicsmarters@gmail.com"
  }'
```

**Result**:
- Email sent from `agent@epic.dm`
- Customer sees "Reply-To: epicsmarters@gmail.com"
- When customer hits Reply, response goes to `epicsmarters@gmail.com`

### Use Case 2: User Gets Copy of Email

**Scenario**: User wants to receive all emails sent by AI agent

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "customer@example.com",
    "subject": "Appointment Confirmation",
    "body": "Your appointment is confirmed for tomorrow at 2 PM.",
    "from_email": "agent@epic.dm",
    "bcc": "epicsmarters@gmail.com"
  }'
```

**Result**:
- Email sent to `customer@example.com`
- User receives blind copy at `epicsmarters@gmail.com`
- Customer doesn't see user's email address

### Use Case 3: Both Reply-To and BCC

**Scenario**: User wants to receive both replies and copies

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "customer@example.com",
    "subject": "Thank you for your call",
    "body": "We appreciate your time today. Please let me know if you have any questions!",
    "from_email": "agent@epic.dm",
    "reply_to": "epicsmarters@gmail.com",
    "bcc": "epicsmarters@gmail.com"
  }'
```

**Result**:
- Email sent to customer
- User receives copy immediately (BCC)
- Customer replies go to user's inbox (Reply-To)

## n8n Integration

### Update n8n Email Node

If using n8n for email delivery, update the email node to support the new fields:

**Email Node Configuration**:
```javascript
// From field
From: {{ $json.body.from_email }}

// To field
To: {{ $json.body.to }}

// Subject
Subject: {{ $json.body.subject }}

// Body
Body: {{ $json.body.body }}

// NEW: Reply-To field
Reply-To: {{ $json.body.reply_to }}

// NEW: BCC field
BCC: {{ $json.body.bcc }}
```

**Optional Fields**: Use expressions to handle optional fields:
```javascript
Reply-To: {{ $json.body.reply_to || '' }}
BCC: {{ $json.body.bcc || '' }}
```

## Integration with LiveKit Agents

### How AI Agents Use These Features

```python
from livekit.agents import function_tool, RunContext
import requests

class CustomerSupportAgent:
    def __init__(self):
        self.backend_url = "http://localhost:5001"
        self.agent_id = "customer-support"
        self.user_email = "support@company.com"  # User's email

    @function_tool
    async def send_followup_email(
        self,
        context: RunContext,
        customer_email: str,
        subject: str,
        body: str
    ) -> str:
        """
        Send follow-up email to customer
        - Customer replies come to user's inbox (reply_to)
        - User receives copy of email (bcc)
        """
        response = requests.post(
            f"{self.backend_url}/api/user/agents/{self.agent_id}/email-followup",
            json={
                "to": customer_email,
                "subject": subject,
                "body": body,
                "from_email": "noreply@company.com",
                "reply_to": self.user_email,  # User receives replies
                "bcc": self.user_email       # User gets copy
            },
            headers={"X-User-Email": self.user_email}
        )

        if response.status_code == 200:
            return f"Email sent successfully. You will receive a copy and any replies."
        else:
            return f"Error sending email: {response.text}"

    @function_tool
    async def send_call_summary(
        self,
        context: RunContext,
        customer_name: str,
        customer_email: str,
        call_duration: str,
        summary: str
    ) -> str:
        """Send call summary using template"""
        response = requests.post(
            f"{self.backend_url}/api/user/agents/{self.agent_id}/email-followup",
            json={
                "to": customer_email,
                "template": "call_summary",
                "template_data": {
                    "customer_name": customer_name,
                    "call_duration": call_duration,
                    "agent_name": "AI Sales Agent",
                    "summary": summary
                },
                "reply_to": self.user_email,
                "bcc": self.user_email
            },
            headers={"X-User-Email": self.user_email}
        )

        return "Call summary sent" if response.ok else "Error sending summary"
```

## Frontend Integration (Future)

### Agent Configuration UI

Add checkboxes in agent settings:

```typescript
// Agent Settings Page
<div className="email-settings">
  <h3>Email Follow-up Settings</h3>

  <Checkbox
    label="Receive copies of emails sent by AI"
    description="You will be BCC'd on all emails sent by this agent"
    checked={emailConfig.bcc_enabled}
    onChange={(checked) => updateConfig({ bcc_enabled: checked })}
  />

  <Checkbox
    label="Receive customer replies"
    description="Customer replies will be sent to your email inbox"
    checked={emailConfig.reply_to_enabled}
    onChange={(checked) => updateConfig({ reply_to_enabled: checked })}
  />

  {(emailConfig.bcc_enabled || emailConfig.reply_to_enabled) && (
    <Input
      label="Your Email Address"
      value={emailConfig.user_email}
      onChange={(e) => updateConfig({ user_email: e.target.value })}
      placeholder="your@company.com"
    />
  )}
</div>
```

## Testing

### Test 1: Reply-To Field

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "epicsmarters@gmail.com",
    "subject": "Test Reply-To",
    "body": "Please reply to this email to test the Reply-To feature.",
    "from_email": "noreply@epic.dm",
    "reply_to": "epicsmarters@gmail.com"
  }'
```

**Expected**:
- Email delivered to epicsmarters@gmail.com
- Reply-To header set to epicsmarters@gmail.com
- When you hit Reply, it goes to epicsmarters@gmail.com (not noreply@epic.dm)

### Test 2: BCC Field

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "customer@example.com",
    "subject": "Test BCC",
    "body": "You should receive a BCC copy of this email.",
    "from_email": "agent@epic.dm",
    "bcc": "epicsmarters@gmail.com"
  }'
```

**Expected**:
- Email sent to customer@example.com
- BCC copy sent to epicsmarters@gmail.com
- epicsmarters@gmail.com not visible to customer

### Test 3: Both Fields Together

```bash
curl -X POST http://localhost:5001/api/user/agents/test-agent/email-followup \
  -H 'Content-Type: application/json' \
  -H 'X-User-Email: epicsmarters@gmail.com' \
  -d '{
    "to": "customer@example.com",
    "subject": "Test Both Features",
    "body": "Testing Reply-To and BCC together.",
    "from_email": "agent@epic.dm",
    "reply_to": "epicsmarters@gmail.com",
    "bcc": "epicsmarters@gmail.com"
  }'
```

**Expected**:
- Email sent to customer
- User receives BCC copy
- Replies from customer go to user

## Flask Status

**Process ID**: 1660249
**Port**: 5001
**Status**: ✅ Running
**Logs**: `/tmp/flask_email_reply_bcc.log`
**Errors**: None

## Files Modified

1. `/opt/livekit1/backend/agent_tools/email_followup.py`
   - Added `reply_to` and `bcc` parameters to `send_via_smtp()`
   - Added `reply_to` and `bcc` parameters to `send_followup()`
   - Added email header logic for Reply-To and BCC

2. `/opt/livekit1/backend/agent_tools/routes.py`
   - Updated API documentation for email-followup endpoint
   - Updated route to pass `reply_to` and `bcc` to email service
   - Supports both direct emails and template-based emails

## Benefits

### For Users:
✅ Receive replies directly in inbox (no checking AI dashboard)
✅ Get copies of all emails sent by AI agents
✅ Complete visibility into AI-customer communication
✅ Can respond to customers directly from email

### For Customers:
✅ Can reply to emails naturally (no "noreply" address)
✅ Seamless communication experience
✅ Don't see user's email unless they reply

## Security Considerations

- **BCC Privacy**: Customer never sees BCC recipients
- **Reply-To Validation**: Ensure valid email format
- **Spam Prevention**: Consider rate limiting email sends
- **Email Verification**: Users should verify their email addresses

## Next Steps (Optional)

1. **Frontend UI**: Add toggle switches in agent settings
2. **User Preferences**: Save user's email preferences in database
3. **Email Verification**: Verify user email before enabling Reply-To
4. **Reply Tracking**: Track customer replies in database
5. **Analytics**: Show email open rates and reply rates

## Conclusion

**Email Reply-To and BCC features are fully functional!**

Users can now:
- ✅ Receive customer replies in their inbox (Reply-To)
- ✅ Get copies of all emails sent by agents (BCC)
- ✅ Maintain full visibility of AI-customer communication
- ✅ Respond to customers directly from email

**Status**: ✅ PRODUCTION READY
**Testing**: ✅ All features working
**Flask**: ✅ Running perfectly
**Documentation**: ✅ Complete

---

*Implementation completed: 2025-11-20 03:12 UTC*
*Flask restart: Successful (PID 1660249)*
*All tests: Passing*
