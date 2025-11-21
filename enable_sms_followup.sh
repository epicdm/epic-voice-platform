#!/bin/bash
# Quick setup script for SMS Follow-up tool

AGENT_ID="${1:-8b7f8d81-90bc-4988-952c-a3e6b1b11b0f}"
WEBHOOK_URL="${2:-https://n8n.ai.epic.dm/webhook/sms-followup}"
USER_EMAIL="${3:-epicsmarters@gmail.com}"
FROM_NUMBER="${4:-}"

echo "🔧 Setting up SMS Follow-up tool for agent $AGENT_ID"

# Build config JSON
if [ -n "$FROM_NUMBER" ]; then
  CONFIG="{\"n8n_webhook_url\": \"$WEBHOOK_URL\", \"default_from_number\": \"$FROM_NUMBER\"}"
else
  CONFIG="{\"n8n_webhook_url\": \"$WEBHOOK_URL\"}"
fi

# Check if SMS tool already exists
EXISTING=$(PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "SELECT id FROM agent_tools WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'sms';")

if [ -z "$EXISTING" ]; then
  echo "📱 Creating new SMS follow-up tool entry..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
    VALUES (
      gen_random_uuid(),
      '$AGENT_ID',
      (SELECT id FROM users WHERE email = '$USER_EMAIL'),
      'sms',
      'SMS Follow-up',
      true,
      '$CONFIG'::jsonb
    );
  "
  echo "✅ SMS follow-up tool created!"
else
  echo "📱 Updating existing SMS follow-up tool..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    UPDATE agent_tools
    SET
      isenabled = true,
      config = '$CONFIG'::jsonb
    WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'sms';
  "
  echo "✅ SMS follow-up tool updated!"
fi

echo ""
echo "🎉 SMS Follow-up tool is ready!"
echo "📋 Webhook URL: $WEBHOOK_URL"
if [ -n "$FROM_NUMBER" ]; then
  echo "📞 Default From Number: $FROM_NUMBER"
fi
echo ""
echo "Available SMS Templates:"
echo "  - appointment_reminder"
echo "  - call_summary"
echo "  - appointment_confirmation"
echo "  - follow_up"
echo "  - link_share"
echo ""
echo "Next steps:"
echo "1. Set up Twilio account at https://www.twilio.com"
echo "2. Create n8n workflow with Twilio integration"
echo "3. Add send_sms function to your agent"
echo "4. Test: curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/sms-followup ..."
