#!/bin/bash

echo "=========================================="
echo "Detailed GUI Call Test"
echo "=========================================="
echo ""

# Make API call and extract room name
RESPONSE=$(curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }')

echo "API Response:"
echo "$RESPONSE" | python3 -m json.tool
echo ""

ROOM_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('room_name', ''))")

if [ -z "$ROOM_NAME" ]; then
    echo "❌ Failed to get room name"
    exit 1
fi

echo "Room: $ROOM_NAME"
echo ""

echo "1. Checking if room exists..."
lk room list | grep "$ROOM_NAME" || echo "  ❌ Room NOT found"
echo ""

echo "2. Checking room participants..."
lk room list-participants "$ROOM_NAME" 2>&1
echo ""

echo "3. Checking agent dispatches..."
lk dispatch list "$ROOM_NAME" 2>&1
echo ""

echo "4. Checking agent logs..."
grep -A 5 "$ROOM_NAME" /opt/livekit1/agents/sales_agent/agent.log || echo "  ❌ No agent activity for this room"
echo ""

echo "=========================================="
