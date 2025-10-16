-- ============================================================================
-- PHASE 0: Configurable Billing Architecture
-- ============================================================================
-- This migration creates the flexible billing configuration system that allows
-- billing requirements to be data-driven rather than hardcoded.
--
-- New Models:
--   1. billing_programs - Defines billing programs (CMS RPM 2025, UK NHS, etc.)
--   2. billing_cpt_codes - Defines CPT codes with configurable criteria
--   3. billing_eligibility_rules - Defines eligibility rules for billing programs
--
-- Enhanced Models:
--   - enrollments: Added billingProgramId and billingEligibility fields
-- ============================================================================

-- Step 1: Create billing_programs table
CREATE TABLE "billing_programs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "region" TEXT NOT NULL,
  "payer" TEXT,
  "programType" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "requirements" JSONB NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for billing_programs
CREATE INDEX "billing_programs_region_programType_idx" ON "billing_programs"("region", "programType");
CREATE INDEX "billing_programs_isActive_idx" ON "billing_programs"("isActive");
CREATE INDEX "billing_programs_effectiveFrom_effectiveTo_idx" ON "billing_programs"("effectiveFrom", "effectiveTo");
CREATE INDEX "billing_programs_code_idx" ON "billing_programs"("code");

-- Step 2: Create billing_cpt_codes table
CREATE TABLE "billing_cpt_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billingProgramId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "criteria" JSONB NOT NULL,
  "reimbursementRate" DECIMAL(10,2),
  "currency" TEXT DEFAULT 'USD',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("billingProgramId") REFERENCES "billing_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes and constraints for billing_cpt_codes
CREATE UNIQUE INDEX "billing_cpt_codes_billingProgramId_code_key" ON "billing_cpt_codes"("billingProgramId", "code");
CREATE INDEX "billing_cpt_codes_billingProgramId_idx" ON "billing_cpt_codes"("billingProgramId");
CREATE INDEX "billing_cpt_codes_code_idx" ON "billing_cpt_codes"("code");
CREATE INDEX "billing_cpt_codes_category_idx" ON "billing_cpt_codes"("category");
CREATE INDEX "billing_cpt_codes_isActive_idx" ON "billing_cpt_codes"("isActive");

-- Step 3: Create billing_eligibility_rules table
CREATE TABLE "billing_eligibility_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billingProgramId" TEXT NOT NULL,
  "ruleName" VARCHAR(200) NOT NULL,
  "ruleType" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "ruleLogic" JSONB NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("billingProgramId") REFERENCES "billing_programs"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for billing_eligibility_rules
CREATE INDEX "billing_eligibility_rules_billingProgramId_idx" ON "billing_eligibility_rules"("billingProgramId");
CREATE INDEX "billing_eligibility_rules_ruleType_idx" ON "billing_eligibility_rules"("ruleType");
CREATE INDEX "billing_eligibility_rules_priority_idx" ON "billing_eligibility_rules"("priority");

-- Step 4: Add billingProgramId and billingEligibility to enrollments table
ALTER TABLE "enrollments"
ADD COLUMN "billingProgramId" TEXT,
ADD COLUMN "billingEligibility" JSONB;

-- Create index for billingProgramId
CREATE INDEX "enrollments_billingProgramId_idx" ON "enrollments"("billingProgramId");

-- Add foreign key constraint
ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_billingProgramId_fkey"
FOREIGN KEY ("billingProgramId")
REFERENCES "billing_programs"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "billing_programs" IS 'Configurable billing programs (CMS RPM 2025, UK NHS, etc.) with versioning';
COMMENT ON TABLE "billing_cpt_codes" IS 'CPT codes with flexible billing criteria (data-driven, not hardcoded)';
COMMENT ON TABLE "billing_eligibility_rules" IS 'Eligibility rules for billing programs (insurance, diagnosis, age, consent, etc.)';
COMMENT ON COLUMN "enrollments"."billingProgramId" IS 'Links enrollment to specific billing configuration';
COMMENT ON COLUMN "enrollments"."billingEligibility" IS 'JSON field storing eligibility verification data (who verified, when, chronic conditions, insurance info)';
