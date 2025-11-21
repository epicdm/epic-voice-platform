#!/bin/bash

echo "=================================================="
echo "GUI Call Test - Simulating Frontend API Call"
echo "=================================================="
echo ""

# Clean agent logs
echo "Clearing agent logs..."
> /opt/livekit1/agents/sales_agent/agent.log

echo ""
echo "Making API call (like GUI does)..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }')

echo "API Response:"
echo "$RESPONSE"
echo ""

echo "Waiting 5 seconds for agent to join..."
sleep 5

echo ""
echo "=================================================="
echo "Checking Agent Logs"
echo "=================================================="

AGENT_JOINED=$(grep "received job request" /opt/livekit1/agents/sales_agent/agent.log)

if [ -n "$AGENT_JOINED" ]; then
    echo "✅ SUCCESS - Agent received job request!"
    echo ""
    echo "Agent log:"
    tail -20 /opt/livekit1/agents/sales_agent/agent.log
else
    echo "❌ FAILURE - Agent did NOT receive job request"
    echo ""
    echo "Agent log (last 20 lines):"
    tail -20 /opt/livekit1/agents/sales_agent/agent.log
    echo ""
    echo "This means the agent dispatch is not working for GUI calls"
fi

echo ""
echo "=================================================="
echo "Backend Logs (last 30 lines)"
echo "=================================================="
tail -30 /opt/livekit1/backend.log

echo ""
echo "=================================================="
