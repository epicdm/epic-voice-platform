-- Migration 007: Lead Upload & Campaign Scheduler System
-- Created: 2025-10-28
-- Purpose: Enable lead management and scheduled outbound call campaigns

-- ============================================
-- Campaigns Table (Create first - referenced by leads)
-- ============================================
CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES agent_configs(id) ON DELETE SET NULL,

    -- Campaign Details
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Campaign Status
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- Status values: draft, scheduled, running, paused, completed, cancelled

    -- Scheduling
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,

    -- Call Configuration
    call_config JSONB DEFAULT '{}',
    -- Example: {"max_retries": 3, "retry_delay_hours": 24, "call_window_start": "09:00", "call_window_end": "17:00", "timezone": "America/New_York"}

    -- Campaign Metrics
    leads_total INTEGER DEFAULT 0,
    leads_completed INTEGER DEFAULT 0,
    leads_failed INTEGER DEFAULT 0,
    leads_in_progress INTEGER DEFAULT 0,

    -- Performance Metrics
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    average_duration_seconds DECIMAL(10, 2) DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_scheduled_dates CHECK (scheduled_end IS NULL OR scheduled_end >= scheduled_start)
);

-- Index for efficient campaign queries
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_agent_id ON campaigns(agent_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled_start ON campaigns(scheduled_start);

-- ============================================
-- Leads Table
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,

    -- Contact Information
    phone_number VARCHAR(20) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    company VARCHAR(255),

    -- Lead Status
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    -- Status values: new, queued, calling, completed, failed, dnc (do-not-call)

    -- Additional Data
    metadata JSONB DEFAULT '{}',
    -- Flexible field for custom data like: industry, deal_value, notes, custom_fields

    -- Source Tracking
    source VARCHAR(100),
    -- Source values: csv_upload, api_import, manual_entry, crm_sync

    -- Call History
    last_called_at TIMESTAMP,
    times_called INTEGER DEFAULT 0,
    last_call_status VARCHAR(50),
    last_call_duration INTEGER, -- seconds

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Indexes
    CONSTRAINT unique_user_phone_per_campaign UNIQUE (user_id, phone_number, campaign_id)
);

-- Index for efficient filtering and searching
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_phone_number ON leads(phone_number);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

-- ============================================
-- Campaign Calls Table
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_calls (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    call_log_id TEXT REFERENCES call_logs(id) ON DELETE SET NULL,

    -- Call Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: pending, scheduled, calling, completed, failed, cancelled, retry

    -- Scheduling
    scheduled_for TIMESTAMP NOT NULL,
    attempted_at TIMESTAMP,
    completed_at TIMESTAMP,

    -- Call Details
    call_duration_seconds INTEGER,
    call_outcome VARCHAR(100),
    -- Outcome values: answered, no_answer, busy, failed, voicemail, completed, error

    -- Retry Logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,

    -- Error Tracking
    error_message TEXT,
    error_code VARCHAR(50),

    -- LiveKit Room Details
    livekit_room_name VARCHAR(255),
    livekit_participant_sid VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_campaign_lead UNIQUE (campaign_id, lead_id)
);

-- Index for efficient call scheduling and status updates
CREATE INDEX IF NOT EXISTS idx_campaign_calls_campaign_id ON campaign_calls(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_lead_id ON campaign_calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_status ON campaign_calls(status);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_scheduled_for ON campaign_calls(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_calls_next_retry_at ON campaign_calls(next_retry_at);

-- ============================================
-- Campaign Templates Table (Optional - for future use)
-- ============================================
CREATE TABLE IF NOT EXISTS campaign_templates (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Template Configuration
    template_config JSONB NOT NULL DEFAULT '{}',
    -- Example: {"agent_instructions": "...", "call_window": "...", "retry_config": {...}}

    is_default BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_campaign_templates_user_id ON campaign_templates(user_id);

-- ============================================
-- Trigger: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_calls_updated_at BEFORE UPDATE ON campaign_calls
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_templates_updated_at BEFORE UPDATE ON campaign_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================
-- Uncomment to insert sample campaign template
/*
INSERT INTO campaign_templates (user_id, name, description, template_config, is_default)
VALUES (
    1,
    'Default Outbound Campaign',
    'Standard outbound calling campaign with 3 retries',
    '{"max_retries": 3, "retry_delay_hours": 24, "call_window_start": "09:00", "call_window_end": "17:00", "timezone": "America/New_York"}'::jsonb,
    TRUE
);
*/

-- ============================================
-- Migration Complete
-- ============================================
-- This migration adds:
-- - campaigns table: 20 columns, 4 indexes
-- - leads table: 14 columns, 5 indexes
-- - campaign_calls table: 17 columns, 5 indexes
-- - campaign_templates table: 7 columns, 1 index
-- - Automatic updated_at triggers on all tables
-- - Comprehensive foreign key relationships
-- - Status tracking for lead lifecycle
-- - Scheduling capabilities for campaigns
-- - Retry logic for failed calls
-- - Performance metrics for campaigns
