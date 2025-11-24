# Calendar Booking Tool - n8n Workflow Setup Guide

## Overview

The Calendar Booking tool allows AI agents to schedule appointments during calls. It integrates with n8n workflows to book appointments in Google Calendar, Calendly, or other calendar services.

## n8n Workflow Setup

### Step 1: Create New Workflow in n8n

1. Open n8n at https://n8n.ai.epic.dm
2. Click "Add workflow"
3. Name it: "AI Agent - Calendar Booking"

### Step 2: Add Webhook Trigger

1. Add a "Webhook" node
2. Configure webhook settings:
   - **HTTP Method**: POST
   - **Path**: Leave as generated (e.g., `calendar-booking`)
   - **Response Mode**: "Last Node"
3. Copy the webhook URL (you'll need it later)

### Step 3: Configure Calendar Integration

Choose ONE of these calendar options:

#### Option A: Google Calendar Integration

1. Add "Google Calendar" node
2. Select operation: "Create Event"
3. Configure authentication (connect your Google account)
4. Map fields:
   - **Calendar**: Your calendar name or ID
   - **Start**: `={{ $json.body.appointment_date }}T{{ $json.body.appointment_time }}:00`
   - **End**: Use expression to add duration:
     ```javascript
     ={{
       new Date(
         new Date($json.body.appointment_date + 'T' + $json.body.appointment_time).getTime() +
         ($json.body.duration_minutes * 60000)
       ).toISOString()
     }}
     ```
   - **Summary**: `={{ "Appointment with " + $json.body.customer_name }}`
   - **Description**: `={{ $json.body.notes }}`
   - **Attendees**: `={{ [$json.body.customer_email] }}`

#### Option B: Calendly Integration (via HTTP Request)

1. Add "HTTP Request" node
2. Configure for Calendly API:
   - **Method**: POST
   - **URL**: Your Calendly API endpoint
   - **Authentication**: Bearer Token (Calendly API key)
   - **Body**: Map webhook fields to Calendly format

#### Option C: Generic Calendar (Email Notification)

1. Add "Send Email" (SMTP) node
2. Configure SMTP settings (use SMTP2Go credentials)
3. Map fields:
   - **To**: Calendar admin email or booking email
   - **Subject**: `={{ "New Appointment: " + $json.body.customer_name }}`
   - **Text**:
     ```
     New appointment booked by AI agent:

     Customer: {{ $json.body.customer_name }}
     Email: {{ $json.body.customer_email }}
     Phone: {{ $json.body.phone_number }}
     Date: {{ $json.body.appointment_date }}
     Time: {{ $json.body.appointment_time }}
     Duration: {{ $json.body.duration_minutes }} minutes
     Notes: {{ $json.body.notes }}
     ```

### Step 4: Add Response Node

1. Add a "Respond to Webhook" or "Set" node to format response
2. Set output data:
   ```json
   {
     "booking_id": "{{$json.id}}",
     "confirmation_sent": true,
     "calendar_link": "{{$json.htmlLink}}",
     "status": "booked"
   }
   ```

### Step 5: Test the Workflow

Test with curl:
```bash
curl -X POST https://n8n.ai.epic.dm/webhook/YOUR-WEBHOOK-ID \
  -H 'Content-Type: application/json' \
  -d '{
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "appointment_date": "2025-11-25",
    "appointment_time": "14:00",
    "duration_minutes": 30,
    "notes": "Initial consultation",
    "phone_number": "+1234567890"
  }'
```

Expected response:
```json
{
  "booking_id": "abc123",
  "confirmation_sent": true,
  "calendar_link": "https://calendar.google.com/...",
  "status": "booked"
}
```

## Database Configuration

Enable the calendar tool for your agent:

```sql
-- Insert calendar tool configuration
INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
VALUES (
  gen_random_uuid(),
  'YOUR_AGENT_ID',
  (SELECT id FROM users WHERE email = 'your@email.com'),
  'calendar',
  'Calendar Booking',
  true,
  '{"n8n_webhook_url": "https://n8n.ai.epic.dm/webhook/YOUR-WEBHOOK-ID"}'::jsonb
);
```

Or use the quick setup script:

```bash
./enable_calendar_booking.sh YOUR_AGENT_ID YOUR_WEBHOOK_URL YOUR_EMAIL
```

## API Usage

### Book Appointment Endpoint

**POST** `/api/user/agents/{agent_id}/calendar-booking`

**Headers:**
- `Content-Type: application/json`
- `X-User-Email: your@email.com`

**Request Body:**
```json
{
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "appointment_date": "2025-11-25",
  "appointment_time": "14:00",
  "duration_minutes": 30,
  "notes": "Initial consultation",
  "phone_number": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "booking_id": "abc123",
    "confirmation_sent": true,
    "calendar_link": "https://...",
    "customer_email": "john@example.com",
    "appointment_date": "2025-11-25",
    "appointment_time": "14:00"
  }
}
```

**Error Responses:**
- `400`: Missing required fields
- `404`: Calendar tool not enabled for agent
- `500`: Booking failed

## LiveKit Agent Integration

Add this function to your AI agent to enable calendar booking:

```python
from livekit.agents import function_tool, RunContext

@function_tool
async def book_appointment(
    context: RunContext,
    customer_name: str,
    customer_email: str,
    appointment_date: str,
    appointment_time: str,
    duration_minutes: int = 30,
    notes: str = ""
) -> str:
    """
    Book an appointment for the customer

    Args:
        customer_name: Customer's full name
        customer_email: Customer's email address
        appointment_date: Date in YYYY-MM-DD format (e.g., "2025-11-25")
        appointment_time: Time in HH:MM format, 24-hour (e.g., "14:00" for 2 PM)
        duration_minutes: Duration in minutes (default: 30)
        notes: Additional notes or context

    Returns:
        Confirmation message with booking details
    """
    import requests
    import os

    # Get agent config ID from environment
    agent_id = os.getenv('AGENT_CONFIG_ID', '8b7f8d81-90bc-4988-952c-a3e6b1b11b0f')

    # Call Flask API
    response = requests.post(
        f'http://localhost:5001/api/user/agents/{agent_id}/calendar-booking',
        json={
            'customer_name': customer_name,
            'customer_email': customer_email,
            'appointment_date': appointment_date,
            'appointment_time': appointment_time,
            'duration_minutes': duration_minutes,
            'notes': notes
        },
        headers={'X-User-Email': 'epicsmarters@gmail.com'}
    )

    if response.status_code == 200:
        result = response.json()
        if result.get('success'):
            data = result['data']
            return f"✅ Appointment booked successfully! Confirmation sent to {customer_email}. Booking ID: {data.get('booking_id')}"
        else:
            return f"❌ Failed to book appointment: {result.get('error', {}).get('message')}"
    else:
        return f"❌ Error booking appointment (HTTP {response.status_code})"
```

## Testing

1. **Test n8n workflow directly:**
   ```bash
   curl -X POST https://n8n.ai.epic.dm/webhook/YOUR-WEBHOOK-ID \
     -H 'Content-Type: application/json' \
     -d @test_booking.json
   ```

2. **Test via Flask API:**
   ```bash
   curl -X POST http://localhost:5001/api/user/agents/YOUR-AGENT-ID/calendar-booking \
     -H 'Content-Type: application/json' \
     -H 'X-User-Email: your@email.com' \
     -d @test_booking.json
   ```

3. **Test with AI agent:**
   - Call the agent
   - Ask to book an appointment
   - Provide date, time, and contact info
   - Verify booking appears in calendar

## Troubleshooting

### "Calendar tool not enabled"
- Run the database insert query to enable the tool
- Verify agent_id matches your agent configuration

### "Calendar webhook URL not configured"
- Check the config JSON has `n8n_webhook_url` field
- Verify the webhook URL is correct

### n8n workflow not triggering
- Ensure HTTP method is POST
- Check webhook URL is correct
- View n8n execution logs for errors

### Calendar event not created
- Verify calendar node authentication
- Check field mappings use correct expressions
- Test calendar integration separately

## Next Steps

After calendar booking is working:
- Add availability checking feature
- Implement appointment cancellation
- Add reminder emails/SMS
- Integrate with multiple calendars
- Add timezone support
