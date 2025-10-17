/**
 * Fix Missing ObservationContext Enum in Prisma Schema
 * 
 * This script adds the missing ObservationContext enum to the Prisma schema
 * and ensures the Observation model uses it correctly.
 */

const fs = require('fs');
const path = require('path');

async function fixObservationContextEnum() {
  console.log('🔧 Fixing missing ObservationContext enum in Prisma schema...\n');

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
}
`;

      // Insert after ProgramType enum
      schemaContent = schemaContent.replace(
        /(enum ProgramType {[^}]+})/,
        `$1${observationContextEnum}`
      );
      console.log('   ✅ ObservationContext enum added');
    } else {
      console.log('   ⚠️  ObservationContext enum already exists');
    }

    // Step 2: Update Observation model to include missing fields
    console.log('\n2️⃣ Updating Observation model...');
    
    // Check if the Observation model needs updating
    if (schemaContent.includes('model Observation {') && !schemaContent.includes('context               ObservationContext')) {
      // Find and replace the Observation model
      const observationModelRegex = /(model Observation {[^}]+})/s;
      
      const newObservationModel = `model Observation {
  id                    String              @id @default(cuid())
  enrollmentId          String
  patientId             String
  clinicianId           String?
  metricId              String
  value                 String
  unit                  String?
  context               ObservationContext  @default(WELLNESS)
  source                SourceType
  recordedAt            DateTime
  notes                 String?
  createdAt             DateTime            @default(now())
  
  // Relationships
  enrollment            Enrollment          @relation(fields: [enrollmentId], references: [id])
  patient               Patient             @relation(fields: [patientId], references: [id])
  clinician             Clinician?          @relation(fields: [clinicianId], references: [id])
  metric                MetricDefinition    @relation(fields: [metricId], references: [id])
  
  @@map("observations")
}`;

      schemaContent = schemaContent.replace(observationModelRegex, newObservationModel);
      console.log('   ✅ Observation model updated with context field');
    } else {
      console.log('   ⚠️  Observation model already has context field or not found');
    }

    // Step 3: Write the updated schema
    fs.writeFileSync(schemaPath, schemaContent);
    console.log('\n✅ Prisma schema updated successfully!');
    
    console.log('\n📋 Next steps:');
    console.log('1. Run: npx prisma db push');
    console.log('2. Run: npx prisma generate');
    console.log('3. Restart the backend server');

  } catch (error) {
    console.error('❌ Error fixing Prisma schema:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixObservationContextEnum();