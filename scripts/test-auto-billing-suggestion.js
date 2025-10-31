const { PrismaClient } = require('@prisma/client');
const { suggestBillingPackages } = require('../src/services/packageSuggestionService');

const prisma = new PrismaClient();

async function testAutoBillingSuggestion() {
  console.log('\n=== Testing Automatic Billing Suggestion Generation ===\n');

  // Get an organization to work with
  const org = await prisma.organization.findFirst({
    where: { type: { not: 'PLATFORM' } }
  });

  if (!org) {
    console.error('❌ No non-platform organization found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Organization: ${org.name} (${org.id})\n`);

  // Create a patient with diagnosis codes (simulating createPatient controller)
  const patient = await prisma.patient.create({
    data: {
      organizationId: org.id,
      firstName: 'Auto',
      lastName: 'SuggestionTest',
      email: `auto-test-${Date.now()}@example.com`,
      phone: '555-0123',
      dateOfBirth: new Date('1980-05-15'),
      gender: 'MALE',
      address: '456 Test Avenue',
      diagnosisCodes: [
        {
          code: 'E11.9',
          codingSystem: 'ICD-10',
          display: 'Type 2 diabetes mellitus without complications',
          isPrimary: true
        },
        {
          code: 'I10',
          codingSystem: 'ICD-10',
          display: 'Essential (primary) hypertension',
          isPrimary: false
        }
      ]
    }
  });

  console.log(`✅ Created patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);
  console.log(`   Diagnosis Codes: ${JSON.stringify(patient.diagnosisCodes, null, 2)}\n`);

  // Now test the automatic suggestion generation
  console.log('🔄 Generating billing package suggestions...\n');

  try {
    const suggestions = await suggestBillingPackages(patient.id, org.id, {
      sourceType: 'PATIENT_RECORD',
      sourceId: patient.id
    });

    console.log(`✅ Generated ${suggestions.length} billing suggestions:\n`);

    suggestions.forEach((suggestion, index) => {
      console.log(`${index + 1}. Match Score: ${suggestion.matchScore}`);
      console.log(`   Status: ${suggestion.status}`);
      console.log(`   Package Template: ${suggestion.suggestedPackageTemplateName || 'Unknown'}`);
      console.log(`   Created: ${suggestion.createdAt.toISOString()}`);
      console.log('');
    });

    // Verify the suggestion was saved to database
    const savedSuggestions = await prisma.enrollmentSuggestion.findMany({
      where: { patientId: patient.id },
      include: {
        patient: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    console.log(`\n✅ Verified: ${savedSuggestions.length} suggestions saved to database`);

  } catch (error) {
    console.error('❌ Error generating billing suggestions:', error);
    console.error('Stack:', error.stack);
  }

  // Check all suggestions in database
  console.log('\n=== All Billing Suggestions in Database ===\n');

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
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log(`Total Suggestions: ${allSuggestions.length}\n`);

  allSuggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.patient.firstName} ${suggestion.patient.lastName}`);
    console.log(`   Email: ${suggestion.patient.email}`);
    console.log(`   Status: ${suggestion.status}`);
    console.log(`   Match Score: ${suggestion.matchScore}`);
    console.log(`   Created: ${suggestion.createdAt.toISOString()}`);
    console.log('');
  });

  await prisma.$disconnect();
}

testAutoBillingSuggestion()
  .catch(console.error)
  .finally(() => process.exit(0));
