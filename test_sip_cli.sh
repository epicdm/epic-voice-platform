#\!/bin/bash

echo "=========================================="
echo "LiveKit SIP CLI Test"
echo "=========================================="
echo ""

# Get current timestamp
TIMESTAMP=$(date +%s)
ROOM_NAME="test-$TIMESTAMP"

echo "Step 1: Creating test room..."
lk room create $ROOM_NAME
echo ""

echo "Step 2: Making SIP call via CLI..."
echo "  To: +17672958382"
echo "  From: +17678183366"
echo "  Trunk: ST_sTo8gGpNbXzY"
echo ""

lk sip participant create \
  --room $ROOM_NAME \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity "cli-test-$TIMESTAMP" \
  --name "CLI Test Call"

echo ""
echo "Step 3: Checking room status..."
sleep 2
lk room list | grep -A 5 "$ROOM_NAME" || echo "Room not found"

echo ""
echo "=========================================="
echo "Test Complete\!"
echo "=========================================="
echo ""
echo "CRITICAL: Check your Asterisk server NOW\!"
echo ""
echo "On Asterisk server, run:"
echo "  tcpdump -i any port 5060 -n -A"
echo ""
echo "Or check Asterisk logs:"
echo "  grep -i INVITE /var/log/asterisk/messages"
echo "  grep 17672958382 /var/log/asterisk/full"
echo ""
echo "Did you see SIP INVITE from LiveKit?"
echo "  YES → Asterisk issue (dialplan, auth, routing)"
echo "  NO  → Network/firewall issue (LiveKit can't reach Asterisk)"
echo ""
echo "Clean up:"
echo "  lk room delete $ROOM_NAME"
echo ""
