const { PrismaClient } = require('@prisma/client');
const { suggestBillingPackages } = require('../src/services/packageSuggestionService');

const prisma = new PrismaClient();

async function testProgramFiltering() {
  console.log('\n=== Testing Billing Program Filtering ===\n');

  // Get Auto SuggestionTest patient
  const patient = await prisma.patient.findFirst({
    where: { email: { contains: 'auto-test' } }
  });

  if (!patient) {
    console.error('❌ Auto SuggestionTest patient not found');
    await prisma.$disconnect();
    return;
  }

  console.log(`Patient: ${patient.firstName} ${patient.lastName}`);
  console.log(`Diagnosis Codes: ${JSON.stringify(patient.diagnosisCodes, null, 2)}\n`);

  // Delete existing suggestions for this patient
  const deleted = await prisma.enrollmentSuggestion.deleteMany({
    where: { patientId: patient.id }
  });

  console.log(`Deleted ${deleted.count} existing suggestions\n`);

  // Get organization settings
  const org = await prisma.organization.findUnique({
    where: { id: patient.organizationId },
    select: { id: true, name: true, settings: true }
  });

  console.log(`Organization: ${org.name}`);
  console.log(`Supported Programs: ${org.settings?.supportedBillingPrograms?.join(', ') || 'ALL (no filter)'}\n`);

  // Regenerate suggestions with new filtering logic
  console.log('🔄 Regenerating suggestions with program filtering...\n');

  const suggestions = await suggestBillingPackages(patient.id, patient.organizationId, {
    sourceType: 'PATIENT_RECORD',
    sourceId: patient.id
  });

  console.log(`✅ Generated ${suggestions.length} suggestions:\n`);

  for (const suggestion of suggestions) {
    // Get full template details
    const template = await prisma.billingPackageTemplate.findUnique({
      where: { id: suggestion.packageTemplateId }
    });

    console.log(`Suggestion ID: ${suggestion.id}`);
    console.log(`  Template: ${template.name}`);
    console.log(`  Match Score: ${suggestion.matchScore}`);
    console.log(`  Status: ${suggestion.status}`);

    // Show which programs this template has
    const programs = template.programCombinations?.programs || [];
    console.log(`  Available Programs:`);
    programs.forEach(p => {
      const supported = org.settings?.supportedBillingPrograms?.includes(p.programType) ? '✅' : '❌';
      console.log(`    ${supported} ${p.programType} (Priority ${p.priority}): ${p.rationale}`);
    });

    console.log('');
  }

  // Show which templates were filtered out
  console.log('\n=== All Available Templates ===\n');

  const allTemplates = await prisma.billingPackageTemplate.findMany({
    where: { isActive: true }
  });

  for (const template of allTemplates) {
    const programs = template.programCombinations?.programs || [];
    const programTypes = programs.map(p => p.programType);
    const hasSupported = programTypes.some(type =>
      org.settings?.supportedBillingPrograms?.includes(type)
    );

    const status = hasSupported ? '✅ INCLUDED' : '❌ FILTERED OUT';

    console.log(`${status}: ${template.name}`);
    console.log(`  Programs: ${programTypes.join(', ')}`);
    console.log('');
  }

  await prisma.$disconnect();
}

testProgramFiltering()
  .catch(console.error)
  .finally(() => process.exit(0));
