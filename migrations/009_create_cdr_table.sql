-- Migration 009: Create CDR (Call Detail Records) table
-- Stores call records imported from Magnus Billing / Asterisk

CREATE TABLE IF NOT EXISTS asterisk_cdrs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Asterisk CDR Core Fields
    uniqueid VARCHAR(255) NOT NULL,  -- Asterisk unique call identifier
    accountcode VARCHAR(255),         -- Magnus user account code
    calldate TIMESTAMP NOT NULL,      -- Call start time

    -- Call Participants
    src VARCHAR(80),                  -- Source number (caller)
    dst VARCHAR(80),                  -- Destination number (called)
    dcontext VARCHAR(80),             -- Dial context
    clid VARCHAR(80),                 -- Caller ID
    channel VARCHAR(80),              -- Channel name
    dstchannel VARCHAR(80),           -- Destination channel

    -- Call Metrics
    duration INTEGER DEFAULT 0,       -- Total call duration (seconds)
    billsec INTEGER DEFAULT 0,        -- Billable duration (seconds)
    disposition VARCHAR(45),          -- Call outcome (ANSWERED, NO ANSWER, BUSY, FAILED)
    outcome VARCHAR(50),              -- Normalized outcome (completed, no_answer, busy, failed)

    -- Call Details
    amaflags INTEGER,                 -- AMA flags
    lastapp VARCHAR(80),              -- Last application executed
    lastdata VARCHAR(80),             -- Last application data
    userfield VARCHAR(255),           -- User-defined field

    -- Billing Information
    cost DECIMAL(10, 4),              -- Call cost
    description TEXT,                 -- Call description/notes

    -- Magnus Specific
    magnus_cdr_id TEXT,               -- Original Magnus CDR ID
    id_user INTEGER,                  -- Magnus user ID reference
    terminatecauseid INTEGER,         -- Termination cause code

    -- Metadata
    raw_data JSONB,                   -- Complete CDR data from Magnus

    -- Timestamps
    synced_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_cdr_per_user UNIQUE(user_id, uniqueid)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_user_id ON asterisk_cdrs(user_id);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_calldate ON asterisk_cdrs(calldate DESC);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_outcome ON asterisk_cdrs(outcome);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_uniqueid ON asterisk_cdrs(uniqueid);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_src ON asterisk_cdrs(src);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_dst ON asterisk_cdrs(dst);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_accountcode ON asterisk_cdrs(accountcode);
CREATE INDEX IF NOT EXISTS idx_asterisk_cdrs_disposition ON asterisk_cdrs(disposition);

-- Update trigger
CREATE OR REPLACE FUNCTION update_asterisk_cdrs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_asterisk_cdrs_updated_at
BEFORE UPDATE ON asterisk_cdrs
FOR EACH ROW
EXECUTE FUNCTION update_asterisk_cdrs_updated_at();

-- Comments
COMMENT ON TABLE asterisk_cdrs IS 'Call Detail Records imported from Magnus Billing / Asterisk';
COMMENT ON COLUMN asterisk_cdrs.uniqueid IS 'Asterisk unique call identifier';
COMMENT ON COLUMN asterisk_cdrs.disposition IS 'Asterisk disposition: ANSWERED, NO ANSWER, BUSY, FAILED';
COMMENT ON COLUMN asterisk_cdrs.outcome IS 'Normalized outcome: completed, no_answer, busy, failed';
COMMENT ON COLUMN asterisk_cdrs.billsec IS 'Billable seconds (answered duration)';
COMMENT ON COLUMN asterisk_cdrs.duration IS 'Total call duration including ringing';
