-- ============================================
-- Migration 008: Call Outcome Recording
-- Purpose: Add fields for comprehensive call outcome tracking
-- Author: System Architect
-- Date: 2025-10-29
-- ============================================

-- Safety: Run in transaction for rollback capability
BEGIN;

-- ============================================
-- 1. Enhance call_logs table
-- ============================================
DO $$
BEGIN
    -- Add direction column (inbound/outbound)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_logs' AND column_name = 'direction'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN direction VARCHAR(20) DEFAULT 'outbound';
        RAISE NOTICE 'Added direction column to call_logs';
    END IF;

    -- Add outcome column (call result classification)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_logs' AND column_name = 'outcome'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN outcome VARCHAR(50);
        RAISE NOTICE 'Added outcome column to call_logs';
    END IF;

    -- Add recording_url column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_logs' AND column_name = 'recording_url'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN recording_url TEXT;
        RAISE NOTICE 'Added recording_url column to call_logs';
    END IF;

    -- Add transcript_id column (future use)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_logs' AND column_name = 'transcript_id'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN transcript_id TEXT;
        RAISE NOTICE 'Added transcript_id column to call_logs';
    END IF;

    -- Add metadata JSONB column for flexible data storage
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'call_logs' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE call_logs ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to call_logs';
    END IF;
END $$;

-- Add indexes for filtering and analytics
CREATE INDEX IF NOT EXISTS idx_call_logs_outcome ON call_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_call_logs_direction ON call_logs(direction);
CREATE INDEX IF NOT EXISTS idx_call_logs_ended_at ON call_logs("endedAt");

-- Add comments for documentation
COMMENT ON COLUMN call_logs.direction IS 'Call direction: inbound or outbound';
COMMENT ON COLUMN call_logs.outcome IS 'Call outcome: completed, no_answer, busy, failed, voicemail, error';
COMMENT ON COLUMN call_logs.recording_url IS 'URL to call recording from LiveKit Egress';
COMMENT ON COLUMN call_logs.transcript_id IS 'Reference to transcript storage (future)';
COMMENT ON COLUMN call_logs.metadata IS 'Flexible JSONB field for: sentiment, tags, custom_data';

DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced call_logs table with outcome tracking fields';
END $$;

