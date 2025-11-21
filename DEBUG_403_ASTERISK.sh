#!/bin/bash

echo "============================================"
echo "Asterisk 403 Forbidden Debugger"
echo "============================================"
echo ""
echo "This script will make a test call and help"
echo "you debug why Asterisk returns 403."
echo ""
echo "Make sure to run these commands on your"
echo "Asterisk server (voice.epic.dm) in parallel:"
echo ""
echo "Terminal 1:"
echo "  tail -f /var/log/asterisk/full | grep -i 'INVITE\|403\|17672958382'"
echo ""
echo "Terminal 2:"
echo "  tcpdump -i any port 5060 -n -A | grep -A 20 INVITE"
echo ""
echo "Press Enter when ready..."
read

echo ""
echo "Making test call NOW..."
echo ""

cd /opt/livekit1

ROOM="test-$(date +%s)"
lk sip participant create \
  --room "$ROOM" \
  --trunk ST_sTo8gGpNbXzY \
  --call +17672958382 \
  --number +17678183366 \
  --identity cli-test-$(date +%s)

echo ""
echo "============================================"
echo "Call attempt complete"
echo "============================================"
echo ""
echo "What to check on your Asterisk server:"
echo ""
echo "1. Did you see the INVITE in tcpdump?"
echo "   YES: Asterisk received it ✅"
echo "   NO: Firewall or network issue ❌"
echo ""
echo "2. What does the Asterisk log show?"
echo "   Check /var/log/asterisk/full for:"
echo "   - Authentication failures"
echo "   - Context mismatches"
echo "   - Extension not found errors"
echo ""
echo "3. Common 403 causes:"
echo "   a) SIP peer not matching (check host/IP)"
echo "   b) Extension not found in context"
echo "   c) Authentication failed"
echo "   d) Peer type wrong (should be 'friend' or 'peer')"
echo ""
