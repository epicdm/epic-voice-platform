-- ============================================================================
-- Webhook Delivery Worker - Database Schema
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-10-29
-- Description: Queue-based webhook delivery system with retry logic
-- ============================================================================

-- ============================================================================
-- 1. Partner Webhook Configuration Table
-- ============================================================================
-- Purpose: Store partner webhook endpoints and configuration

CREATE TABLE IF NOT EXISTS partner_webhooks (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Tenant Scoping
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Partner Identity
    partner_name VARCHAR(255) NOT NULL,
    partner_slug VARCHAR(100) NOT NULL,

    -- Webhook Configuration
    url TEXT NOT NULL,
    secret TEXT NOT NULL,  -- Encrypted at application layer

    -- Event Filters
    enabled_events JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: ["call.completed", "call.failed", "recording.ready"]

    -- White-Label Settings
    custom_payload_fields JSONB,
    -- Example: {"brand": "MyBrand", "environment": "production"}

    -- Status
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_pw_user_slug UNIQUE ("userId", partner_slug),
    CONSTRAINT chk_pw_url CHECK (url ~ '^https?://'),
    CONSTRAINT chk_pw_slug CHECK (partner_slug ~ '^[a-z0-9-]+$')
);

-- Indexes for partner_webhooks
CREATE INDEX IF NOT EXISTS idx_pw_user_enabled
    ON partner_webhooks ("userId", enabled);

CREATE INDEX IF NOT EXISTS idx_pw_slug
    ON partner_webhooks (partner_slug);

COMMENT ON TABLE partner_webhooks IS
    'Partner webhook endpoint configurations with multi-tenant isolation';

COMMENT ON COLUMN partner_webhooks.secret IS
    'Webhook signing secret (encrypted at application layer)';

COMMENT ON COLUMN partner_webhooks.enabled_events IS
    'Array of event types this partner subscribes to';

-- ============================================================================
-- 2. Webhook Delivery Queue Table
-- ============================================================================
-- Purpose: Queue for pending webhook deliveries with retry management

CREATE TABLE IF NOT EXISTS webhook_delivery_queue (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Tenant Scoping
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    "partnerId" VARCHAR(36) REFERENCES partner_webhooks(id) ON DELETE CASCADE,

    -- Webhook Configuration
    url TEXT NOT NULL,
    secret TEXT NOT NULL,  -- Encrypted at application layer

    -- Event Data
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- Status values: 'pending', 'processing', 'delivered', 'failed', 'dead_letter'

    -- Retry Management
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMP WITH TIME ZONE,

    -- Delivery Tracking
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    last_response_status INTEGER,
    last_response_body TEXT,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "scheduledAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    "deliveredAt" TIMESTAMP WITH TIME ZONE,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT chk_wdq_status CHECK (
        status IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')
    ),
    CONSTRAINT chk_wdq_attempt_count CHECK (attempt_count >= 0),
    CONSTRAINT chk_wdq_max_attempts CHECK (max_attempts > 0),
    CONSTRAINT chk_wdq_url CHECK (url ~ '^https?://')
);

-- Critical Index: Worker polling query optimization
CREATE INDEX IF NOT EXISTS idx_wdq_status_next_retry
    ON webhook_delivery_queue ("userId", status, next_retry_at)
    WHERE status IN ('pending', 'failed');

-- Index: Partner-specific webhook queries
CREATE INDEX IF NOT EXISTS idx_wdq_partner_status
    ON webhook_delivery_queue ("partnerId", status);

-- Index: Event type analysis
CREATE INDEX IF NOT EXISTS idx_wdq_event_type
    ON webhook_delivery_queue (event_type);

-- Index: Time-based queries
CREATE INDEX IF NOT EXISTS idx_wdq_created
    ON webhook_delivery_queue ("createdAt");

-- Index: Dead letter queue monitoring
CREATE INDEX IF NOT EXISTS idx_wdq_dead_letter
    ON webhook_delivery_queue (status, "createdAt")
    WHERE status = 'dead_letter';

COMMENT ON TABLE webhook_delivery_queue IS
    'Queue for webhook deliveries with retry logic and status tracking';

COMMENT ON COLUMN webhook_delivery_queue.status IS
    'Delivery status: pending (queued), processing (in-flight), delivered (success), failed (retrying), dead_letter (max retries exceeded)';

COMMENT ON COLUMN webhook_delivery_queue.next_retry_at IS
    'Next scheduled retry time (calculated with exponential backoff)';

COMMENT ON COLUMN webhook_delivery_queue.payload IS
    'Full webhook payload including event data and metadata';

-- ============================================================================
-- 3. Webhook Delivery Log Table (Optional - for audit trail)
-- ============================================================================
-- Purpose: Immutable log of all webhook delivery attempts

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
    -- Primary Key
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,

    -- Foreign Keys
    "webhookQueueId" VARCHAR(36) REFERENCES webhook_delivery_queue(id) ON DELETE CASCADE,
    "userId" VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Delivery Attempt
    attempt_number INTEGER NOT NULL,
    attempt_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    -- Request Details
    url TEXT NOT NULL,
    request_headers JSONB,
    request_payload JSONB,

    -- Response Details
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Error Details
    error_message TEXT,
    network_error BOOLEAN DEFAULT false,

    -- Result
    success BOOLEAN NOT NULL,

    -- Timestamps
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for webhook_delivery_log
CREATE INDEX IF NOT EXISTS idx_wdl_queue_id
    ON webhook_delivery_log ("webhookQueueId");

CREATE INDEX IF NOT EXISTS idx_wdl_user_timestamp
    ON webhook_delivery_log ("userId", attempt_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_wdl_success
    ON webhook_delivery_log (success, attempt_timestamp DESC);

COMMENT ON TABLE webhook_delivery_log IS
    'Immutable audit log of all webhook delivery attempts';

-- ============================================================================
-- 4. Helper Functions
-- ============================================================================

-- Function: Get queue statistics
CREATE OR REPLACE FUNCTION get_webhook_queue_stats()
RETURNS TABLE (
    status VARCHAR(50),
    count BIGINT,
    oldest_pending TIMESTAMP WITH TIME ZONE,
    avg_attempts NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wdq.status,
        COUNT(*) as count,
        MIN(wdq."createdAt") as oldest_pending,
        AVG(wdq.attempt_count)::NUMERIC(10,2) as avg_attempts
    FROM webhook_delivery_queue wdq
    GROUP BY wdq.status
    ORDER BY wdq.status;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_webhook_queue_stats() IS
    'Get webhook queue statistics by status';

-- Function: Clean up old delivered webhooks
CREATE OR REPLACE FUNCTION cleanup_delivered_webhooks(
    retention_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM webhook_delivery_queue
    WHERE status = 'delivered'
    AND "deliveredAt" < NOW() - INTERVAL '1 day' * retention_days;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_delivered_webhooks(INTEGER) IS
    'Clean up delivered webhooks older than retention period (default 30 days)';

-- ============================================================================
-- 5. Sample Data (for development/testing)
-- ============================================================================

-- Sample partner webhook configuration (commented out for production)
/*
INSERT INTO partner_webhooks (
    id, "userId", partner_name, partner_slug, url, secret, enabled_events, enabled
) VALUES (
    'sample_partner_1',
    'user_1',  -- Replace with actual user ID
    'Sample Partner',
    'sample-partner',
    'https://webhook.site/sample',
    'test_secret_123',
    '["call.completed", "call.failed"]'::jsonb,
    true
);
*/

-- ============================================================================
-- 6. Monitoring Views
-- ============================================================================

-- View: Current queue status
CREATE OR REPLACE VIEW v_webhook_queue_status AS
SELECT
    status,
    COUNT(*) as webhook_count,
    MIN("createdAt") as oldest_webhook,
    MAX("createdAt") as newest_webhook,
    AVG(attempt_count)::NUMERIC(10,2) as avg_attempts,
    MAX(attempt_count) as max_attempts_seen
FROM webhook_delivery_queue
GROUP BY status;

COMMENT ON VIEW v_webhook_queue_status IS
    'Real-time webhook queue status summary';

-- View: Partner webhook health
CREATE OR REPLACE VIEW v_partner_webhook_health AS
SELECT
    pw.id as partner_id,
    pw.partner_name,
    pw.partner_slug,
    pw.enabled,
    COUNT(wdq.id) as total_webhooks,
    COUNT(CASE WHEN wdq.status = 'delivered' THEN 1 END) as delivered_count,
    COUNT(CASE WHEN wdq.status = 'dead_letter' THEN 1 END) as dead_letter_count,
    COUNT(CASE WHEN wdq.status = 'pending' THEN 1 END) as pending_count,
    AVG(CASE WHEN wdq.status = 'delivered'
        THEN wdq.attempt_count
    END)::NUMERIC(10,2) as avg_attempts_to_success
FROM partner_webhooks pw
LEFT JOIN webhook_delivery_queue wdq ON pw.id = wdq."partnerId"
GROUP BY pw.id, pw.partner_name, pw.partner_slug, pw.enabled;

COMMENT ON VIEW v_partner_webhook_health IS
    'Partner-specific webhook delivery health metrics';

-- ============================================================================
-- 7. Grants (adjust as needed for your environment)
-- ============================================================================

-- Grant access to application user
-- GRANT SELECT, INSERT, UPDATE ON partner_webhooks TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON webhook_delivery_queue TO app_user;
-- GRANT SELECT, INSERT ON webhook_delivery_log TO app_user;
-- GRANT SELECT ON v_webhook_queue_status TO app_user;
-- GRANT SELECT ON v_partner_webhook_health TO app_user;

-- ============================================================================
-- End of Schema
-- ============================================================================

-- Usage Examples:
--
-- 1. Get queue statistics:
--    SELECT * FROM get_webhook_queue_stats();
--
-- 2. Monitor queue status:
--    SELECT * FROM v_webhook_queue_status;
--
-- 3. Check partner health:
--    SELECT * FROM v_partner_webhook_health WHERE enabled = true;
--
-- 4. Clean up old webhooks:
--    SELECT cleanup_delivered_webhooks(30);  -- 30 days retention
--
-- 5. Find stuck webhooks:
--    SELECT * FROM webhook_delivery_queue
--    WHERE status = 'processing'
--    AND last_attempt_at < NOW() - INTERVAL '5 minutes';