-- ============================================
-- 2. Add agent_id to campaign_calls
-- ============================================
DO $$
BEGIN
    -- Add agent_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'campaign_calls' AND column_name = 'agent_id'
    ) THEN
        ALTER TABLE campaign_calls
        ADD COLUMN agent_id TEXT REFERENCES agent_configs(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added agent_id column to campaign_calls';
    END IF;
END $$;

-- Add index for agent_id filtering
CREATE INDEX IF NOT EXISTS idx_campaign_calls_agent_id ON campaign_calls(agent_id);

COMMENT ON COLUMN campaign_calls.agent_id IS 'Reference to agent_configs used for this call';

DO $$
BEGIN
    RAISE NOTICE '✅ Added agent_id tracking to campaign_calls';
END $$;

-- ============================================
-- 3. Create livekit_call_events table
-- ============================================
CREATE TABLE IF NOT EXISTS livekit_call_events (
    -- Primary Key
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,

    -- Idempotency Key (unique event ID from LiveKit)
    event_id TEXT NOT NULL UNIQUE,

    -- Event Identification
    room_name VARCHAR(255) NOT NULL,
    participant_sid VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    -- Event types: participant_left, room_finished, egress_ended

    -- Event Payload
    event_payload JSONB NOT NULL,
    -- Store full webhook payload for debugging and audit

    -- Processing Status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    error_message TEXT,

    -- Link to call_log after processing
    call_log_id TEXT REFERENCES call_logs(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_livekit_events_event_id ON livekit_call_events(event_id);
CREATE INDEX IF NOT EXISTS idx_livekit_events_room_name ON livekit_call_events(room_name);
CREATE INDEX IF NOT EXISTS idx_livekit_events_processed ON livekit_call_events(processed);
CREATE INDEX IF NOT EXISTS idx_livekit_events_created_at ON livekit_call_events(created_at);
CREATE INDEX IF NOT EXISTS idx_livekit_events_call_log_id ON livekit_call_events(call_log_id);

-- Auto-update timestamp trigger
DROP TRIGGER IF EXISTS update_livekit_call_events_updated_at ON livekit_call_events;
CREATE TRIGGER update_livekit_call_events_updated_at
    BEFORE UPDATE ON livekit_call_events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Table comments
COMMENT ON TABLE livekit_call_events IS 'Stores LiveKit webhook events for idempotent call outcome processing';
COMMENT ON COLUMN livekit_call_events.event_id IS 'Unique event ID from LiveKit (idempotency key)';
COMMENT ON COLUMN livekit_call_events.room_name IS 'LiveKit room name for event lookup';
COMMENT ON COLUMN livekit_call_events.event_type IS 'Type of LiveKit event received';
COMMENT ON COLUMN livekit_call_events.event_payload IS 'Full webhook payload for debugging';
COMMENT ON COLUMN livekit_call_events.processed IS 'Whether event has been processed successfully';
COMMENT ON COLUMN livekit_call_events.call_log_id IS 'Link to call_logs after successful processing';

DO $$
BEGIN
    RAISE NOTICE '✅ Created livekit_call_events table for idempotent event processing';
END $$;

-- ============================================
-- 4. Data Integrity Checks
-- ============================================

-- Verify call_logs table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'call_logs') THEN
        RAISE EXCEPTION 'call_logs table does not exist - cannot apply migration';
    END IF;
END $$;

-- Verify campaign_calls table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_calls') THEN
        RAISE EXCEPTION 'campaign_calls table does not exist - cannot apply migration';
    END IF;
END $$;

-- Verify agent_configs table exists (for foreign key)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agent_configs') THEN
        RAISE EXCEPTION 'agent_configs table does not exist - cannot add foreign key';
    END IF;
END $$;

-- ============================================
-- 5. Migration Verification
-- ============================================

-- Count affected tables
DO $$
DECLARE
    call_logs_cols INTEGER;
    campaign_calls_cols INTEGER;
    events_table INTEGER;
BEGIN
    -- Check call_logs columns
    SELECT COUNT(*) INTO call_logs_cols
    FROM information_schema.columns
    WHERE table_name = 'call_logs'
    AND column_name IN ('direction', 'outcome', 'recording_url', 'transcript_id', 'metadata');

    -- Check campaign_calls columns
    SELECT COUNT(*) INTO campaign_calls_cols
    FROM information_schema.columns
    WHERE table_name = 'campaign_calls'
    AND column_name = 'agent_id';

    -- Check livekit_call_events table
    SELECT COUNT(*) INTO events_table
    FROM information_schema.tables
    WHERE table_name = 'livekit_call_events';

    -- Verify all changes applied
    IF call_logs_cols != 5 THEN
        RAISE EXCEPTION 'call_logs columns not properly added (expected 5, got %)', call_logs_cols;
    END IF;

    IF campaign_calls_cols != 1 THEN
        RAISE EXCEPTION 'campaign_calls.agent_id not properly added';
    END IF;

    IF events_table != 1 THEN
        RAISE EXCEPTION 'livekit_call_events table not properly created';
    END IF;

    RAISE NOTICE '✅ Migration verification passed: All schema changes applied successfully';
END $$;

-- ============================================
-- 6. Migration Summary
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 008: Call Outcome Recording';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Modified:';
    RAISE NOTICE '  1. call_logs - Added 5 columns (direction, outcome, recording_url, transcript_id, metadata)';
    RAISE NOTICE '  2. campaign_calls - Added 1 column (agent_id)';
    RAISE NOTICE '  3. livekit_call_events - NEW TABLE (idempotency tracking)';
    RAISE NOTICE '';
    RAISE NOTICE 'Indexes Created: 9 new indexes for performance optimization';
    RAISE NOTICE 'Foreign Keys: 2 new foreign key constraints';
    RAISE NOTICE 'Triggers: 1 trigger for auto-timestamp updates';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration 008 completed successfully!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Deploy call outcome processing code';
    RAISE NOTICE '  2. Configure LiveKit webhook endpoint';
    RAISE NOTICE '  3. Test with sample calls';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

-- Commit transaction
COMMIT;

-- ============================================
-- Rollback Script (if needed)
-- ============================================
-- To rollback this migration, run:
--
-- BEGIN;
-- DROP TABLE IF EXISTS livekit_call_events CASCADE;
-- ALTER TABLE campaign_calls DROP COLUMN IF EXISTS agent_id;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS direction;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS outcome;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS recording_url;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS transcript_id;
-- ALTER TABLE call_logs DROP COLUMN IF EXISTS metadata;
-- COMMIT;
