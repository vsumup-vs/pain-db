-- CreateEnum
CREATE TYPE "public"."ValueType" AS ENUM ('numeric', 'ordinal', 'categorical', 'boolean', 'text', 'date');

-- CreateEnum
CREATE TYPE "public"."Severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "public"."SourceType" AS ENUM ('patient', 'device', 'staff');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('active', 'paused', 'ended');

-- CreateEnum
CREATE TYPE "public"."AlertStatus" AS ENUM ('open', 'ack', 'closed');

-- CreateEnum
CREATE TYPE "public"."CPTCode" AS ENUM ('CPT_98975', 'CPT_98976', 'CPT_98977', 'CPT_98980', 'CPT_98981', 'CPT_99457', 'CPT_99458');

-- CreateTable
CREATE TABLE "public"."patients" (
    "id" UUID NOT NULL,
    "mrn" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "gender" TEXT,
    "address" JSONB,
    "emergencyContact" JSONB,
    "medicalHistory" JSONB,
    "allergies" JSONB,
    "medications" JSONB,
    "insuranceInfo" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."clinicians" (
    "id" UUID NOT NULL,
    "npi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."metric_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "value_type" "public"."ValueType" NOT NULL,
    "unit" TEXT,
    "scale_min" DECIMAL(10,4),
    "scale_max" DECIMAL(10,4),
    "decimal_precision" INTEGER,
    "required_default" BOOLEAN NOT NULL DEFAULT false,
    "default_frequency" TEXT,
    "coding" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "locale_overrides" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessment_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assessment_template_items" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "help_text" TEXT,
    "default_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."condition_presets" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "default_protocol_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condition_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."condition_preset_diagnoses" (
    "id" UUID NOT NULL,
    "preset_id" UUID NOT NULL,
    "icd10" TEXT NOT NULL,
    "snomed" TEXT,
    "label" TEXT,

    CONSTRAINT "condition_preset_diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."condition_preset_templates" (
    "id" UUID NOT NULL,
    "preset_id" UUID NOT NULL,
    "template_id" UUID NOT NULL,

    CONSTRAINT "condition_preset_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alert_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "public"."Severity" NOT NULL,
    "window" TEXT NOT NULL,
    "expression" JSONB NOT NULL,
    "dedupe_key" TEXT,
    "cooldown" TEXT,
    "actions" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."condition_preset_alert_rules" (
    "id" UUID NOT NULL,
    "preset_id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,

    CONSTRAINT "condition_preset_alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."enrollments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "preset_id" UUID NOT NULL,
    "diagnosis_code" TEXT NOT NULL,
    "clinician_id" UUID,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'active',
    "consent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."observations" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "template_id" UUID,
    "metric_key" TEXT NOT NULL,
    "metric_definition_id" UUID NOT NULL,
    "metric_definition_version" INTEGER NOT NULL DEFAULT 1,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "source" "public"."SourceType" NOT NULL DEFAULT 'patient',
    "value_numeric" DECIMAL(14,4),
    "value_text" TEXT,
    "value_code" TEXT,
    "unit" TEXT,
    "context" JSONB,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."alerts" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "facts" JSONB,
    "status" "public"."AlertStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."timelogs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "cpt_code" "public"."CPTCode" NOT NULL,
    "minutes" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3) NOT NULL,
    "actor_id" UUID,
    "activity_ref" TEXT,
    "audit" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timelogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."messages" (
    "id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "sender_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_mrn_key" ON "public"."patients"("mrn");

-- CreateIndex
CREATE UNIQUE INDEX "patients_email_key" ON "public"."patients"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clinicians_npi_key" ON "public"."clinicians"("npi");

-- CreateIndex
CREATE INDEX "metric_definitions_key_idx" ON "public"."metric_definitions"("key");

-- CreateIndex
CREATE INDEX "metric_definitions_active_to_idx" ON "public"."metric_definitions"("active_to");

-- CreateIndex
CREATE UNIQUE INDEX "metric_definitions_key_version_key" ON "public"."metric_definitions"("key", "version");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_templates_name_version_key" ON "public"."assessment_templates"("name", "version");

-- CreateIndex
CREATE INDEX "assessment_template_items_template_id_display_order_idx" ON "public"."assessment_template_items"("template_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_template_items_template_id_metric_definition_id_key" ON "public"."assessment_template_items"("template_id", "metric_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "condition_preset_diagnoses_preset_id_icd10_key" ON "public"."condition_preset_diagnoses"("preset_id", "icd10");

-- CreateIndex
CREATE UNIQUE INDEX "condition_preset_templates_preset_id_template_id_key" ON "public"."condition_preset_templates"("preset_id", "template_id");

-- CreateIndex
CREATE UNIQUE INDEX "condition_preset_alert_rules_preset_id_rule_id_key" ON "public"."condition_preset_alert_rules"("preset_id", "rule_id");

-- CreateIndex
CREATE INDEX "enrollments_patient_id_status_idx" ON "public"."enrollments"("patient_id", "status");

-- CreateIndex
CREATE INDEX "enrollments_diagnosis_code_idx" ON "public"."enrollments"("diagnosis_code");

-- CreateIndex
CREATE INDEX "enrollments_start_date_idx" ON "public"."enrollments"("start_date");

-- CreateIndex
CREATE INDEX "enrollments_preset_id_idx" ON "public"."enrollments"("preset_id");

-- CreateIndex
CREATE INDEX "observations_enrollment_id_recorded_at_idx" ON "public"."observations"("enrollment_id", "recorded_at");

-- CreateIndex
CREATE INDEX "observations_metric_key_recorded_at_idx" ON "public"."observations"("metric_key", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "observations_metric_definition_id_idx" ON "public"."observations"("metric_definition_id");

-- CreateIndex
CREATE INDEX "observations_value_code_idx" ON "public"."observations"("value_code");

-- CreateIndex
CREATE INDEX "alerts_enrollment_id_triggered_at_idx" ON "public"."alerts"("enrollment_id", "triggered_at" DESC);

-- CreateIndex
CREATE INDEX "alerts_status_triggered_at_idx" ON "public"."alerts"("status", "triggered_at" DESC);

-- CreateIndex
CREATE INDEX "timelogs_enrollment_id_started_at_idx" ON "public"."timelogs"("enrollment_id", "started_at");

-- CreateIndex
CREATE INDEX "timelogs_cpt_code_started_at_idx" ON "public"."timelogs"("cpt_code", "started_at");

-- AddForeignKey
ALTER TABLE "public"."assessment_template_items" ADD CONSTRAINT "assessment_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assessment_template_items" ADD CONSTRAINT "assessment_template_items_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "public"."metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."condition_preset_diagnoses" ADD CONSTRAINT "condition_preset_diagnoses_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."condition_preset_templates" ADD CONSTRAINT "condition_preset_templates_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."condition_preset_templates" ADD CONSTRAINT "condition_preset_templates_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."condition_preset_alert_rules" ADD CONSTRAINT "condition_preset_alert_rules_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."condition_preset_alert_rules" ADD CONSTRAINT "condition_preset_alert_rules_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_preset_id_fkey" FOREIGN KEY ("preset_id") REFERENCES "public"."condition_presets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."enrollments" ADD CONSTRAINT "enrollments_clinician_id_fkey" FOREIGN KEY ("clinician_id") REFERENCES "public"."clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."assessment_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."observations" ADD CONSTRAINT "observations_metric_definition_id_fkey" FOREIGN KEY ("metric_definition_id") REFERENCES "public"."metric_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "public"."alert_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."alerts" ADD CONSTRAINT "alerts_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timelogs" ADD CONSTRAINT "timelogs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timelogs" ADD CONSTRAINT "timelogs_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."timelogs" ADD CONSTRAINT "timelogs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."messages" ADD CONSTRAINT "messages_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
