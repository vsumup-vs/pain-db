/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `clinicians` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."clinicians" ADD COLUMN     "address" JSONB,
ADD COLUMN     "credentials" JSONB,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "emergencyContact" JSONB,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialization" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clinicians_email_key" ON "public"."clinicians"("email");
