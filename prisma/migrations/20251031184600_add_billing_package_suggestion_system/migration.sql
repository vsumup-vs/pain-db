-- Add billing package template system for automatic suggestion
-- This migration adds support for automatic billing package suggestions based on diagnosis codes

-- Create billing_package_templates table
CREATE TABLE "billing_package_templates" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "category" TEXT NOT NULL,
  "isStandardized" BOOLEAN NOT NULL DEFAULT false,
  "sourceTemplateId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "diagnosisCriteria" JSONB NOT NULL,
  "programCombinations" JSONB NOT NULL,
  "suggestedPresets" JSONB,
  "clinicalRationale" TEXT,
  "evidenceSource" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "billing_package_templates_organizationId_idx" ON "billing_package_templates"("organizationId");
CREATE INDEX "billing_package_templates_category_idx" ON "billing_package_templates"("category");
CREATE INDEX "billing_package_templates_isStandardized_idx" ON "billing_package_templates"("isStandardized");
CREATE INDEX "billing_package_templates_isActive_idx" ON "billing_package_templates"("isActive");
CREATE INDEX "billing_package_templates_code_idx" ON "billing_package_templates"("code");

-- Create code_system_mappings table for SNOMED CT <-> ICD-10 mapping
CREATE TABLE "code_system_mappings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sourceSystem" TEXT NOT NULL,
  "sourceCode" TEXT NOT NULL,
  "sourceDisplay" TEXT NOT NULL,
  "targetSystem" TEXT NOT NULL,
  "targetCode" TEXT NOT NULL,
  "targetDisplay" TEXT NOT NULL,
  "mappingType" TEXT NOT NULL,
  "confidence" DECIMAL(3,2) NOT NULL,
  "evidenceSource" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "code_system_mappings_sourceSystem_sourceCode_targetSystem_key" ON "code_system_mappings"("sourceSystem", "sourceCode", "targetSystem");
CREATE INDEX "code_system_mappings_targetSystem_targetCode_idx" ON "code_system_mappings"("targetSystem", "targetCode");
CREATE INDEX "code_system_mappings_sourceSystem_sourceCode_idx" ON "code_system_mappings"("sourceSystem", "sourceCode");
CREATE INDEX "code_system_mappings_isActive_idx" ON "code_system_mappings"("isActive");

-- Create enrollment_suggestions table to track automatic package suggestions
CREATE TABLE "enrollment_suggestions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "packageTemplateId" TEXT NOT NULL,
  "matchScore" DECIMAL(5,2) NOT NULL,
  "matchedDiagnoses" JSONB NOT NULL,
  "suggestedPrograms" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdEnrollmentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "enrollment_suggestions_organizationId_idx" ON "enrollment_suggestions"("organizationId");
CREATE INDEX "enrollment_suggestions_patientId_idx" ON "enrollment_suggestions"("patientId");
CREATE INDEX "enrollment_suggestions_packageTemplateId_idx" ON "enrollment_suggestions"("packageTemplateId");
CREATE INDEX "enrollment_suggestions_status_idx" ON "enrollment_suggestions"("status");
CREATE INDEX "enrollment_suggestions_createdAt_idx" ON "enrollment_suggestions"("createdAt");
CREATE INDEX "enrollment_suggestions_sourceType_sourceId_idx" ON "enrollment_suggestions"("sourceType", "sourceId");

-- Enhance encounter_notes table with diagnosis codes and recommendations
ALTER TABLE "encounter_notes"
ADD COLUMN "diagnosisCodes" JSONB,
ADD COLUMN "recommendations" JSONB;

-- Add helpful comment for diagnosisCodes JSON structure
COMMENT ON COLUMN "encounter_notes"."diagnosisCodes" IS 'Structured diagnosis codes: [{"code": "J44.9", "display": "COPD", "codingSystem": "ICD-10", "onsetDate": "2025-10-01"}]';

-- Add helpful comment for recommendations JSON structure
COMMENT ON COLUMN "encounter_notes"."recommendations" IS 'Treatment recommendations: {"remoteMonitoring": true, "followUpDays": 7, "referrals": ["pulmonology"], "medications": [...]}';
