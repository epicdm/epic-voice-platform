#!/bin/bash

echo "======================================"
echo "Quick CLI SIP Test"
echo "======================================"
echo ""

ROOM="test-$(date +%s)"

echo "📞 Making test call..."
echo "   To: +17672958382"
echo "   From: +17678183366"
echo "   Room: $ROOM"
echo ""

# Create SIP participant
lk sip participant create \
  --room "$ROOM" \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity cli-test-$(date +%s) 2>&1 | grep -E "SIPCallID|RoomName|Participant"

echo ""
echo "⏳ Waiting for agent to join..."
sleep 5

# Check if agent joined
AGENT_JOINED=$(grep "$ROOM" /opt/livekit1/agents/sales_agent/agent.log 2>/dev/null | grep "received job request")

if [ -n "$AGENT_JOINED" ]; then
    echo "✅ Agent joined the room!"
    echo ""
    echo "🎯 NOW CHECK YOUR ASTERISK SERVER:"
    echo ""
    echo "   On voice.epic.dm, run:"
    echo "   tcpdump -i any port 5060 -n -A | grep -A 10 INVITE"
    echo ""
    echo "   Or check logs:"
    echo "   grep 17672958382 /var/log/asterisk/full | tail -10"
    echo ""
else
    echo "❌ Agent did NOT join the room"
    echo ""
    echo "Check agent logs:"
    echo "tail -20 /opt/livekit1/agents/sales_agent/agent.log"
fi

echo ""
echo "======================================"
echo "Test Complete"
echo "======================================"
echo ""
echo "Room name: $ROOM"
echo ""
echo "To clean up:"
echo "lk room delete $ROOM"
