-- Migration 001: CRM Connections Table
-- Purpose: Store OAuth tokens and connection info for CRM integrations (HubSpot, Salesforce, etc.)
-- Date: 2025-10-28

-- CRM OAuth connections table
CREATE TABLE IF NOT EXISTS crm_connections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'hubspot', 'salesforce', 'google_calendar', 'slack'
    access_token TEXT NOT NULL,      -- Encrypted access token
    refresh_token TEXT,              -- Encrypted refresh token (if applicable)
    token_expires_at TIMESTAMP,      -- Token expiration time
    account_id TEXT,                 -- CRM account identifier (e.g., HubSpot portal ID)
    account_name TEXT,               -- Human-readable account name
    settings JSONB DEFAULT '{}',     -- Provider-specific settings
    active BOOLEAN DEFAULT true,     -- Is connection active
    last_synced_at TIMESTAMP,        -- Last successful sync
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(user_id, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_connections_user_id ON crm_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_connections_active ON crm_connections(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_crm_connections_provider ON crm_connections(provider);
CREATE INDEX IF NOT EXISTS idx_crm_connections_expires ON crm_connections(token_expires_at)
    WHERE token_expires_at IS NOT NULL AND active = true;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_crm_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crm_connections_updated_at
    BEFORE UPDATE ON crm_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_crm_connections_updated_at();

-- Comments for documentation
COMMENT ON TABLE crm_connections IS 'OAuth connections to external CRM systems';
COMMENT ON COLUMN crm_connections.provider IS 'CRM provider: hubspot, salesforce, google_calendar, slack';
COMMENT ON COLUMN crm_connections.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN crm_connections.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN crm_connections.settings IS 'Provider-specific configuration (e.g., default channels, sync preferences)';
