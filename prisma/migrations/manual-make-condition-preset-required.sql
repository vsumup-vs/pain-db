-- Migration: Make conditionPresetId required in enrollments table
-- Date: 2025-10-21
-- Reason: Every enrollment must have a clinical monitoring protocol defined

-- This migration should be executed by a database administrator with proper permissions

BEGIN;

-- First, verify there are no null values (safety check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM enrollments WHERE "conditionPresetId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot make conditionPresetId required: found enrollments with null values. Please assign condition presets first.';
  END IF;
END $$;

-- Alter the column to NOT NULL
ALTER TABLE enrollments
  ALTER COLUMN "conditionPresetId" SET NOT NULL;

-- Verify the change
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'enrollments'
    AND column_name = 'conditionPresetId'
    AND is_nullable = 'NO'
  ) THEN
    RAISE NOTICE 'Migration successful: conditionPresetId is now required';
  ELSE
    RAISE EXCEPTION 'Migration verification failed';
  END IF;
END $$;

COMMIT;
