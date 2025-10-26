-- Add review tracking columns to observations table
-- This fixes the migration that was partially applied

-- Add reviewStatus column with default PENDING
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'PENDING';

-- Add reviewedAt timestamp column
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);

-- Add reviewedById foreign key to User
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

-- Add reviewMethod enum column
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "reviewMethod" "ReviewMethod";

-- Add reviewNotes text column
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT;

-- Add relatedAlertId foreign key to Alert
ALTER TABLE "observations"
ADD COLUMN IF NOT EXISTS "relatedAlertId" TEXT;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'observations_reviewedById_fkey'
  ) THEN
    ALTER TABLE "observations"
    ADD CONSTRAINT "observations_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'observations_relatedAlertId_fkey'
  ) THEN
    ALTER TABLE "observations"
    ADD CONSTRAINT "observations_relatedAlertId_fkey"
    FOREIGN KEY ("relatedAlertId") REFERENCES "alerts"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
