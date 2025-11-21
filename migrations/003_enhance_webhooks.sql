-- Migration 003: Enhance Webhooks Tables
-- Purpose: Add metadata and configuration to existing webhook infrastructure
-- Date: 2025-10-28

-- Enhance partner_webhooks table with additional metadata
ALTER TABLE partner_webhooks
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS created_by TEXT,
    ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS retry_config JSONB DEFAULT '{"max_retries": 3, "backoff_multiplier": 2, "initial_delay_seconds": 5}';

-- Add index for filtering by events (GIN index for array search)
CREATE INDEX IF NOT EXISTS idx_partner_webhooks_events
    ON partner_webhooks USING gin(events);

-- Enhance webhook_deliveries with more detailed tracking
ALTER TABLE webhook_deliveries
    ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
    ADD COLUMN IF NOT EXISTS retry_number INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP;

-- Index for monitoring recent deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_recent
    ON webhook_deliveries(delivered_at DESC);

-- Index for finding failed deliveries needing retry
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry
    ON webhook_deliveries(next_retry_at)
    WHERE success = false AND next_retry_at IS NOT NULL;

-- Comments
COMMENT ON COLUMN partner_webhooks.description IS 'User-friendly description of webhook purpose';
COMMENT ON COLUMN partner_webhooks.headers IS 'Custom HTTP headers to include in webhook requests';
COMMENT ON COLUMN partner_webhooks.retry_config IS 'Retry configuration: max_retries, backoff_multiplier, initial_delay_seconds';
COMMENT ON COLUMN webhook_deliveries.duration_ms IS 'Request duration in milliseconds';
COMMENT ON COLUMN webhook_deliveries.retry_number IS 'Which retry attempt this was (0 = first attempt)';
