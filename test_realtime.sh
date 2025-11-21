#!/bin/bash

echo "=================================================="
echo "Real-time Test - Watch Everything Happen"
echo "=================================================="
echo ""

# Start monitoring agent in background
echo "Starting agent log monitor..."
tail -f /opt/livekit1/agents/sales_agent/agent.log &
TAIL_PID=$!

sleep 2
echo ""
echo "Making API call..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }')

ROOM_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('room_name', ''))" 2>/dev/null)

echo ""
echo "Room: $ROOM_NAME"
echo ""
echo "Waiting 5 seconds..."
sleep 5

echo ""
echo "Checking room status..."
lk room list | grep "$ROOM_NAME" || echo "Room not found (already closed?)"

echo ""
echo "Stopping monitor..."
kill $TAIL_PID 2>/dev/null

echo ""
echo "=================================================="
echo "CHECK ASTERISK NOW!"
echo "=================================================="
echo ""
echo "On voice.epic.dm, what do you see in:"
echo "  tail -20 /var/log/asterisk/full"
echo ""
