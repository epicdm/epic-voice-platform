-- Migration 006: White-Label Infrastructure (Fixed)
-- Date: 2025-10-28
-- Purpose: Add white-label features for partner platform

-- ============================================
-- 1. Partner Domains (Custom Domain Support)
-- ============================================

CREATE TABLE IF NOT EXISTS partner_domains (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  domain VARCHAR(255) UNIQUE NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verification_token VARCHAR(255) NOT NULL,
  ssl_enabled BOOLEAN DEFAULT FALSE,
  ssl_certificate TEXT,
  ssl_private_key TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,

  CONSTRAINT domain_format CHECK (domain ~ '^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$')
);

CREATE INDEX IF NOT EXISTS idx_partner_domains_domain ON partner_domains(domain);
CREATE INDEX IF NOT EXISTS idx_partner_domains_user_id ON partner_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_domains_verified ON partner_domains(verified) WHERE verified = TRUE;

-- ============================================
-- 2. API Keys Management (Fix Existing Table)
-- ============================================

-- Drop existing api_keys table if it's incompatible
DROP TABLE IF EXISTS api_keys CASCADE;

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  permissions JSONB DEFAULT '["read", "write"]'::jsonb,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP,

  CONSTRAINT api_key_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_active ON api_keys(user_id) WHERE revoked_at IS NULL;

-- ============================================
-- 3. Partner Usage Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS partner_usage (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  total_cost DECIMAL(10,2) DEFAULT 0.00,
  inbound_calls INTEGER DEFAULT 0,
  outbound_calls INTEGER DEFAULT 0,
  failed_calls INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, date),
  CONSTRAINT positive_counts CHECK (
    total_calls >= 0 AND
    total_minutes >= 0 AND
    total_cost >= 0 AND
    inbound_calls >= 0 AND
    outbound_calls >= 0 AND
    failed_calls >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_partner_usage_user_date ON partner_usage(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_partner_usage_date ON partner_usage(date DESC);

-- ============================================
-- 4. Webhooks Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS partner_webhooks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  events TEXT[] NOT NULL,
  secret VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT valid_url CHECK (url ~ '^https?://'),
  CONSTRAINT events_not_empty CHECK (array_length(events, 1) > 0)
);

CREATE INDEX IF NOT EXISTS idx_partner_webhooks_user_id ON partner_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_webhooks_active ON partner_webhooks(active) WHERE active = TRUE;

-- ============================================
-- 5. Webhook Delivery Log
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  webhook_id TEXT NOT NULL REFERENCES partner_webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_status CHECK (response_status BETWEEN 100 AND 599)
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON webhook_deliveries(success);

-- ============================================
-- 6. Embed Widgets Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS embed_widgets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  agent_id TEXT REFERENCES agent_configs(id) ON DELETE SET NULL,
  config JSONB DEFAULT '{
    "position": "bottom-right",
    "theme": "auto",
    "greeting_message": "Hi! How can I help you?",
    "primary_color": "#0070f3"
  }'::jsonb,
  embed_code TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_embed_widgets_user_id ON embed_widgets(user_id);
CREATE INDEX IF NOT EXISTS idx_embed_widgets_active ON embed_widgets(active) WHERE active = TRUE;

-- ============================================
-- 7. Functions for Usage Tracking
-- ============================================

-- Function to update partner usage after a call ends
CREATE OR REPLACE FUNCTION update_partner_usage_on_call()
RETURNS TRIGGER AS $$
DECLARE
  call_duration_minutes INTEGER;
  call_cost DECIMAL(10,2);
BEGIN
  -- Only update if call has ended
  IF NEW."endedAt" IS NOT NULL AND OLD."endedAt" IS NULL THEN
    -- Calculate duration in minutes
    call_duration_minutes := EXTRACT(EPOCH FROM (NEW."endedAt" - NEW."startedAt")) / 60;
    call_cost := COALESCE(NEW.cost, 0);

    -- Update or insert usage record
    INSERT INTO partner_usage (user_id, date, total_calls, total_minutes, total_cost)
    VALUES (
      NEW."userId",
      DATE(NEW."startedAt"),
      1,
      call_duration_minutes,
      call_cost
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      total_calls = partner_usage.total_calls + 1,
      total_minutes = partner_usage.total_minutes + call_duration_minutes,
      total_cost = partner_usage.total_cost + call_cost,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage when call ends
DROP TRIGGER IF EXISTS trigger_update_partner_usage ON call_logs;
CREATE TRIGGER trigger_update_partner_usage
  AFTER UPDATE OF "endedAt" ON call_logs
  FOR EACH ROW
  WHEN (NEW."endedAt" IS NOT NULL)
  EXECUTE FUNCTION update_partner_usage_on_call();

-- ============================================
-- 8. Grant Permissions
-- ============================================

-- Grant permissions to application user (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'epic_voice_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO epic_voice_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO epic_voice_app;
  END IF;
END $$;

-- ============================================
-- Migration Complete
-- ============================================

SELECT 'Migration 006: White-Label Infrastructure - COMPLETED' AS status;
