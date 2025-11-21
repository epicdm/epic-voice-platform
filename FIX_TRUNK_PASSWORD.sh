#!/bin/bash

echo "=================================================="
echo "Fix LiveKit Outbound Trunk Authentication"
echo "=================================================="
echo ""
echo "The issue: LiveKit's password doesn't match Asterisk"
echo ""
echo "Your Asterisk credentials:"
echo "  Username: 17678183366"
echo "  Password: werwqerwqrwq555"
echo ""
echo "You need to update your LiveKit trunk to match!"
echo ""
echo "=================================================="
echo ""

# Get trunk details
echo "Current LiveKit trunk config:"
echo ""
lk sip outbound list

echo ""
echo "=================================================="
echo ""
echo "To update the trunk password:"
echo ""
echo "1. Create a file: trunk-update.json"
echo ""
cat > /opt/livekit1/trunk-update.json <<'EOF'
{
  "authUsername": "17678183366",
  "authPassword": "werwqerwqrwq555"
}
EOF

echo "Created trunk-update.json with correct credentials"
echo ""
echo "2. Run this command:"
echo ""
echo "   lk sip outbound update --id ST_sTo8gGpNbXzY trunk-update.json"
echo ""
echo "=================================================="
echo ""
echo "Press Enter to update the trunk now, or Ctrl+C to cancel"
read

echo ""
echo "Updating trunk..."
lk sip outbound update --id ST_sTo8gGpNbXzY /opt/livekit1/trunk-update.json

echo ""
echo "=================================================="
echo "Done! Now test again:"
echo ""
echo "  cd /opt/livekit1"
echo "  ./quick_cli_test.sh"
echo ""
echo "=================================================="
