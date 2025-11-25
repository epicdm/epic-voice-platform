-- Migration 010: Fix sip_extension VARCHAR length
-- Increase from VARCHAR(10) to VARCHAR(20) to handle full DID numbers
-- Fixes: psycopg2.errors.StringDataRightTruncation error

-- Increase sip_extension column size to handle full phone numbers like +17678189329
ALTER TABLE agent_configs
ALTER COLUMN sip_extension TYPE VARCHAR(20);

-- Add comment explaining the fix
COMMENT ON COLUMN agent_configs.sip_extension IS 'SIP extension or DID number (can store full phone numbers up to 20 chars)';
