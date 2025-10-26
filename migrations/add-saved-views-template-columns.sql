-- Migration: Add template support to saved_views table
-- Date: 2025-10-26
-- Run this as postgres superuser

-- Add is_template column (marks system-provided templates)
ALTER TABLE saved_views
ADD COLUMN IF NOT EXISTS is_template BOOLEAN NOT NULL DEFAULT false;

-- Add suggested_role column (role suggestion for template)
ALTER TABLE saved_views
ADD COLUMN IF NOT EXISTS suggested_role TEXT;

-- Add index on is_template for filtering performance
CREATE INDEX IF NOT EXISTS saved_views_is_template_idx ON saved_views(is_template);

-- Grant permissions to pain_user
GRANT ALL PRIVILEGES ON TABLE saved_views TO pain_user;

-- Verify changes
\d saved_views
