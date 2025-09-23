/*
  Warnings:

  - You are about to drop the column `emergencyContact` on the `clinicians` table. All the data in the column will be lost.
  - You are about to drop the column `licenseNumber` on the `clinicians` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."clinicians" DROP COLUMN "emergencyContact",
DROP COLUMN "licenseNumber",
ADD COLUMN     "emergency_contact" JSONB,
ADD COLUMN     "license_number" TEXT;
