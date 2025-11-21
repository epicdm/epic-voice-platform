-- Migration 011: Add FusionPBX fields to phone_number_pool
-- Date: November 17, 2025
-- Purpose: Store FusionPBX/FreeSWITCH metadata for phone number inventory

-- Add FusionPBX-specific columns
ALTER TABLE phone_number_pool
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_agent_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_user_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS sip_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_server VARCHAR(255);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_ext
ON phone_number_pool(fusionpbx_extension_uuid);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_did
ON phone_number_pool(fusionpbx_did_uuid);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_agent
ON phone_number_pool(fusionpbx_agent_uuid);

CREATE INDEX IF NOT EXISTS idx_phone_pool_fusionpbx_user
ON phone_number_pool(fusionpbx_user_email);

-- Add comments for documentation
COMMENT ON COLUMN phone_number_pool.fusionpbx_extension_uuid IS 'Extension UUID in FusionPBX v_extensions table';
COMMENT ON COLUMN phone_number_pool.fusionpbx_did_uuid IS 'DID UUID in FusionPBX v_did_assignments table';
COMMENT ON COLUMN phone_number_pool.fusionpbx_agent_uuid IS 'Agent UUID in FusionPBX v_ai_agents table';
COMMENT ON COLUMN phone_number_pool.fusionpbx_user_email IS 'Email of user who owns this number in FusionPBX';
COMMENT ON COLUMN phone_number_pool.sip_username IS 'SIP username (extension number)';
COMMENT ON COLUMN phone_number_pool.sip_password IS 'SIP password for authentication';
COMMENT ON COLUMN phone_number_pool.sip_domain IS 'SIP domain (e.g., billing.call.epic.dm)';
COMMENT ON COLUMN phone_number_pool.sip_server IS 'SIP server address';

-- Migration complete
SELECT 'Migration 011 completed successfully' AS status;
