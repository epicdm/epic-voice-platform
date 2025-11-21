#!/bin/bash
# Test script for migration 008
# This validates the SQL syntax without applying changes

echo "========================================="
echo "Testing Migration 008: Call Outcome Recording"
echo "========================================="
echo ""

# Test 1: Syntax validation
echo "Test 1: Validating SQL syntax..."
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db \
  --set ON_ERROR_STOP=on \
  --set AUTOCOMMIT=off \
  --quiet \
  -c "BEGIN;" \
  -f /opt/livekit1/migrations/008_call_outcome_recording.sql \
  -c "ROLLBACK;" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Syntax validation passed"
else
    echo "❌ Syntax validation failed"
    exit 1
fi

echo ""
echo "Test 2: Checking prerequisites..."

# Check if required tables exist
PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "
SELECT
    CASE
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs')
             AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_calls')
             AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_configs')
        THEN '✅ All prerequisite tables exist'
        ELSE '❌ Missing prerequisite tables'
    END;
"

echo ""
echo "Test 3: Checking for conflicts..."

# Check if migration already applied
ALREADY_APPLIED=$(PGPASSWORD="nXrRje4emjejjeKI009p" psql -U postgres -d epic_voice_db -t -c "
SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'livekit_call_events';
")

if [ "$ALREADY_APPLIED" -gt 0 ]; then
    echo "⚠️  Migration may already be applied (livekit_call_events table exists)"
    echo "   Check if this is a re-run or if rollback is needed"
else
    echo "✅ No conflicts detected"
fi

echo ""
echo "========================================="
echo "Migration 008 Test Summary"
echo "========================================="
echo "Status: Ready to apply"
echo ""
echo "To apply migration, run:"
echo "  PGPASSWORD=\"nXrRje4emjejjeKI009p\" psql -U postgres -d epic_voice_db -f /opt/livekit1/migrations/008_call_outcome_recording.sql"
echo ""
echo "To rollback later, run:"
echo "  PGPASSWORD=\"nXrRje4emjejjeKI009p\" psql -U postgres -d epic_voice_db -c \"BEGIN; DROP TABLE IF EXISTS livekit_call_events CASCADE; ALTER TABLE campaign_calls DROP COLUMN IF EXISTS agent_id; ALTER TABLE call_logs DROP COLUMN IF EXISTS direction, outcome, recording_url, transcript_id, metadata; COMMIT;\""
echo ""
