-- CreateTable
CREATE TABLE "drugs" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand_name" TEXT,
    "active_ingredient" TEXT NOT NULL,
    "drug_class" TEXT NOT NULL,
    "fda_approved" BOOLEAN NOT NULL DEFAULT true,
    "controlled_substance" TEXT,
    "dosage_form" TEXT NOT NULL,
    "strength" TEXT NOT NULL,
    "manufacturer" TEXT,
    "ndc" TEXT,
    "description" TEXT,
    "side_effects" JSONB,
    "contraindications" JSONB,
    "interactions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drugs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_medications" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "drug_id" UUID NOT NULL,
    "prescribed_by" UUID,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "instructions" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_prn" BOOLEAN NOT NULL DEFAULT false,
    "max_daily_dose" TEXT,
    "refills_remaining" INTEGER,
    "pharmacy_info" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medication_adherence" (
    "id" UUID NOT NULL,
    "patient_medication_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "taken_at" TIMESTAMP(3),
    "dosage_taken" TEXT,
    "was_taken" BOOLEAN NOT NULL DEFAULT false,
    "was_skipped" BOOLEAN NOT NULL DEFAULT false,
    "skip_reason" TEXT,
    "side_effects_reported" JSONB,
    "notes" TEXT,
    "reported_by" TEXT NOT NULL DEFAULT 'patient',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medication_adherence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drugs_name_strength_dosage_form_key" ON "drugs"("name", "strength", "dosage_form");

-- CreateIndex
CREATE INDEX "drugs_drug_class_idx" ON "drugs"("drug_class");

-- CreateIndex
CREATE INDEX "drugs_name_idx" ON "drugs"("name");

-- CreateIndex
CREATE INDEX "patient_medications_patient_id_is_active_idx" ON "patient_medications"("patient_id", "is_active");

-- CreateIndex
CREATE INDEX "patient_medications_drug_id_idx" ON "patient_medications"("drug_id");

-- CreateIndex
CREATE INDEX "patient_medications_start_date_idx" ON "patient_medications"("start_date");

-- CreateIndex
CREATE INDEX "medication_adherence_patient_id_scheduled_date_idx" ON "medication_adherence"("patient_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "medication_adherence_patient_medication_id_scheduled_date_idx" ON "medication_adherence"("patient_medication_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "medication_adherence_was_taken_scheduled_date_idx" ON "medication_adherence"("was_taken", "scheduled_date");

-- AddForeignKey
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_drug_id_fkey" FOREIGN KEY ("drug_id") REFERENCES "drugs"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_medications" ADD CONSTRAINT "patient_medications_prescribed_by_fkey" FOREIGN KEY ("prescribed_by") REFERENCES "clinicians"("id") ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_adherence" ADD CONSTRAINT "medication_adherence_patient_medication_id_fkey" FOREIGN KEY ("patient_medication_id") REFERENCES "patient_medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medication_adherence" ADD CONSTRAINT "medication_adherence_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;