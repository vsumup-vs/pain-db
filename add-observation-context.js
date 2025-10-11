const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schemaContent = fs.readFileSync(schemaPath, 'utf8');

// Add ObservationContext enum after ProgramType
const observationContextEnum = `

enum ObservationContext {
  WELLNESS
  PROGRAM_ENROLLMENT
  CLINICAL_MONITORING
  ROUTINE_FOLLOWUP
}`;

if (!schemaContent.includes('enum ObservationContext')) {
  schemaContent = schemaContent.replace(
    /(enum ProgramType {[^}]+})/,
    `$1${observationContextEnum}`
  );
  
  fs.writeFileSync(schemaPath, schemaContent);
  console.log('✅ ObservationContext enum added successfully');
} else {
  console.log('⚠️ ObservationContext enum already exists');
}
