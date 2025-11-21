-- Migration 002: Webhook Events Queue
-- Purpose: Queue for async webhook event processing and delivery
-- Date: 2025-10-28

-- Webhook events queue for async delivery
CREATE TABLE IF NOT EXISTS webhook_events_queue (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    event_type VARCHAR(100) NOT NULL,    -- e.g., 'call.completed', 'lead.qualified'
    event_id TEXT NOT NULL UNIQUE,       -- Unique event identifier for idempotency
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payload JSONB NOT NULL,              -- Full event payload
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,              -- When successfully processed
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,             -- Scheduled time for next retry
    last_error TEXT,                     -- Last error message

    CHECK (retry_count <= max_retries)
);

-- Indexes for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_pending ON webhook_events_queue(created_at)
    WHERE processed_at IS NULL AND retry_count < max_retries;

CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_user_id ON webhook_events_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_retry ON webhook_events_queue(next_retry_at)
    WHERE processed_at IS NULL AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_event_type ON webhook_events_queue(event_type);

-- Index for cleanup of old processed events
CREATE INDEX IF NOT EXISTS idx_webhook_events_queue_cleanup ON webhook_events_queue(processed_at)
    WHERE processed_at IS NOT NULL;

-- Comments
COMMENT ON TABLE webhook_events_queue IS 'Queue for async processing of webhook events';
COMMENT ON COLUMN webhook_events_queue.event_type IS 'Type of event: call.started, call.completed, lead.qualified, etc.';
COMMENT ON COLUMN webhook_events_queue.event_id IS 'Unique event ID for idempotent delivery';
COMMENT ON COLUMN webhook_events_queue.payload IS 'Complete event data as JSON';
COMMENT ON COLUMN webhook_events_queue.next_retry_at IS 'Scheduled time for retry (exponential backoff)';
