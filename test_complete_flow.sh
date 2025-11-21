#!/bin/bash
# Complete Voice Agent Flow Test Script

set -e

USER_EMAIL="epiccommunicationsinc@gmail.com"
BASE_URL="http://localhost:5001"

echo "🚀 Testing Complete Voice Agent Flow"
echo "======================================"
echo ""

# Step 1: Create Agent
echo "📝 Step 1: Creating AI Agent..."
AGENT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/user/agents" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{
    "name": "FlowTest Agent",
    "instructions": "You are a test agent for flow verification.",
    "description": "Auto-generated test agent",
    "temperature": 0.7
  }')

AGENT_ID=$(echo $AGENT_RESPONSE | jq -r '.agent_id')

if [ "$AGENT_ID" != "null" ] && [ ! -z "$AGENT_ID" ]; then
    echo "✅ Agent created: $AGENT_ID"
else
    echo "❌ Failed to create agent"
    echo $AGENT_RESPONSE | jq '.'
    exit 1
fi

echo ""

# Step 2: Provision Phone Number
echo "📞 Step 2: Provisioning Phone Number..."
PHONE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/user/phone-numbers/provision" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $USER_EMAIL" \
  -d '{"use_magnus": false}')  # Use local for faster testing

PHONE_NUMBER=$(echo $PHONE_RESPONSE | jq -r '.phone_number')
PROVIDER=$(echo $PHONE_RESPONSE | jq -r '.provider')

if [ "$PHONE_NUMBER" != "null" ] && [ ! -z "$PHONE_NUMBER" ]; then
    echo "✅ Phone provisioned: $PHONE_NUMBER (provider: $PROVIDER)"
else
    echo "❌ Failed to provision phone"
    echo $PHONE_RESPONSE | jq '.'
    exit 1
fi

echo ""

# Step 3: Assign Phone to Agent
echo "🔗 Step 3: Assigning Phone to Agent..."
ASSIGN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/user/phone-numbers/${PHONE_NUMBER}/assign" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: $USER_EMAIL" \
  -d "{\"agent_id\": \"$AGENT_ID\"}")

ASSIGN_SUCCESS=$(echo $ASSIGN_RESPONSE | jq -r '.success')

if [ "$ASSIGN_SUCCESS" == "true" ]; then
    echo "✅ Phone assigned to agent"
else
    echo "❌ Failed to assign phone"
    echo $ASSIGN_RESPONSE | jq '.'
    exit 1
fi

echo ""

# Step 4: Test SIP Inbound Routing
echo "📡 Step 4: Testing SIP Inbound Routing..."
SIP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sip/inbound" \
  -H "Content-Type: application/json" \
  -d "{\"from\": \"+17671234567\", \"to\": \"$PHONE_NUMBER\"}")

SIP_ACTION=$(echo $SIP_RESPONSE | jq -r '.action')
ROOM_NAME=$(echo $SIP_RESPONSE | jq -r '.room_name')

if [ "$SIP_ACTION" == "route" ]; then
    echo "✅ SIP routing working - Room: $ROOM_NAME"
else
    echo "❌ SIP routing failed"
    echo $SIP_RESPONSE | jq '.'
    exit 1
fi

echo ""
echo "🎉 SUCCESS! Complete flow test passed"
echo "======================================"
echo ""
echo "Summary:"
echo "  Agent ID: $AGENT_ID"
echo "  Phone Number: $PHONE_NUMBER"
echo "  Provider: $PROVIDER"
echo "  Room Name: $ROOM_NAME"
echo ""
echo "Next steps:"
echo "  1. Deploy agent process to handle incoming calls"
echo "  2. Configure Magnus Billing webhook (if using Magnus)"
echo "  3. Test with real phone call"
echo ""
