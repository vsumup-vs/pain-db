const { PrismaClient } = require('@prisma/client');
const { suggestBillingPackages } = require('../src/services/packageSuggestionService');

const prisma = new PrismaClient();

async function backfillBillingSuggestions() {
  console.log('\n=== Backfilling Billing Suggestions for Existing Patients ===\n');

  // Find patients with diagnosis codes but NO billing suggestions
  const patientsWithDiagnoses = await prisma.patient.findMany({
    where: {
      diagnosisCodes: { not: null }
    },
    include: {
      _count: {
        select: {
          enrollmentSuggestions: true
        }
      }
    }
  });

  console.log(`Found ${patientsWithDiagnoses.length} patients with diagnosis codes\n`);

  const patientsNeedingSuggestions = patientsWithDiagnoses.filter(
    p => p._count.enrollmentSuggestions === 0 && Array.isArray(p.diagnosisCodes) && p.diagnosisCodes.length > 0
  );

  console.log(`${patientsNeedingSuggestions.length} patients need suggestions backfilled\n`);

  for (const patient of patientsNeedingSuggestions) {
    console.log(`Processing: ${patient.firstName} ${patient.lastName} (${patient.email})`);
    console.log(`  Diagnosis Codes: ${JSON.stringify(patient.diagnosisCodes)}`);

    try {
      const suggestions = await suggestBillingPackages(patient.id, patient.organizationId, {
        sourceType: 'PATIENT_RECORD',
        sourceId: patient.id
      });

      console.log(`  ✅ Generated ${suggestions.length} suggestions`);
      suggestions.forEach((s, i) => {
        console.log(`     ${i + 1}. Match Score: ${s.matchScore}, Status: ${s.status}`);
      });
    } catch (error) {
      console.error(`  ❌ Error generating suggestions: ${error.message}`);
    }

    console.log('');
  }

  // Show final count
  console.log('\n=== Final Status ===\n');

  const allSuggestions = await prisma.enrollmentSuggestion.findMany({
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

  console.log(`Total Billing Suggestions in Database: ${allSuggestions.length}\n`);

  allSuggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.patient.firstName} ${suggestion.patient.lastName}`);
    console.log(`   Email: ${suggestion.patient.email}`);
    console.log(`   Status: ${suggestion.status}, Match Score: ${suggestion.matchScore}`);
    console.log(`   Created: ${suggestion.createdAt.toISOString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

backfillBillingSuggestions()
  .catch(console.error)
  .finally(() => process.exit(0));
