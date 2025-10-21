const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateObservationsForWilliam() {
  console.log('📊 Generating Observations for William Taylor\n');

  // Get William Taylor's enrollment
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      patient: {
        firstName: 'William',
        lastName: 'Taylor'
      }
    },
    include: {
      patient: true
    }
  });

  if (!enrollment) {
    console.log('❌ William Taylor enrollment not found');
    return;
  }

  // Get Heart Failure template metrics directly (use standardized template with category)
  const template = await prisma.assessmentTemplate.findFirst({
    where: {
      name: 'Heart Failure Symptom Monitoring',
      isStandardized: true,
      category: 'Cardiac' // Ensure we get the correct template with items
    },
    include: {
      items: {
        include: {
          metricDefinition: true
        }
      }
    }
  });

  if (!template || template.items.length === 0) {
    console.log('❌ Heart Failure template or items not found');
    return;
  }

  console.log(`✓ Found template: ${template.name} with ${template.items.length} items`);
  console.log(`✓ Metrics: ${template.items.map(i => i.metricDefinition.displayName).join(', ')}\n`);

  // Generate 18 days of observations
  const observations = [];
  for (let daysAgo = 0; daysAgo < 18; daysAgo++) {
    const recordedDate = new Date();
    recordedDate.setDate(recordedDate.getDate() - daysAgo);
    recordedDate.setHours(9, 0, 0, 0);

    for (const item of template.items) {
      const metric = item.metricDefinition;
      let value;

      switch (metric.key) {
        case 'body_weight':
          value = { numeric: 185 + (daysAgo * 0.4) }; // Weight increasing
          break;
        case 'dyspnea_severity':
          value = { numeric: Math.min(10, 2 + Math.floor(daysAgo / 3)) };
          break;
        case 'edema_severity':
          value = { numeric: Math.min(10, 1 + Math.floor(daysAgo / 4)) };
          break;
        case 'fatigue_level':
          value = { numeric: 4 + Math.floor(Math.random() * 4) };
          break;
        default:
          value = { numeric: 5 };
      }

      observations.push(
        prisma.observation.create({
          data: {
            patientId: enrollment.patientId,
            enrollmentId: enrollment.id,
            organizationId: enrollment.patient.organizationId,
            metricId: metric.id,
            value: value,
            unit: metric.unit,
            source: 'MANUAL',
            context: 'PROGRAM_ENROLLMENT',
            recordedAt: recordedDate,
            notes: `Day ${18 - daysAgo} - Heart failure monitoring`
          }
        })
      );
    }
  }

  const created = await Promise.all(observations);
  console.log(`✅ Created ${created.length} observations over 18 days`);
  console.log(`   ${template.items.length} metrics × 18 days = ${template.items.length * 18} observations\n`);

  await prisma.$disconnect();
}

generateObservationsForWilliam().catch(console.error);
