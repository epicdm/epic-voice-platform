#!/bin/bash
# Quick script to enable Email Follow-up for an agent

AGENT_ID="${1:-8b7f8d81-90bc-4988-952c-a3e6b1b11b0f}"
WEBHOOK_URL="${2:-https://n8n.ai.epic.dm/webhook/ai-agent-email-followup}"
USER_EMAIL="${3:-epicsmarters@gmail.com}"

echo "🔧 Enabling Email Follow-up for Agent"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Agent ID: $AGENT_ID"
echo "Webhook URL: $WEBHOOK_URL"
echo "User Email: $USER_EMAIL"
echo ""

# Check if email tool already exists
EXISTING=$(PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "SELECT id FROM agent_tools WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'email';")

if [ -z "$EXISTING" ]; then
  echo "📝 Creating new email tool entry..."

  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
    VALUES (
      gen_random_uuid(),
      '$AGENT_ID',
      (SELECT id FROM users WHERE email = '$USER_EMAIL'),
      'email',
      'Email Follow-up',
      true,
      '{\"n8n_webhook_url\": \"$WEBHOOK_URL\", \"from_email\": \"noreply@epic.dm\"}'::jsonb
    );
  "

  echo "✅ Email tool created and enabled!"
else
  echo "📝 Updating existing email tool entry..."

  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    UPDATE agent_tools
    SET
      isenabled = true,
      config = jsonb_set(
        COALESCE(config, '{}'::jsonb),
        '{n8n_webhook_url}',
        '\"$WEBHOOK_URL\"'
      )
    WHERE
      agentconfigid = '$AGENT_ID'
      AND tooltype = 'email';
  "

  echo "✅ Email tool updated and enabled!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Email Follow-up is now enabled!"
echo ""
echo "Next Steps:"
echo "1. Create n8n workflow at: https://n8n.ai.epic.dm"
echo "2. Configure SMTP/email provider in n8n"
echo "3. Test with:"
echo ""
echo "   curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/email-followup \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'X-User-Email: $USER_EMAIL' \\"
echo "     -d '{\"to\": \"test@example.com\", \"subject\": \"Test\", \"body\": \"Hello!\"}'"
echo ""
