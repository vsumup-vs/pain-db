const { PrismaClient } = require('../generated/prisma');

async function globalSetup() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting global E2E test setup...');
    
    // Clean up existing test data in correct order to avoid foreign key constraints
    await prisma.observation.deleteMany({});
    await prisma.encounterNote.deleteMany({});
    await prisma.alert.deleteMany({});
    await prisma.timeLog.deleteMany({});
    await prisma.medicationAdherence.deleteMany({});
    await prisma.patientMedication.deleteMany({});
    await prisma.enrollment.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.clinician.deleteMany({});
    
    // Delete assessment template related records
    await prisma.assessmentTemplateItem.deleteMany({});
    await prisma.conditionPresetTemplate.deleteMany({});
    await prisma.assessmentTemplate.deleteMany({});
    
    // Delete condition preset related records
    await prisma.conditionPresetDiagnosis.deleteMany({});
    await prisma.conditionPresetAlertRule.deleteMany({});
    await prisma.conditionPreset.deleteMany({});
    
    // Delete alert rules
    await prisma.alertRule.deleteMany({});
    
    // Finally delete metric definitions
    await prisma.metricDefinition.deleteMany({});
    
    // Create test metric definitions
    const painMetric = await prisma.metricDefinition.create({
      data: {
        key: 'pain_level',
        displayName: 'Pain Level',
        valueType: 'numeric',
        unit: 'scale',
        scaleMin: 1,
        scaleMax: 10,
        requiredDefault: false
      }
    });
    
    const moodMetric = await prisma.metricDefinition.create({
      data: {
        key: 'mood_score',
        displayName: 'Mood Score',
        valueType: 'numeric',
        unit: 'scale',
        scaleMin: 1,
        scaleMax: 5,
        requiredDefault: false
      }
    });
    
    // Create test clinician
    const testClinician = await prisma.clinician.create({
      data: {
        firstName: 'Test',
        lastName: 'Clinician',
        email: 'test.clinician@example.com',
        specialization: 'Pain Management',
        licenseNumber: 'TEST123456'
      }
    });
    
    // Create test assessment template
    const testTemplate = await prisma.assessmentTemplate.create({
      data: {
        name: 'Test Pain Assessment Template',
        description: 'Test template for pain assessment',
        isStandardized: false,
        category: 'pain_management'
      }
    });
    
    // Add metrics to the template
    await prisma.assessmentTemplateItem.create({
      data: {
        templateId: testTemplate.id,
        metricDefinitionId: painMetric.id,
        required: true,
        displayOrder: 1
      }
    });
    
    await prisma.assessmentTemplateItem.create({
      data: {
        templateId: testTemplate.id,
        metricDefinitionId: moodMetric.id,
        required: false,
        displayOrder: 2
      }
    });
    
    // Create test condition preset
    const testPreset = await prisma.conditionPreset.create({
      data: {
        name: 'Test Pain Management Protocol'
      }
    });
    
    // Link the template to the preset
    await prisma.conditionPresetTemplate.create({
      data: {
        presetId: testPreset.id,
        templateId: testTemplate.id
      }
    });
    
    console.log('Global E2E test setup completed successfully');
    console.log(`Created clinician: ${testClinician.email}`);
    console.log(`Created preset: ${testPreset.name}`);
    console.log(`Created template: ${testTemplate.name}`);
    console.log(`Created metrics: ${painMetric.key}, ${moodMetric.key}`);
    
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = globalSetup;