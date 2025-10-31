const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPatientDiagnosisCodes() {
  console.log('\n=== Checking Patient Diagnosis Codes ===\n');

  const patients = await prisma.patient.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      diagnosisCodes: true,
      createdAt: true
    }
  });

  console.log(`Total Patients: ${patients.length}\n`);

  patients.forEach((patient, index) => {
    console.log(`${index + 1}. ${patient.firstName} ${patient.lastName}`);
    console.log(`   Email: ${patient.email}`);
    console.log(`   Created: ${patient.createdAt.toISOString()}`);
    console.log(`   Diagnosis Codes: ${patient.diagnosisCodes ? JSON.stringify(patient.diagnosisCodes, null, 2) : 'None'}`);
    console.log('');
  });

  // Check which patients have suggestions
  console.log('\n=== Billing Suggestions Status ===\n');

  const suggestions = await prisma.enrollmentSuggestion.findMany({
    include: {
      patient: {
        select: {
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total Suggestions: ${suggestions.length}\n`);

  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.patient.firstName} ${suggestion.patient.lastName}`);
    console.log(`   Email: ${suggestion.patient.email}`);
    console.log(`   Status: ${suggestion.status}`);
    console.log(`   Match Score: ${suggestion.matchScore}`);
    console.log(`   Created: ${suggestion.createdAt.toISOString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

checkPatientDiagnosisCodes()
  .catch(console.error)
  .finally(() => process.exit(0));
