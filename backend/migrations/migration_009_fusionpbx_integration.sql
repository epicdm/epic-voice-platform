-- Migration 009: FusionPBX Integration
-- Add fields to agent_configs for FusionPBX SIP account tracking

-- Add FusionPBX integration fields to agent_configs
ALTER TABLE agent_configs
ADD COLUMN IF NOT EXISTS fusionpbx_agent_uuid UUID,
ADD COLUMN IF NOT EXISTS sip_username VARCHAR(50),
ADD COLUMN IF NOT EXISTS sip_password VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_extension VARCHAR(10),
ADD COLUMN IF NOT EXISTS sip_domain VARCHAR(255),
ADD COLUMN IF NOT EXISTS sip_server VARCHAR(255),
ADD COLUMN IF NOT EXISTS did_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS fusionpbx_extension_uuid UUID,
ADD COLUMN IF NOT EXISTS fusionpbx_did_uuid UUID;

-- Create index on fusionpbx_agent_uuid for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_configs_fusionpbx_uuid
ON agent_configs(fusionpbx_agent_uuid);

-- Create index on sip_extension for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_configs_sip_extension
ON agent_configs(sip_extension);

-- Create index on did_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_configs_did_number
ON agent_configs(did_number);

-- Add comments for documentation
COMMENT ON COLUMN agent_configs.fusionpbx_agent_uuid IS 'UUID from FusionPBX v_ai_agents table';
COMMENT ON COLUMN agent_configs.sip_username IS 'SIP username for agent (usually same as extension)';
COMMENT ON COLUMN agent_configs.sip_password IS 'SIP password for agent authentication';
COMMENT ON COLUMN agent_configs.sip_extension IS 'SIP extension number (3001-3999 range)';
COMMENT ON COLUMN agent_configs.sip_domain IS 'SIP domain (billing.call.epic.dm)';
COMMENT ON COLUMN agent_configs.sip_server IS 'SIP server address';
COMMENT ON COLUMN agent_configs.did_number IS 'Assigned DID/phone number';
COMMENT ON COLUMN agent_configs.fusionpbx_extension_uuid IS 'UUID from FusionPBX v_extensions table';
COMMENT ON COLUMN agent_configs.fusionpbx_did_uuid IS 'UUID from FusionPBX v_destinations table';
