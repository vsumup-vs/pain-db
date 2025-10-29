-- Manual migration: Add organization branding fields
-- Date: 2025-10-29
-- Purpose: Add logoUrl and brandingConfig to Organization model for multi-tenant white-labeling

-- Add logoUrl field to store uploaded logo URL
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;

-- Add brandingConfig JSON field to store branding settings
-- Example: { "copyright": "© 2024 ABC Clinic", "showPoweredBy": true, "primaryColor": "#1e40af" }
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brandingConfig" JSONB;

-- Create index for faster logo lookups
CREATE INDEX IF NOT EXISTS "organizations_logoUrl_idx" ON "organizations"("logoUrl") WHERE "logoUrl" IS NOT NULL;
