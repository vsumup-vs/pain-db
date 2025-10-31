-- AlterTable
ALTER TABLE "patients" ADD COLUMN "diagnosisCodes" JSONB;

-- Comment
COMMENT ON COLUMN "patients"."diagnosisCodes" IS 'Array of diagnosis codes: { code, codingSystem, display, isPrimary }';
