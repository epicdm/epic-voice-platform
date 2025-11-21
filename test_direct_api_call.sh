#!/bin/bash

echo "============================================"
echo "Direct API Call Test"
echo "============================================"
echo ""

# Start monitoring in background
echo "Starting log monitors..."
tail -f /opt/livekit1/backend.log 2>/dev/null | grep --line-buffered -E "Creating room|SIP call dispatched|sip_call_to" &
BACKEND_PID=$!

tail -f /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null | grep --line-buffered -E "received job request|Starting agent|room_name" &
AGENT_PID=$!

sleep 2

echo "Making direct API call..."
curl -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382",
    "from_number": ""
  }' 2>&1

echo ""
echo ""
echo "Waiting for results..."
sleep 10

# Kill monitoring
kill $BACKEND_PID $AGENT_PID 2>/dev/null

echo ""
echo "============================================"
echo "Checking Results"
echo "============================================"
echo ""

echo "Recent Backend Activity:"
tail -20 /opt/livekit1/backend.log | grep -E "Creating room|SIP call dispatched" | tail -5

echo ""
echo "Recent Agent Activity:"
grep "received job request" /opt/livekit1/agents/sales_agent/agent.log | tail -3

echo ""
echo "Current Rooms:"
cd /opt/livekit1 && lk room list

echo ""
echo "Done!"
