-- Migration: Add n8n_webhook_url to funnels table
-- Purpose: Store webhook trigger URL for each n8n workflow
-- Date: 2025-11-16

-- Add column for n8n webhook URL
ALTER TABLE funnels
ADD COLUMN IF NOT EXISTS n8n_webhook_url VARCHAR(500) NULL;

-- Add comment
COMMENT ON COLUMN funnels.n8n_webhook_url IS 'n8n webhook URL for triggering funnel execution';
