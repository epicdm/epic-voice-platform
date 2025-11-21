#!/bin/bash

echo "=================================================="
echo "GUI Call Test with Live Agent Monitoring"
echo "=================================================="
echo ""

# Truncate logs
> /opt/livekit1/agents/sales_agent/agent.log

echo "Starting agent log monitor in background..."
tail -f /opt/livekit1/agents/sales_agent/agent.log &
TAIL_PID=$!

sleep 2

echo ""
echo "Making API call now..."
echo ""

curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }' | python3 -m json.tool

echo ""
echo ""
echo "Waiting 10 seconds for agent activity..."
sleep 10

echo ""
echo "Stopping log monitor..."
kill $TAIL_PID 2>/dev/null

echo ""
echo "=================================================="
echo "Summary"
echo "=================================================="

if grep -q "received job request" /opt/livekit1/agents/sales_agent/agent.log; then
    echo "✅ Agent received job request"
else
    echo "❌ Agent did NOT receive job request"
fi

if grep -q "connecting to room" /opt/livekit1/agents/sales_agent/agent.log; then
    echo "✅ Agent attempted to connect"
else
    echo "❌ Agent did NOT attempt to connect"
fi

echo ""
