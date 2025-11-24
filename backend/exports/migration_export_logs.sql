-- Migration: Add export_logs table for audit logging
-- Date: 2025-10-30
-- Description: Track all CSV export operations for security and compliance

CREATE TABLE IF NOT EXISTS export_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    export_type VARCHAR(50) NOT NULL,
    filters JSONB DEFAULT '{}'::jsonb,
    row_count INTEGER DEFAULT 0,
    file_size_bytes INTEGER DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),

    -- Foreign key constraint
    CONSTRAINT fk_export_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_export_logs_user_id ON export_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_logs_export_type ON export_logs(export_type);
CREATE INDEX IF NOT EXISTS idx_export_logs_created_at ON export_logs(created_at);

-- Comments for documentation
COMMENT ON TABLE export_logs IS 'Audit log for CSV export operations';
COMMENT ON COLUMN export_logs.id IS 'Unique export log identifier (UUID)';
COMMENT ON COLUMN export_logs.user_id IS 'User who requested the export';
COMMENT ON COLUMN export_logs.export_type IS 'Type of export (calls, leads, agents, phone_numbers, events)';
COMMENT ON COLUMN export_logs.filters IS 'JSON object containing filter parameters used';
COMMENT ON COLUMN export_logs.row_count IS 'Number of rows exported';
COMMENT ON COLUMN export_logs.file_size_bytes IS 'Size of generated CSV file in bytes';
COMMENT ON COLUMN export_logs.created_at IS 'Timestamp when export was requested';
COMMENT ON COLUMN export_logs.ip_address IS 'IP address of requesting client';
COMMENT ON COLUMN export_logs.user_agent IS 'User agent string of requesting client';
