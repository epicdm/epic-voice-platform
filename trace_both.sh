#!/bin/bash

echo "=================================================="
echo "TRACE: CLI Test (WORKS)"
echo "=================================================="
echo ""
echo "Clear agent log..."
> /opt/livekit1/agents/sales_agent/agent.log

echo "Starting agent monitor..."
tail -f /opt/livekit1/agents/sales_agent/agent.log &
TAIL_PID=$!
sleep 1

echo ""
echo "Step 1: CLI creates room..."
TIMESTAMP=$(date +%s)
ROOM_NAME="cli-trace-$TIMESTAMP"
lk room create $ROOM_NAME > /dev/null 2>&1

echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "What happened to agent?"
if grep -q "received job request" /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null; then
    echo "✅ Agent got job request from room creation!"
else
    echo "❌ No agent job request yet"
fi

echo ""
echo "Step 2: CLI creates SIP participant..."
lk sip participant create \
  --room $ROOM_NAME \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity "cli-test-$TIMESTAMP" \
  --name "CLI Test Call" > /dev/null 2>&1

echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "What happened to agent now?"
grep "job request\|connecting to room" /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null | tail -5

kill $TAIL_PID 2>/dev/null

echo ""
echo "=================================================="
echo "TRACE: GUI Test (DOESN'T WORK)"
echo "=================================================="
echo ""
echo "Clear agent log..."
> /opt/livekit1/agents/sales_agent/agent.log

echo "Starting agent monitor..."
tail -f /opt/livekit1/agents/sales_agent/agent.log &
TAIL_PID=$!
sleep 1

echo ""
echo "Making GUI API call..."
curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }' > /tmp/gui_response.json

echo "Waiting 2 seconds..."
sleep 2

echo ""
echo "What happened to agent?"
if grep -q "received job request" /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null; then
    echo "✅ Agent got job request!"
    grep "job request\|connecting" /opt/livekit1/agents/sales_agent/agent.log | tail -5
else
    echo "❌ No agent job request"
fi

kill $TAIL_PID 2>/dev/null

echo ""
echo "=================================================="
echo "SUMMARY"
echo "=================================================="
echo ""
echo "CLI Test:"
echo "  - Created room: $ROOM_NAME"
echo "  - Agent response: (see above)"
echo ""
echo "GUI Test:"
echo "  - Response: $(cat /tmp/gui_response.json | python3 -c 'import sys,json; print(json.load(sys.stdin).get("room_name", "ERROR"))')"
echo "  - Agent response: (see above)"
echo ""
