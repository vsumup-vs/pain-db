-- CreateEnum
CREATE TYPE "ScheduledAssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScheduledAssessmentFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'AS_NEEDED');

-- CreateTable
CREATE TABLE "scheduled_assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "conditionPresetId" TEXT,
    "frequency" "ScheduledAssessmentFrequency" NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "scheduledBy" TEXT,
    "status" "ScheduledAssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "completedAssessmentId" TEXT,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "lastNotificationAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_assessments_completedAssessmentId_key" ON "scheduled_assessments"("completedAssessmentId");

-- CreateIndex
CREATE INDEX "scheduled_assessments_organizationId_idx" ON "scheduled_assessments"("organizationId");

-- CreateIndex
CREATE INDEX "scheduled_assessments_patientId_idx" ON "scheduled_assessments"("patientId");

-- CreateIndex
CREATE INDEX "scheduled_assessments_enrollmentId_idx" ON "scheduled_assessments"("enrollmentId");

-- CreateIndex
CREATE INDEX "scheduled_assessments_templateId_idx" ON "scheduled_assessments"("templateId");

-- CreateIndex
CREATE INDEX "scheduled_assessments_status_idx" ON "scheduled_assessments"("status");

-- CreateIndex
CREATE INDEX "scheduled_assessments_dueDate_idx" ON "scheduled_assessments"("dueDate");

-- CreateIndex
CREATE INDEX "scheduled_assessments_frequency_idx" ON "scheduled_assessments"("frequency");

-- CreateIndex
CREATE INDEX "scheduled_assessments_priority_idx" ON "scheduled_assessments"("priority");

-- CreateIndex
CREATE INDEX "scheduled_assessments_scheduledBy_idx" ON "scheduled_assessments"("scheduledBy");

-- CreateIndex
CREATE INDEX "scheduled_assessments_completedBy_idx" ON "scheduled_assessments"("completedBy");

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_conditionPresetId_fkey" FOREIGN KEY ("conditionPresetId") REFERENCES "condition_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_scheduledBy_fkey" FOREIGN KEY ("scheduledBy") REFERENCES "clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_assessments" ADD CONSTRAINT "scheduled_assessments_completedAssessmentId_fkey" FOREIGN KEY ("completedAssessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
