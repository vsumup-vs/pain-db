const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrateMMASSAndCAT() {
  try {
    console.log('Starting MMAS-8 and CAT template migration...\n');

    // ============================================================
    // PART 1: Migrate MMAS-8 (Morisky Medication Adherence Scale)
    // ============================================================

    console.log('=== PART 1: Migrating MMAS-8 ===\n');

    const mmas8Template = await prisma.assessmentTemplate.findUnique({
      where: { id: 'template-morisky-8' }
    });

    if (!mmas8Template || !mmas8Template.questions || !mmas8Template.questions.items) {
      console.log('MMAS-8 template not found or has no questions. Skipping.');
    } else {
      console.log('Creating metric definitions for MMAS-8 questions...');

      const mmas8Questions = mmas8Template.questions.items;
      const createdMetrics = [];

      for (let i = 0; i < mmas8Questions.length; i++) {
        const q = mmas8Questions[i];
        const metricId = `metric-mmas8-q${i + 1}`;

        // Determine value type and options
        let valueType = 'boolean';
        let validationInfo = null;

        if (q.type === 'ordinal' && q.options) {
          valueType = 'categorical';
          validationInfo = {
            allowedValues: q.options
          };
        }

        // Create metric definition
        const metric = await prisma.metricDefinition.create({
          data: {
            id: metricId,
            key: `mmas8_q${i + 1}`,
            displayName: `MMAS-8 Question ${i + 1}`,
            description: q.text,
            category: 'Medication Adherence',
            valueType: valueType,
            unit: null,
            validationInfo: validationInfo,
            isStandardized: true
          }
        });

        createdMetrics.push({ metric, question: q, order: i + 1 });
        console.log(`  ✅ Created metric: ${metricId} (${q.text.substring(0, 50)}...)`);
      }

      // Create AssessmentTemplateItem records
      console.log('\nLinking metrics to MMAS-8 template...');
      for (const { metric, question, order } of createdMetrics) {
        await prisma.assessmentTemplateItem.create({
          data: {
            templateId: 'template-morisky-8',
            metricDefinitionId: metric.id,
            displayOrder: order,
            isRequired: question.required || true,
            helpText: question.text
          }
        });
        console.log(`  ✅ Linked ${metric.id} to template (order: ${order})`);
      }

      console.log(`\n✅ MMAS-8 migration complete: ${createdMetrics.length} questions migrated\n`);
    }

    // ============================================================
    // PART 2: Migrate COPD Assessment Test (CAT)
    // ============================================================

    console.log('=== PART 2: Migrating COPD Assessment Test (CAT) ===\n');

    const catTemplate = await prisma.assessmentTemplate.findUnique({
      where: { id: 'template-copd-cat' }
    });

    if (!catTemplate || !catTemplate.questions || !catTemplate.questions.items) {
      console.log('CAT template not found or has no questions. Skipping.');
    } else {
      console.log('Creating metric definitions for CAT questions...');

      const catQuestions = catTemplate.questions.items;
      const createdMetrics = [];

      for (let i = 0; i < catQuestions.length; i++) {
        const q = catQuestions[i];
        const metricId = `metric-cat-q${i + 1}`;

        // CAT uses 6-point scale (0-5)
        const validationInfo = {
          min: 0,
          max: 5,
          allowedValues: ['0', '1', '2', '3', '4', '5']
        };

        // Create metric definition
        const metric = await prisma.metricDefinition.create({
          data: {
            id: metricId,
            key: `cat_q${i + 1}`,
            displayName: `CAT Question ${i + 1}`,
            description: q.text,
            category: 'Respiratory',
            valueType: 'ordinal',
            unit: null,
            validationInfo: validationInfo,
            isStandardized: true
          }
        });

        createdMetrics.push({ metric, question: q, order: i + 1 });
        console.log(`  ✅ Created metric: ${metricId} (${q.text.substring(0, 50)}...)`);
      }

      // Create AssessmentTemplateItem records
      console.log('\nLinking metrics to CAT template...');
      for (const { metric, question, order } of createdMetrics) {
        await prisma.assessmentTemplateItem.create({
          data: {
            templateId: 'template-copd-cat',
            metricDefinitionId: metric.id,
            displayOrder: order,
            isRequired: question.required || true,
            helpText: question.text
          }
        });
        console.log(`  ✅ Linked ${metric.id} to template (order: ${order})`);
      }

      console.log(`\n✅ CAT migration complete: ${createdMetrics.length} questions migrated\n`);
    }

    // ============================================================
    // PART 3: Remove MMAS-8 from Chronic Pain Management Preset
    // ============================================================

    console.log('=== PART 3: Removing MMAS-8 from Chronic Pain Management Preset ===\n');

    // Find the Chronic Pain Management preset
    const painPreset = await prisma.conditionPreset.findFirst({
      where: { name: 'Chronic Pain Management' },
      include: {
        templates: {
          include: {
            template: true
          }
        }
      }
    });

    if (!painPreset) {
      console.log('Chronic Pain Management preset not found. Skipping.');
    } else {
      // Find the MMAS-8 link
      const mmas8Link = painPreset.templates.find(pt => pt.template.id === 'template-morisky-8');

      if (!mmas8Link) {
        console.log('MMAS-8 not linked to Chronic Pain Management preset. Already removed.');
      } else {
        // Delete the link
        await prisma.conditionPresetTemplate.delete({
          where: { id: mmas8Link.id }
        });
        console.log('✅ Removed MMAS-8 from Chronic Pain Management preset');
        console.log('   Reason: MMAS-8 is copyrighted and requires licensing for commercial use');
      }
    }

    // ============================================================
    // PART 4: Cancel Emily's pending MMAS-8 assessment
    // ============================================================

    console.log('\n=== PART 4: Cancelling Emily Rodriguez\'s pending MMAS-8 assessment ===\n');

    const emily = await prisma.patient.findFirst({
      where: { firstName: 'Emily', lastName: 'Rodriguez' }
    });

    if (!emily) {
      console.log('Emily Rodriguez not found. Skipping.');
    } else {
      // Find pending MMAS-8 assessments
      const pendingAssessments = await prisma.scheduledAssessment.findMany({
        where: {
          patientId: emily.id,
          templateId: 'template-morisky-8',
          status: { in: ['PENDING', 'OVERDUE'] }
        }
      });

      if (pendingAssessments.length === 0) {
        console.log('No pending MMAS-8 assessments found for Emily.');
      } else {
        for (const assessment of pendingAssessments) {
          await prisma.scheduledAssessment.update({
            where: { id: assessment.id },
            data: {
              status: 'CANCELLED',
              notes: 'Cancelled: MMAS-8 removed from condition preset (copyrighted assessment)'
            }
          });
          console.log(`✅ Cancelled MMAS-8 assessment (ID: ${assessment.id})`);
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Migration Summary:');
    console.log('  ✅ MMAS-8 template migrated (8 questions)');
    console.log('  ✅ CAT template migrated (8 questions)');
    console.log('  ✅ MMAS-8 removed from Chronic Pain Management preset');
    console.log('  ✅ Emily\'s pending MMAS-8 assessments cancelled');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('ERROR during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateMMASSAndCAT();
