#!/bin/bash
# Quick setup script for Calendar Booking tool

AGENT_ID="${1:-8b7f8d81-90bc-4988-952c-a3e6b1b11b0f}"
WEBHOOK_URL="${2:-https://n8n.ai.epic.dm/webhook/calendar-booking}"
USER_EMAIL="${3:-epicsmarters@gmail.com}"

echo "🔧 Setting up Calendar Booking tool for agent $AGENT_ID"

# Check if calendar tool already exists
EXISTING=$(PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "SELECT id FROM agent_tools WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'calendar';")

if [ -z "$EXISTING" ]; then
  echo "📅 Creating new calendar booking tool entry..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    INSERT INTO agent_tools (id, agentconfigid, userid, tooltype, toolname, isenabled, config)
    VALUES (
      gen_random_uuid(),
      '$AGENT_ID',
      (SELECT id FROM users WHERE email = '$USER_EMAIL'),
      'calendar',
      'Calendar Booking',
      true,
      '{\"n8n_webhook_url\": \"$WEBHOOK_URL\", \"timezone\": \"America/New_York\", \"default_duration_minutes\": 30}'::jsonb
    );
  "
  echo "✅ Calendar booking tool created!"
else
  echo "📅 Updating existing calendar booking tool..."
  PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -c "
    UPDATE agent_tools
    SET
      isenabled = true,
      config = '{\"n8n_webhook_url\": \"$WEBHOOK_URL\", \"timezone\": \"America/New_York\", \"default_duration_minutes\": 30}'::jsonb
    WHERE agentconfigid = '$AGENT_ID' AND tooltype = 'calendar';
  "
  echo "✅ Calendar booking tool updated!"
fi

echo ""
echo "🎉 Calendar Booking tool is ready!"
echo "📋 Webhook URL: $WEBHOOK_URL"
echo ""
echo "Next steps:"
echo "1. Create the n8n workflow (see CALENDAR_BOOKING_N8N_SETUP.md)"
echo "2. Update the AGENT_ID in your agent's entrypoint.py if needed"
echo "3. Add the book_appointment function to your agent"
echo "4. Test by calling: curl -X POST http://localhost:5001/api/user/agents/$AGENT_ID/calendar-booking ..."
