-- Migration 001: Brand Kits System
-- Date: 2025-11-16
-- Purpose: Add account-level brand kit support for consistent branding across landing pages, messages, emails

-- Create brand_kits table
CREATE TABLE IF NOT EXISTS brand_kits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    "isDefault" BOOLEAN DEFAULT false,

    -- Source Information
    "sourceType" VARCHAR(50),  -- 'facebook', 'instagram', 'website', 'manual'
    "sourceUrl" TEXT,

    -- Brand Assets
    "logoUrl" TEXT,
    "logoSvg" TEXT,  -- Stored SVG content for scalability

    -- Brand Colors (JSON array)
    "brandColors" JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"hex": "#FF5733", "name": "primary", "usage": "main brand color"}, ...]

    -- Typography
    fonts JSONB DEFAULT '[]'::jsonb,
    -- Example: [{"family": "Roboto", "weights": [400, 700], "usage": "headings"}, ...]

    -- Company Info (extracted or manual)
    "companyName" VARCHAR(255),
    tagline TEXT,
    industry VARCHAR(100),
    description TEXT,

    -- Contact Info
    phone VARCHAR(50),
    email VARCHAR(255),
    "websiteUrl" TEXT,

    -- Social Media Links
    "socialLinks" JSONB DEFAULT '{}'::jsonb,
    -- Example: {"facebook": "https://...", "instagram": "https://...", "linkedin": "https://..."}

    -- Metadata
    "extractionStatus" VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed', 'failed', 'manual'
    "extractionMetadata" JSONB DEFAULT '{}'::jsonb,  -- Store API response, errors, etc.
    "lastSyncedAt" TIMESTAMP,

    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_user_brand_name UNIQUE("userId", name)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_brand_kits_user_id ON brand_kits("userId");
CREATE INDEX IF NOT EXISTS idx_brand_kits_default ON brand_kits("userId", "isDefault") WHERE "isDefault" = true;

-- Add brand_kit_id to funnels table
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS "brandKitId" UUID REFERENCES brand_kits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_funnels_brand_kit_id ON funnels("brandKitId");

-- Add brand_kit_id to agent_configs table
ALTER TABLE agent_configs ADD COLUMN IF NOT EXISTS "brandKitId" UUID REFERENCES brand_kits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_agent_configs_brand_kit_id ON agent_configs("brandKitId");

-- Trigger to ensure only one default brand kit per user
CREATE OR REPLACE FUNCTION enforce_single_default_brand_kit()
RETURNS TRIGGER AS $$
BEGIN
    -- If setting a brand kit as default, unset all other defaults for this user
    IF NEW."isDefault" = true THEN
        UPDATE brand_kits
        SET "isDefault" = false
        WHERE "userId" = NEW."userId"
          AND id != NEW.id
          AND "isDefault" = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_default_brand_kit
    BEFORE INSERT OR UPDATE ON brand_kits
    FOR EACH ROW
    EXECUTE FUNCTION enforce_single_default_brand_kit();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_brand_kit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_brand_kit_timestamp
    BEFORE UPDATE ON brand_kits
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_kit_timestamp();

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON brand_kits TO your_app_user;

COMMENT ON TABLE brand_kits IS 'Account-level brand kits for consistent branding across landing pages, messages, emails, and agents';
COMMENT ON COLUMN brand_kits."userId" IS 'Owner of this brand kit';
COMMENT ON COLUMN brand_kits."isDefault" IS 'Whether this is the default brand kit for the user (only one per user)';
COMMENT ON COLUMN brand_kits."sourceType" IS 'Where the brand info was extracted from: facebook, instagram, website, or manual';
COMMENT ON COLUMN brand_kits."brandColors" IS 'Array of brand colors with hex codes, names, and usage descriptions';
COMMENT ON COLUMN brand_kits."extractionStatus" IS 'Status of brand extraction: pending, completed, failed, or manual';
