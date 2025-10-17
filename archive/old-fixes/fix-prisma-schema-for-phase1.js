/**
 * Fix Prisma Schema for Phase 1 Migration
 * 
 * This script updates the Prisma schema file to include the new fields
 * that were added by the Phase 1 migration script.
 */

const fs = require('fs');
const path = require('path');

async function fixPrismaSchema() {
  console.log('🔧 Fixing Prisma schema for Phase 1 migration...\n');

  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  
  try {
    let schemaContent = fs.readFileSync(schemaPath, 'utf8');

    // Step 1: Add ObservationContext enum after ProgramType
    console.log('1️⃣ Adding ObservationContext enum...');
    if (!schemaContent.includes('enum ObservationContext')) {
      const observationContextEnum = `
enum ObservationContext {
  WELLNESS
  PROGRAM_ENROLLMENT
  CLINICAL_MONITORING
  ROUTINE_FOLLOWUP
}`;

      // Insert after ProgramType enum
      schemaContent = schemaContent.replace(
        /(enum ProgramType {[^}]+})/,
        `$1${observationContextEnum}`
      );
      console.log('   ✅ ObservationContext enum added');
    } else {
      console.log('   ⚠️  ObservationContext enum already exists');
    }

    // Step 2: Update Observation model
    console.log('\n2️⃣ Updating Observation model...');
    const currentObservationModel = /model Observation {[^}]+}/s;
    
    const newObservationModel = `model Observation {
  id                    String              @id @default(cuid())
  patientId             String
  clinicianId           String
  metricDefinitionId    String
  value                 Json
  source                SourceType          @default(MANUAL)
  context               ObservationContext  @default(WELLNESS)
  enrollmentId          String?
  billingRelevant       Boolean             @default(false)
  providerReviewed      Boolean             @default(false)
  reviewedAt            DateTime?
  reviewedBy            String?
  continuitySou rceId   String?
  isBaseline            Boolean             @default(false)
  validityPeriodHours   Int                 @default(168)
  notes                 String?
  recordedAt            DateTime            @default(now())
  createdAt             DateTime            @default(now())
  
  // Relationships
  patient               Patient             @relation(fields: [patientId], references: [id])
  clinician             Clinician           @relation(fields: [clinicianId], references: [id])
  metricDefinition      MetricDefinition    @relation(fields: [metricDefinitionId], references: [id])
  
  @@map("observations")
}`;

    if (currentObservationModel.test(schemaContent)) {
      schemaContent = schemaContent.replace(currentObservationModel, newObservationModel);
      console.log('   ✅ Observation model updated with new fields');
    } else {
      console.log('   ❌ Could not find Observation model to update');
      return false;
    }

    // Step 3: Write updated schema
    console.log('\n3️⃣ Writing updated schema file...');
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('   ✅ Schema file updated successfully');

    console.log('\n🎉 Prisma schema fix completed!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Run: node create-test-data-for-continuity.js');
    console.log('   3. Run: node test-phase1-implementation.js');

    return true;

  } catch (error) {
    console.error('❌ Error fixing Prisma schema:', error);
    return false;
  }
}

// Export for use in other scripts
module.exports = { fixPrismaSchema };

// Run if called directly
if (require.main === module) {
  fixPrismaSchema()
    .catch(console.error);
}