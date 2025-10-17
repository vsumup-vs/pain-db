const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function createMedicationAssessmentTemplates() {
  try {
    console.log('Creating medication assessment templates...');

    // Get the medication metrics we created
    const medicationMetrics = await prisma.metricDefinition.findMany({
      where: {
        key: {
          in: [
            'medication_adherence',
            'medication_effectiveness', 
            'side_effects_severity',
            'pain_before_medication',
            'pain_after_medication',
            'medication_timing'
          ]
        }
      }
    });

    // Create Daily Medication Check template
    const dailyMedTemplate = await prisma.assessmentTemplate.upsert({
      where: {
        name_version: {
          name: 'Daily Medication Assessment',
          version: 1
        }
      },
      update: {},
      create: {
        name: 'Daily Medication Assessment',
        description: 'Daily assessment for medication adherence and effectiveness'
      }
    });

    // Add items to the daily medication template
    const dailyMetrics = medicationMetrics.filter(m => 
      ['medication_adherence', 'medication_effectiveness', 'side_effects_severity'].includes(m.key)
    );

    for (let i = 0; i < dailyMetrics.length; i++) {
      await prisma.assessmentTemplateItem.upsert({
        where: {
          templateId_metricDefinitionId: {
            templateId: dailyMedTemplate.id,
            metricDefinitionId: dailyMetrics[i].id
          }
        },
        update: {},
        create: {
          templateId: dailyMedTemplate.id,
          metricDefinitionId: dailyMetrics[i].id,
          required: true,
          displayOrder: i + 1,
          helpText: getHelpText(dailyMetrics[i].key)
        }
      });
    }

    // Create PRN Medication template
    const prnMedTemplate = await prisma.assessmentTemplate.upsert({
      where: {
        name_version: {
          name: 'PRN Medication Assessment',
          version: 1
        }
      },
      update: {},
      create: {
        name: 'PRN Medication Assessment',
        description: 'Assessment for as-needed medication usage'
      }
    });

    // Add items to PRN template
    const prnMetrics = medicationMetrics.filter(m => 
      ['pain_before_medication', 'pain_after_medication', 'medication_timing', 'side_effects_severity'].includes(m.key)
    );

    for (let i = 0; i < prnMetrics.length; i++) {
      await prisma.assessmentTemplateItem.upsert({
        where: {
          templateId_metricDefinitionId: {
            templateId: prnMedTemplate.id,
            metricDefinitionId: prnMetrics[i].id
          }
        },
        update: {},
        create: {
          templateId: prnMedTemplate.id,
          metricDefinitionId: prnMetrics[i].id,
          required: i < 2, // First two are required
          displayOrder: i + 1,
          helpText: getHelpText(prnMetrics[i].key)
        }
      });
    }

    console.log('Medication assessment templates created successfully!');
  } catch (error) {
    console.error('Error creating medication templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getHelpText(metricKey) {
  const helpTexts = {
    'medication_adherence': 'Did you take your medication as prescribed today?',
    'medication_effectiveness': 'How effective was your medication in managing your symptoms?',
    'side_effects_severity': 'Rate any side effects you experienced from your medication',
    'pain_before_medication': 'Rate your pain level before taking the medication',
    'pain_after_medication': 'Rate your pain level 30-60 minutes after taking the medication',
    'medication_timing': 'When did you take your medication relative to the prescribed time?'
  };
  return helpTexts[metricKey] || '';
}

createMedicationAssessmentTemplates();