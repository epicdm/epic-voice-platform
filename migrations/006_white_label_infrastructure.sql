-- Migration 006: White-Label Infrastructure
-- Date: 2025-10-28
-- Purpose: Add white-label features for partner platform

-- ============================================
-- 1. Partner Domains (Custom Domain Support)
-- ============================================

CREATE TABLE IF NOT EXISTS partner_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_partner_domains_domain ON partner_domains(domain);
CREATE INDEX idx_partner_domains_user_id ON partner_domains(user_id);
CREATE INDEX idx_partner_domains_verified ON partner_domains(verified) WHERE verified = TRUE;

-- ============================================
-- 2. Partner Tiers and Limits
-- ============================================

DO $$ BEGIN
  CREATE TYPE partner_tier AS ENUM ('agency', 'platform', 'enterprise');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add columns to users table for white-label features
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_tier partner_tier DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_limits JSONB DEFAULT '{
  "max_concurrent_calls": 50,
  "monthly_minutes": 10000,
  "max_agents": 10,
  "max_phone_numbers": 5
}'::jsonb;

-- Branding configuration
ALTER TABLE users ADD COLUMN IF NOT EXISTS branding_config JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#0070f3",
  "secondary_color": "#7928ca",
  "accent_color": "#ff0080",
  "company_name": null,
  "support_email": null,
  "support_url": null
}'::jsonb;

-- ============================================
-- 3. API Keys Management
-- ============================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
-- 4. Partner Usage Tracking
-- ============================================

CREATE TABLE IF NOT EXISTS partner_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_partner_usage_user_date ON partner_usage(user_id, date DESC);
CREATE INDEX idx_partner_usage_date ON partner_usage(date DESC);

-- ============================================
-- 5. Webhooks Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS partner_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

CREATE INDEX idx_partner_webhooks_user_id ON partner_webhooks(user_id);
CREATE INDEX idx_partner_webhooks_active ON partner_webhooks(active) WHERE active = TRUE;

-- ============================================
-- 6. Webhook Delivery Log
-- ============================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES partner_webhooks(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  success BOOLEAN DEFAULT FALSE,

  CONSTRAINT valid_status CHECK (response_status BETWEEN 100 AND 599)
);

CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id, delivered_at DESC);
CREATE INDEX idx_webhook_deliveries_success ON webhook_deliveries(success);

-- ============================================
-- 7. Embed Widgets Configuration
-- ============================================

CREATE TABLE IF NOT EXISTS embed_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  agent_id UUID REFERENCES agent_configs(id) ON DELETE SET NULL,
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

CREATE INDEX idx_embed_widgets_user_id ON embed_widgets(user_id);
CREATE INDEX idx_embed_widgets_active ON embed_widgets(active) WHERE active = TRUE;

-- ============================================
-- 8. Functions for Usage Tracking
-- ============================================

-- Function to update partner usage after a call
CREATE OR REPLACE FUNCTION update_partner_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if call is completed
  IF NEW.status = 'completed' THEN
    INSERT INTO partner_usage (user_id, date, total_calls, total_minutes, total_cost, inbound_calls, outbound_calls)
    VALUES (
      NEW.user_id,
      DATE(NEW.created_at),
      1,
      EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60,
      NEW.cost,
      CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
      CASE WHEN NEW.direction = 'outbound' THEN 1 ELSE 0 END
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
      total_calls = partner_usage.total_calls + 1,
      total_minutes = partner_usage.total_minutes + (EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at)) / 60),
      total_cost = partner_usage.total_cost + NEW.cost,
      inbound_calls = partner_usage.inbound_calls + CASE WHEN NEW.direction = 'inbound' THEN 1 ELSE 0 END,
      outbound_calls = partner_usage.outbound_calls + CASE WHEN NEW.direction = 'outbound' THEN 1 ELSE 0 END,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  -- Track failed calls
  IF NEW.status = 'failed' THEN
    INSERT INTO partner_usage (user_id, date, failed_calls)
    VALUES (NEW.user_id, DATE(NEW.created_at), 1)
    ON CONFLICT (user_id, date) DO UPDATE SET
      failed_calls = partner_usage.failed_calls + 1,
      updated_at = CURRENT_TIMESTAMP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update usage
DROP TRIGGER IF EXISTS trigger_update_partner_usage ON call_logs;
CREATE TRIGGER trigger_update_partner_usage
  AFTER UPDATE OF status ON call_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_partner_usage();

-- ============================================
-- 9. Default Partner Tier for Existing Users
-- ============================================

-- Set default tier for existing users (null = regular B2C customer)
-- Partners will be manually upgraded to agency/platform/enterprise

COMMENT ON COLUMN users.partner_tier IS 'Partner tier: null (B2C), agency, platform, or enterprise';
COMMENT ON COLUMN users.partner_limits IS 'Partner usage limits based on tier';
COMMENT ON COLUMN users.branding_config IS 'White-label branding configuration';

-- ============================================
-- 10. Indexes for Performance
-- ============================================

-- Speed up partner tier queries
CREATE INDEX idx_users_partner_tier ON users(partner_tier) WHERE partner_tier IS NOT NULL;

-- Speed up branding lookups
CREATE INDEX idx_users_branding ON users USING GIN (branding_config) WHERE branding_config IS NOT NULL;

-- ============================================
-- 11. Grant Permissions
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
-- 12. Migration Complete
-- ============================================

-- Insert migration record (if you have a migrations table)
-- INSERT INTO migrations (version, name, applied_at)
-- VALUES (6, 'white_label_infrastructure', CURRENT_TIMESTAMP);

SELECT 'Migration 006: White-Label Infrastructure - COMPLETED' AS status;
