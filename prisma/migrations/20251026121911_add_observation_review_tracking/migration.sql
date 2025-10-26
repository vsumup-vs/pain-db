-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ReviewMethod" AS ENUM ('MANUAL', 'ALERT', 'BULK');

-- AlterTable: Add review tracking fields to observations
ALTER TABLE "observations" ADD COLUMN "review_status" "ReviewStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "observations" ADD COLUMN "reviewed_at" TIMESTAMP(3);
ALTER TABLE "observations" ADD COLUMN "reviewed_by" TEXT;
ALTER TABLE "observations" ADD COLUMN "review_method" "ReviewMethod";
ALTER TABLE "observations" ADD COLUMN "review_notes" TEXT;
ALTER TABLE "observations" ADD COLUMN "related_alert_id" TEXT;

-- AlterTable: Add observation link to alerts
ALTER TABLE "alerts" ADD COLUMN "observation_id" TEXT;

-- CreateIndex: Add indexes for observation review fields
CREATE INDEX "observations_review_status_idx" ON "observations"("review_status");
CREATE INDEX "observations_reviewed_by_idx" ON "observations"("reviewed_by");
CREATE INDEX "observations_related_alert_id_idx" ON "observations"("related_alert_id");

-- CreateIndex: Add index for alert observation link
CREATE INDEX "alerts_observation_id_idx" ON "alerts"("observation_id");

-- AddForeignKey: Link observation to alert for review tracking
ALTER TABLE "observations" ADD CONSTRAINT "observations_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "clinicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "observations" ADD CONSTRAINT "observations_related_alert_id_fkey" FOREIGN KEY ("related_alert_id") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Link alert to triggering observation
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
