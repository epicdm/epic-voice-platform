#!/bin/bash

echo "============================================"
echo "GUI Call Debug Monitor"
echo "============================================"
echo ""
echo "INSTRUCTIONS:"
echo "1. Leave this terminal open"
echo "2. Go to your browser: http://localhost:3001/agents"
echo "3. Click 'Test Call' on Sales Agent"
echo "4. Enter: 17672958382"
echo "5. Click 'Initiate Call'"
echo ""
echo "Monitoring will start in 3 seconds..."
sleep 3

echo "============================================"
echo "Monitoring started - Make your GUI call NOW!"
echo "============================================"
echo ""

# Start monitoring agent logs
(
  echo "=== AGENT LOGS ===" 
  timeout 40 tail -f /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null | grep --line-buffered -E "received job request|Starting agent|room_name|ERROR" &
)

# Start monitoring backend logs  
(
  echo "=== BACKEND LOGS ==="
  timeout 40 tail -f /opt/livekit1/backend.log 2>/dev/null | grep --line-buffered -E "Creating room|SIP call dispatched|sip_call_to" &
)

# Wait for monitoring
sleep 40

echo ""
echo "============================================"
echo "Monitoring complete!"
echo "============================================"
echo ""

# Check results
echo "Checking room status..."
cd /opt/livekit1 && lk room list

echo ""
echo "Checking recent agent activity..."
grep "received job request" /opt/livekit1/agents/sales_agent/agent.log | tail -3

echo ""
echo "Done!"
