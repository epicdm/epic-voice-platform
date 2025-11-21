#!/bin/bash
# Quick setup script for Human Handoff tool

AGENT_ID="${1:-8b7f8d81-90bc-4988-952c-a3e6b1b11b0f}"
WEBHOOK_URL="${2:-https://n8n.ai.epic.dm/webhook/human-handoff}"
USER_EMAIL="${3:-epicsmarters@gmail.com}"
STRATEGY="${4:-notification}"  # notification, livekit_invite, or sip_transfer

echo "🔧 Setting up Human Handoff tool for agent $AGENT_ID"
echo "Strategy: $STRATEGY"

# Build config JSON based on strategy
if [ "$STRATEGY" = "livekit_invite" ]; then
  CONFIG="{\"strategy\": \"livekit_invite\", \"support_team_webhook\": \"$WEBHOOK_URL\", \"livekit_url\": \"${LIVEKIT_URL}\", \"livekit_api_key\": \"${LIVEKIT_API_KEY}\", \"livekit_api_secret\": \"${LIVEKIT_API_SECRET}\"}"
elif [ "$STRATEGY" = "sip_transfer" ]; then
  SIP_NUMBER="${5:-}"
  if [ -z "$SIP_NUMBER" ]; then
    echo "❌ Error: SIP number required for sip_transfer strategy"
    echo "Usage: $0 AGENT_ID WEBHOOK_URL USER_EMAIL sip_transfer +1234567890"
    exit 1
  fi
  CONFIG="{\"strategy\": \"sip_transfer\", \"sip_number\": \"$SIP_NUMBER\"}"
else
  # Default: notification strategy
  CONFIG="{\"strategy\": \"notification\", \"support_team_webhook\": \"$WEBHOOK_URL\"}"
fi

# Check if human handoff tool already exists
EXISTING=$(PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "SELECT id FROM agent_tools WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'human_handoff';")

if [ -z "$EXISTING" ]; then
  echo "👤 Creating new human handoff tool entry..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
    VALUES (
      gen_random_uuid(),
      '$AGENT_ID',
      (SELECT id FROM users WHERE email = '$USER_EMAIL'),
      'human_handoff',
      'Human Handoff',
      true,
      '$CONFIG'::jsonb
    );
  "
  echo "✅ Human handoff tool created!"
else
  echo "👤 Updating existing human handoff tool..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    UPDATE agent_tools
    SET
      isenabled = true,
      config = '$CONFIG'::jsonb
    WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'human_handoff';
  "
  echo "✅ Human handoff tool updated!"
fi

echo ""
echo "🎉 Human Handoff tool is ready!"
echo "📋 Strategy: $STRATEGY"
if [ "$STRATEGY" != "sip_transfer" ]; then
  echo "🔗 Webhook URL: $WEBHOOK_URL"
fi
echo ""
echo "Handoff Strategies:"
echo "  - notification: Sends alert to support team (Slack/email)"
echo "  - livekit_invite: Sends join link for human to enter call"
echo "  - sip_transfer: Transfers call to phone number"
echo ""
echo "Next steps:"
echo "1. Create n8n workflow for handoff notifications"
echo "2. Add transfer_to_human function to your agent"
echo "3. Test: curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/human-handoff ..."
echo "4. Set up support team notifications (Slack, email, etc.)"
