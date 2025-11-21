-- Migration 010: FusionPBX User Account Integration
-- Add fields to users table for FusionPBX user tracking and billing

-- Add FusionPBX user fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS fusionpbx_user_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_api_key VARCHAR(255);

-- Create index on fusionpbx_user_uuid for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_fusionpbx_uuid
ON users(fusionpbx_user_uuid);

-- Add comments for documentation
COMMENT ON COLUMN users.fusionpbx_user_uuid IS 'UUID from FusionPBX v_ai_users table - links all agents for billing';
COMMENT ON COLUMN users.fusionpbx_api_key IS 'API key from FusionPBX for this user account';
