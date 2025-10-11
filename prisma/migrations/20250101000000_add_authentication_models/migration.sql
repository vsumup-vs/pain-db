-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'CLINICIAN', 'NURSE', 'PATIENT', 'CAREGIVER', 'RESEARCHER', 'BILLING_ADMIN');

-- CreateEnum
CREATE TYPE "public"."OrganizationType" AS ENUM ('HOSPITAL', 'CLINIC', 'PRACTICE', 'HEALTH_SYSTEM', 'RESEARCH', 'INSURANCE');

-- CreateEnum
CREATE TYPE "public"."SocialProvider" AS ENUM ('MICROSOFT', 'GOOGLE', 'OKTA', 'AZURE_AD');

-- CreateEnum
CREATE TYPE "public"."ProgramType" AS ENUM ('RTM', 'RPM', 'CCM', 'PCM', 'BHI', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."Permission" AS ENUM ('PATIENT_READ', 'PATIENT_WRITE', 'PATIENT_DELETE', 'OBSERVATION_READ', 'OBSERVATION_WRITE', 'OBSERVATION_DELETE', 'ASSESSMENT_READ', 'ASSESSMENT_WRITE', 'ASSESSMENT_DELETE', 'PROGRAM_READ', 'PROGRAM_WRITE', 'PROGRAM_DELETE', 'ORG_USER_MANAGE', 'ORG_SETTINGS_MANAGE', 'ORG_BILLING_MANAGE', 'SYSTEM_ADMIN', 'AUDIT_READ', 'BILLING_READ', 'BILLING_WRITE', 'COMPLIANCE_READ');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatar" TEXT,
    "emailVerified" TIMESTAMP(3),
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastLoginAt" TIMESTAMP(3),
    "passwordResetToken" TEXT,
    "passwordResetExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "type" "public"."OrganizationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hipaaCompliant" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "billingInfo" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_organizations" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "permissions" "public"."Permission"[] DEFAULT ARRAY[]::"public"."Permission"[],
    "programAccess" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "canBill" BOOLEAN NOT NULL DEFAULT false,
    "billingRate" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "user_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."social_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "public"."SocialProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'oauth',
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "scope" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."care_programs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."ProgramType" NOT NULL,
    "description" TEXT,
    "cptCodes" "public"."CPTCode"[] DEFAULT ARRAY[]::"public"."CPTCode"[],
    "requiredPermissions" "public"."Permission"[] DEFAULT ARRAY[]::"public"."Permission"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "care_programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "permissions" "public"."Permission"[] DEFAULT ARRAY[]::"public"."Permission"[],
    "programTypes" "public"."ProgramType"[] DEFAULT ARRAY[]::"public"."ProgramType"[],
    "description" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "role_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "organizationId" UUID,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "hipaaRelevant" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_domain_key" ON "public"."organizations"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "user_organizations_userId_organizationId_key" ON "public"."user_organizations"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "social_accounts_provider_providerAccountId_key" ON "public"."social_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "role_templates_role_key" ON "public"."role_templates"("role");

-- AddForeignKey
ALTER TABLE "public"."user_organizations" ADD CONSTRAINT "user_organizations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_organizations" ADD CONSTRAINT "user_organizations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."social_accounts" ADD CONSTRAINT "social_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."care_programs" ADD CONSTRAINT "care_programs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key for enrollments to care_programs (if enrollments table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments' AND table_schema = 'public') THEN
        ALTER TABLE "public"."enrollments" ADD COLUMN IF NOT EXISTS "programId" UUID;
        
        -- Check if foreign key constraint doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'enrollments_programId_fkey' 
            AND table_name = 'enrollments' 
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_programId_fkey" 
            FOREIGN KEY ("programId") REFERENCES "public"."care_programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;