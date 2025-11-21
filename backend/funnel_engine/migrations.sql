-- ============================================================================
-- FUNNEL ENGINE DATABASE SCHEMA
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-11-15
-- Based on: webhook_worker pattern
-- ============================================================================

-- Create custom ENUM types
CREATE TYPE funnel_status AS ENUM ('draft', 'active', 'paused', 'archived');
CREATE TYPE node_type AS ENUM ('call', 'delay', 'condition', 'webhook', 'email', 'sms', 'end');
CREATE TYPE execution_status AS ENUM ('active', 'completed', 'failed', 'cancelled');
CREATE TYPE queue_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- ============================================================================
-- TABLE: funnels
-- ============================================================================
CREATE TABLE funnels (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status funnel_status NOT NULL DEFAULT 'draft',

    -- Flow graph stored as JSON
    graph JSONB,

    -- Settings
    settings JSONB,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for funnels
CREATE INDEX idx_funnels_user ON funnels(user_id);
CREATE INDEX idx_funnels_status ON funnels(status);
CREATE INDEX idx_funnels_user_status ON funnels(user_id, status);
CREATE INDEX idx_funnels_created ON funnels(created_at);

COMMENT ON TABLE funnels IS 'Funnel configuration and metadata';

-- ============================================================================
-- TABLE: funnel_nodes
-- ============================================================================
CREATE TABLE funnel_nodes (
    id VARCHAR(36) PRIMARY KEY,
    funnel_id VARCHAR(36) NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Node configuration
    node_type node_type NOT NULL,
    label VARCHAR(255) NOT NULL,
    config JSONB,

    -- Position in visual editor
    position_x INTEGER,
    position_y INTEGER,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for funnel_nodes
CREATE INDEX idx_funnel_nodes_funnel ON funnel_nodes(funnel_id);
CREATE INDEX idx_funnel_nodes_user ON funnel_nodes(user_id);
CREATE INDEX idx_funnel_nodes_type ON funnel_nodes(node_type);

COMMENT ON TABLE funnel_nodes IS 'Funnel nodes/stages configuration';

-- ============================================================================
-- TABLE: funnel_edges
-- ============================================================================
CREATE TABLE funnel_edges (
    id VARCHAR(36) PRIMARY KEY,
    funnel_id VARCHAR(36) NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Edge configuration
    source_node_id VARCHAR(36) NOT NULL REFERENCES funnel_nodes(id) ON DELETE CASCADE,
    target_node_id VARCHAR(36) NOT NULL REFERENCES funnel_nodes(id) ON DELETE CASCADE,

    -- Transition condition
    condition VARCHAR(100),
    label VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for funnel_edges
CREATE INDEX idx_funnel_edges_funnel ON funnel_edges(funnel_id);
CREATE INDEX idx_funnel_edges_user ON funnel_edges(user_id);
CREATE INDEX idx_funnel_edges_source ON funnel_edges(source_node_id);
CREATE INDEX idx_funnel_edges_target ON funnel_edges(target_node_id);

COMMENT ON TABLE funnel_edges IS 'Funnel edges/transitions between nodes';

-- ============================================================================
-- TABLE: funnel_executions
-- ============================================================================
CREATE TABLE funnel_executions (
    id VARCHAR(36) PRIMARY KEY,
    funnel_id VARCHAR(36) NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Lead/contact information
    lead_id VARCHAR(36),
    contact_data JSONB,

    -- Execution state
    status execution_status NOT NULL DEFAULT 'active',
    current_node_id VARCHAR(36) REFERENCES funnel_nodes(id) ON DELETE SET NULL,

    -- Execution metadata
    context JSONB,
    last_outcome VARCHAR(100),

    -- Timestamps
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for funnel_executions
CREATE INDEX idx_funnel_executions_funnel ON funnel_executions(funnel_id);
CREATE INDEX idx_funnel_executions_user ON funnel_executions(user_id);
CREATE INDEX idx_funnel_executions_status ON funnel_executions(status);
CREATE INDEX idx_funnel_executions_user_status ON funnel_executions(user_id, status);
CREATE INDEX idx_funnel_executions_started ON funnel_executions(started_at);
CREATE INDEX idx_funnel_executions_completed ON funnel_executions(completed_at);

COMMENT ON TABLE funnel_executions IS 'Funnel execution instances tracking lead progression';

-- ============================================================================
-- TABLE: funnel_execution_events
-- ============================================================================
CREATE TABLE funnel_execution_events (
    id VARCHAR(36) PRIMARY KEY,
    execution_id VARCHAR(36) NOT NULL REFERENCES funnel_executions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    node_id VARCHAR(36) REFERENCES funnel_nodes(id) ON DELETE SET NULL,

    -- Event data
    outcome VARCHAR(100),
    event_metadata JSONB,
    error_message TEXT,

    -- Timestamp
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for funnel_execution_events
CREATE INDEX idx_funnel_events_execution ON funnel_execution_events(execution_id);
CREATE INDEX idx_funnel_events_user ON funnel_execution_events(user_id);
CREATE INDEX idx_funnel_events_type ON funnel_execution_events(event_type);
CREATE INDEX idx_funnel_events_created ON funnel_execution_events(created_at);

COMMENT ON TABLE funnel_execution_events IS 'Event sourcing log for funnel executions';

-- ============================================================================
-- TABLE: funnel_stage_queue
-- ============================================================================
-- CRITICAL: COPIED FROM webhook_delivery_queue PATTERN
-- Uses SKIP LOCKED for concurrent worker processing
-- ============================================================================
CREATE TABLE funnel_stage_queue (
    id VARCHAR(36) PRIMARY KEY,
    execution_id VARCHAR(36) NOT NULL REFERENCES funnel_executions(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    funnel_id VARCHAR(36) NOT NULL REFERENCES funnels(id) ON DELETE CASCADE,

    -- Stage to process
    node_id VARCHAR(36) NOT NULL REFERENCES funnel_nodes(id) ON DELETE CASCADE,

    -- Queue status (COPIED FROM webhook_worker)
    status queue_status NOT NULL DEFAULT 'pending',

    -- Retry logic (COPIED FROM webhook_worker)
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_error TEXT,

    -- Payload for stage execution
    payload JSONB,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- ============================================================================
-- CRITICAL INDEX: Optimized for SKIP LOCKED polling
-- COPIED FROM webhook_worker pattern
-- ============================================================================
CREATE INDEX idx_funnel_queue_poll ON funnel_stage_queue(status, next_retry_at)
    WHERE status IN ('pending', 'failed');

-- Additional indexes
CREATE INDEX idx_funnel_queue_execution ON funnel_stage_queue(execution_id);
CREATE INDEX idx_funnel_queue_user ON funnel_stage_queue(user_id);
CREATE INDEX idx_funnel_queue_funnel ON funnel_stage_queue(funnel_id);
CREATE INDEX idx_funnel_queue_node ON funnel_stage_queue(node_id);
CREATE INDEX idx_funnel_queue_status ON funnel_stage_queue(status);

COMMENT ON TABLE funnel_stage_queue IS 'Queue for background funnel stage processing (SKIP LOCKED pattern)';

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get queue statistics
CREATE OR REPLACE FUNCTION get_funnel_queue_stats(p_user_id VARCHAR(36) DEFAULT NULL)
RETURNS TABLE(
    total_pending BIGINT,
    total_processing BIGINT,
    total_completed BIGINT,
    total_failed BIGINT,
    avg_retry_count NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE status = 'pending'),
        COUNT(*) FILTER (WHERE status = 'processing'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        AVG(attempt_count) FILTER (WHERE status = 'completed')
    FROM funnel_stage_queue
    WHERE p_user_id IS NULL OR user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Get funnel execution summary
CREATE OR REPLACE FUNCTION get_funnel_execution_summary(p_funnel_id VARCHAR(36))
RETURNS TABLE(
    total_executions BIGINT,
    active_executions BIGINT,
    completed_executions BIGINT,
    failed_executions BIGINT,
    avg_completion_time_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'active'),
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))
            FILTER (WHERE completed_at IS NOT NULL)
    FROM funnel_executions
    WHERE funnel_id = p_funnel_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old completed queue entries
CREATE OR REPLACE FUNCTION cleanup_funnel_queue(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM funnel_stage_queue
    WHERE status = 'completed'
      AND processed_at < NOW() - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING VIEWS
-- ============================================================================

-- Queue health view
CREATE OR REPLACE VIEW v_funnel_queue_health AS
SELECT
    status,
    COUNT(*) as entry_count,
    AVG(attempt_count) as avg_attempts,
    MIN(created_at) as oldest_entry,
    MAX(created_at) as newest_entry
FROM funnel_stage_queue
GROUP BY status;

COMMENT ON VIEW v_funnel_queue_health IS 'Queue health monitoring dashboard';

-- Funnel execution health view
CREATE OR REPLACE VIEW v_funnel_execution_health AS
SELECT
    f.id as funnel_id,
    f.name as funnel_name,
    f.status as funnel_status,
    COUNT(fe.id) as total_executions,
    COUNT(*) FILTER (WHERE fe.status = 'active') as active_executions,
    COUNT(*) FILTER (WHERE fe.status = 'completed') as completed_executions,
    COUNT(*) FILTER (WHERE fe.status = 'failed') as failed_executions,
    AVG(EXTRACT(EPOCH FROM (fe.completed_at - fe.started_at)))
        FILTER (WHERE fe.completed_at IS NOT NULL) as avg_completion_seconds
FROM funnels f
LEFT JOIN funnel_executions fe ON fe.funnel_id = f.id
GROUP BY f.id, f.name, f.status;

COMMENT ON VIEW v_funnel_execution_health IS 'Funnel execution health monitoring';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables
CREATE TRIGGER update_funnels_updated_at
    BEFORE UPDATE ON funnels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funnel_nodes_updated_at
    BEFORE UPDATE ON funnel_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funnel_edges_updated_at
    BEFORE UPDATE ON funnel_edges
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_funnel_executions_updated_at
    BEFORE UPDATE ON funnel_executions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- GRANTS (adjust based on your database users)
-- ============================================================================

-- Example grants (modify for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO backend_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO backend_user;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Uncomment to insert sample data
/*
-- Insert sample funnel
INSERT INTO funnels (id, user_id, name, description, status) VALUES
('funnel-001', 'user-001', 'Sample Sales Funnel', 'Initial outreach funnel', 'draft');

-- Insert sample nodes
INSERT INTO funnel_nodes (id, funnel_id, user_id, node_type, label, config, position_x, position_y) VALUES
('node-001', 'funnel-001', 'user-001', 'call', 'Initial Call', '{"agent_id": "agent-001"}', 100, 100),
('node-002', 'funnel-001', 'user-001', 'delay', 'Wait 1 Day', '{"delay_seconds": 86400}', 300, 100),
('node-003', 'funnel-001', 'user-001', 'email', 'Follow-up Email', '{"template_id": "template-001"}', 500, 100),
('node-004', 'funnel-001', 'user-001', 'end', 'End', '{}', 700, 100);

-- Insert sample edges
INSERT INTO funnel_edges (id, funnel_id, user_id, source_node_id, target_node_id, condition, label) VALUES
('edge-001', 'funnel-001', 'user-001', 'node-001', 'node-002', 'answered', 'If Answered'),
('edge-002', 'funnel-001', 'user-001', 'node-001', 'node-004', 'voicemail', 'If Voicemail'),
('edge-003', 'funnel-001', 'user-001', 'node-002', 'node-003', 'completed', 'After Delay'),
('edge-004', 'funnel-001', 'user-001', 'node-003', 'node-004', 'sent', 'Email Sent');
*/

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Tables created: 6
-- Indexes created: 20+
-- Functions created: 3
-- Views created: 2
-- Triggers created: 4
-- ============================================================================
