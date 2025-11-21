#!/bin/bash
# AI Agent Tools - Complete Test Suite
# Run this to test all 5 tools at once

echo "🧪 Testing All AI Agent Tools..."
echo "================================"
echo ""

BASE_URL="http://localhost:5001"
USER_EMAIL="epicsmarters@gmail.com"
AGENT_ID="test-agent"

# Test 1: Email Follow-up
echo "1️⃣  Testing Email Follow-up Tool..."
curl -s -X POST "$BASE_URL/api/user/agents/$AGENT_ID/email-followup" \
  -H 'Content-Type: application/json' \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "to": "customer@example.com",
    "subject": "Test: Follow-up Email",
    "body": "This is a test email from the AI Agent Email Follow-up system."
  }' | jq .

echo ""
echo "✅ Email tool test complete"
echo ""

# Test 2: Calendar Booking
echo "2️⃣  Testing Calendar Booking Tool..."
curl -s -X POST "$BASE_URL/api/user/agents/$AGENT_ID/calendar-booking" \
  -H 'Content-Type: application/json' \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "appointment_date": "2025-11-22",
    "appointment_time": "14:00",
    "duration_minutes": 30,
    "notes": "Test appointment booking"
  }' | jq .

echo ""
echo "✅ Calendar tool test complete"
echo ""

# Test 3: SMS Follow-up
echo "3️⃣  Testing SMS Follow-up Tool..."
curl -s -X POST "$BASE_URL/api/user/agents/$AGENT_ID/sms-followup" \
  -H 'Content-Type: application/json' \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "to": "+15551234567",
    "message": "Test SMS from AI Agent",
    "template": "appointment_reminder"
  }' | jq .

echo ""
echo "✅ SMS tool test complete"
echo ""

# Test 4: Human Handoff
echo "4️⃣  Testing Human Handoff Tool..."
curl -s -X POST "$BASE_URL/api/user/agents/$AGENT_ID/human-handoff" \
  -H 'Content-Type: application/json' \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "room_name": "test-room-123",
    "customer_name": "Jane Smith",
    "customer_phone": "+15551234567",
    "reason": "customer_request",
    "agent_summary": "Customer asking about enterprise pricing"
  }' | jq .

echo ""
echo "✅ Human handoff tool test complete"
echo ""

# Test 5: Calendar OAuth
echo "5️⃣  Testing Calendar OAuth..."
curl -s "$BASE_URL/api/user/calendar/connections" \
  -H "X-User-Email: $USER_EMAIL" | jq .

echo ""
echo "✅ Calendar OAuth test complete"
echo ""

echo "================================"
echo "🎉 All Tests Complete!"
echo ""
echo "Summary:"
echo "  ✅ Email Follow-up"
echo "  ✅ Calendar Booking"
echo "  ✅ SMS Follow-up"
echo "  ✅ Human Handoff"
echo "  ✅ Calendar OAuth"
echo ""
echo "Check the responses above for any errors."
echo "For OAuth flow, visit: http://localhost:5001/api/user/calendar/connect/google"
