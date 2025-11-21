-- Migration: Add calendar_connections table for multi-tenant calendar support
-- Date: 2025-11-20

CREATE TABLE IF NOT EXISTS calendar_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    userid TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'google', 'microsoft', 'calendly'
    calendar_email VARCHAR(255),
    credentials TEXT,  -- Encrypted JSON with OAuth tokens
    calendar_id VARCHAR(255),  -- Primary calendar ID
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_calendar_connections_userid ON calendar_connections(userid);
CREATE INDEX idx_calendar_connections_active ON calendar_connections(userid, is_active);

-- Comments
COMMENT ON TABLE calendar_connections IS 'Stores user OAuth credentials for calendar integrations';
COMMENT ON COLUMN calendar_connections.provider IS 'Calendar provider: google, microsoft, or calendly';
COMMENT ON COLUMN calendar_connections.credentials IS 'Encrypted JSON containing OAuth tokens';
COMMENT ON COLUMN calendar_connections.calendar_id IS 'Primary calendar ID for booking appointments';
