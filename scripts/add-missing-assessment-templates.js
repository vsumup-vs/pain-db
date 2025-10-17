const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMissingAssessmentTemplates() {
  try {
    console.log('📝 Adding Missing Assessment Templates...\n');

    // Create assessment templates for conditions that don't have them
    const newTemplates = [
      // COPD Assessment Template
      {
        name: 'COPD Symptom Monitoring Log',
        description: 'Daily monitoring of COPD symptoms and respiratory status. Based on GOLD COPD Guidelines.',
        isStandardized: true,
        clinicalUse: 'Daily tracking of COPD symptoms to detect exacerbations early',
        questions: {
          sections: [
            {
              title: 'Respiratory Symptoms',
              questions: [
                { id: 'q1', text: 'Shortness of breath severity (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' },
                { id: 'q2', text: 'Cough severity (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' },
                { id: 'q3', text: 'Oxygen saturation (SpO2)', scale: '85-100%', metricKey: 'oxygen_saturation' }
              ]
            }
          ]
        },
        scoring: null,
        presetName: 'Chronic Obstructive Pulmonary Disease (COPD)'
      },
      // Heart Failure Assessment Template
      {
        name: 'Heart Failure Symptom Monitoring',
        description: 'Daily monitoring of heart failure symptoms and weight. Based on AHA/ACC Heart Failure Guidelines.',
        isStandardized: true,
        clinicalUse: 'Daily tracking to detect early signs of heart failure exacerbation',
        questions: {
          sections: [
            {
              title: 'Daily Symptoms',
              questions: [
                { id: 'q1', text: 'Current weight (lbs)', scale: 'numeric', metricKey: 'weight_lbs' },
                { id: 'q2', text: 'Shortness of breath (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' },
                { id: 'q3', text: 'Swelling in legs/ankles (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' },
                { id: 'q4', text: 'Fatigue level (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' }
              ]
            }
          ]
        },
        scoring: null,
        presetName: 'Congestive Heart Failure Management'
      },
      // CKD Assessment Template
      {
        name: 'CKD Symptom Monitoring Log',
        description: 'Daily monitoring of symptoms and vitals for chronic kidney disease patients. Based on KDIGO CKD Clinical Practice Guidelines.',
        isStandardized: true,
        clinicalUse: 'Track fluid status, blood pressure, and CKD-related symptoms',
        questions: {
          sections: [
            {
              title: 'Daily Monitoring',
              questions: [
                { id: 'q1', text: 'Blood Pressure (Systolic)', scale: 'numeric', metricKey: 'blood_pressure_systolic' },
                { id: 'q2', text: 'Blood Pressure (Diastolic)', scale: 'numeric', metricKey: 'blood_pressure_diastolic' },
                { id: 'q3', text: 'Swelling/Edema (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' },
                { id: 'q4', text: 'Fatigue level (0 = none, 10 = severe)', scale: '0-10', metricKey: 'symptom_severity' }
              ]
            }
          ]
        },
        scoring: null,
        presetName: 'Chronic Kidney Disease Management'
      },
      // Obesity/Weight Management Assessment
      {
        name: 'Weekly Weight and Lifestyle Log',
        description: 'Weekly tracking of weight and lifestyle habits. Based on CDC Obesity Guidelines and AHA/ACC Obesity Management Guidelines.',
        isStandardized: true,
        clinicalUse: 'Support behavior modification and weight loss goals through consistent self-monitoring',
        questions: {
          sections: [
            {
              title: 'Weekly Check-In',
              questions: [
                { id: 'q1', text: 'Current weight (lbs)', scale: 'numeric', metricKey: 'weight_lbs' },
                { id: 'q2', text: 'Days exercised this week', scale: '0-7', metricKey: 'days_exercised' },
                { id: 'q3', text: 'Overall diet quality (0 = poor, 10 = excellent)', scale: '0-10', metricKey: 'diet_quality_scale' },
                { id: 'q4', text: 'Motivation level (0 = none, 10 = very motivated)', scale: '0-10', metricKey: 'motivation_scale' }
              ]
            }
          ]
        },
        scoring: null,
        presetName: 'Obesity and Weight Management'
      }
    ];

    console.log(`Creating ${newTemplates.length} new assessment templates...\n`);

    for (const templateData of newTemplates) {
      const presetName = templateData.presetName;
      delete templateData.presetName;

      try {
        const template = await prisma.assessmentTemplate.create({
          data: templateData
        });
        console.log(`✅ Created: ${template.name}`);
        console.log(`   For preset: ${presetName}\n`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`ℹ️  Already exists: ${templateData.name}\n`);
        } else {
          console.error(`❌ Error creating ${templateData.name}:`, error.message, '\n');
        }
      }
    }

    console.log('\n✅ Assessment templates created!\n');

    // Now link the templates to their respective presets
    console.log('🔗 Linking templates to condition presets...\n');

    const templates = await prisma.assessmentTemplate.findMany({
      where: { organizationId: null, isStandardized: true }
    });

    const presets = await prisma.conditionPreset.findMany({
      where: { organizationId: null, isStandardized: true }
    });

    // Create template and preset maps
    const templateMap = {};
    templates.forEach(t => {
      templateMap[t.name] = t.id;
    });

    const presetMap = {};
    presets.forEach(p => {
      presetMap[p.name] = p.id;
    });

    // Define template-to-preset relationships
    const relationships = [
      {
        template: 'COPD Symptom Monitoring Log',
        preset: 'Chronic Obstructive Pulmonary Disease (COPD)'
      },
      {
        template: 'Heart Failure Symptom Monitoring',
        preset: 'Congestive Heart Failure Management'
      },
      {
        template: 'CKD Symptom Monitoring Log',
        preset: 'Chronic Kidney Disease Management'
      },
      {
        template: 'Weekly Weight and Lifestyle Log',
        preset: 'Obesity and Weight Management'
      }
    ];

    let linksCreated = 0;

    for (const rel of relationships) {
      const templateId = templateMap[rel.template];
      const presetId = presetMap[rel.preset];

      if (!templateId) {
        console.log(`⚠️  Template not found: ${rel.template}`);
        continue;
      }

      if (!presetId) {
        console.log(`⚠️  Preset not found: ${rel.preset}`);
        continue;
      }

      try {
        await prisma.conditionPresetTemplate.create({
          data: {
            conditionPresetId: presetId,
            templateId: templateId
          }
        });
        console.log(`✅ Linked "${rel.template}" → "${rel.preset}"`);
        linksCreated++;
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`ℹ️  Already linked: "${rel.template}" → "${rel.preset}"`);
        } else {
          console.error(`❌ Error linking:`, error.message);
        }
      }
    }

    console.log(`\n✨ Created ${linksCreated} template links\n`);

    // Verify
    console.log('🔍 Verifying preset-template linkage...\n');
    const presetsWithTemplates = await prisma.conditionPreset.findMany({
      where: { organizationId: null },
      include: {
        templates: {
          include: {
            template: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    presetsWithTemplates.forEach(preset => {
      console.log(`  ${preset.name}: ${preset.templates.length} templates`);
      preset.templates.forEach(t => {
        console.log(`    - ${t.template.name}`);
      });
    });

    console.log('\n✅ All assessment templates successfully added and linked!\n');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addMissingAssessmentTemplates();
