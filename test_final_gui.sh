#!/bin/bash

echo "=================================================="
echo "FINAL GUI TEST - LiveKit Documented Workflow"
echo "=================================================="
echo ""
echo "✅ Backend simplified to match LiveKit docs:"
echo "   - Only CreateSIPParticipant (no room creation)"
echo "   - wait_until_answered = true"
echo "   - No explicit agent dispatch"
echo ""
echo "=================================================="
echo ""

# Clear logs
> /opt/livekit1/agents/sales_agent/agent.log

echo "Making API call to backend..."
echo ""

RESPONSE=$(curl -s -X POST http://localhost:5001/api/sip/outbound-call \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "fedf402c-03e5-45fb-8844-d283cac93e11",
    "to_number": "+17672958382"
  }')

echo "$RESPONSE" | python3 -m json.tool
echo ""

ROOM_NAME=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('room_name', ''))" 2>/dev/null)

if [ -z "$ROOM_NAME" ]; then
    echo "❌ API call failed"
    exit 1
fi

echo "=================================================="
echo "WHAT SHOULD HAPPEN NOW:"
echo "=================================================="
echo ""
echo "1. LiveKit sends SIP INVITE to Asterisk"
echo "   → Check: tcpdump -i any port 5060 -n -A"
echo ""
echo "2. Asterisk authenticates (username/password)"
echo "   → Should see: 401 Unauthorized → Re-INVITE with auth"
echo ""
echo "3. Asterisk accepts or rejects call"
echo "   → 200 OK = accepted ✅"
echo "   → 403 Forbidden = dialplan issue ❌"
echo ""
echo "4. If call connects:"
echo "   → Room created: $ROOM_NAME"
echo "   → Agent auto-joins room"
echo "   → Agent speaks to caller"
echo ""
echo "=================================================="
echo ""
echo "Waiting 10 seconds for call to connect..."
sleep 10

echo ""
echo "Checking agent logs..."
if grep -q "received job request" /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null; then
    echo "✅ Agent received job request!"
    echo ""
    tail -20 /opt/livekit1/agents/sales_agent/agent.log
else
    echo "❌ Agent did NOT receive job request"
    echo ""
    echo "This means EITHER:"
    echo "  - Call didn't connect (Asterisk rejected)"
    echo "  - LiveKit didn't send INVITE"
    echo "  - Agent dispatch not working"
fi

echo ""
echo "=================================================="
echo "CHECK ASTERISK SERVER NOW!"
echo "=================================================="
echo ""
echo "On voice.epic.dm, run:"
echo ""
echo "  tail -50 /var/log/asterisk/full | grep -i '17672958382\\|INVITE\\|403\\|200'"
echo ""
echo "Expected to see:"
echo "  - INVITE from LiveKit"
echo "  - 401 Unauthorized (auth challenge)"  
echo "  - Re-INVITE with Authorization header"
echo "  - 200 OK (accepted) or 403 Forbidden (rejected)"
echo ""
echo "=================================================="
