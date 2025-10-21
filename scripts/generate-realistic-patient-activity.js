const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Generate realistic patient activity for testing
 * - 18 days of observations (exceeds 16-day billing requirement)
 * - Multiple alert triggers
 * - Clinician time logs (25+ minutes for billing)
 * - Assessment completions
 */

async function generateRealisticActivity() {
  console.log('🏥 Generating Realistic Patient Activity for Testing\n');
  console.log('='.repeat(80));

  // Get enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: { status: 'ACTIVE' },
    include: {
      patient: true,
      clinician: true,
      conditionPreset: {
        include: {
          templates: {
            include: {
              template: {
                include: {
                  items: {
                    include: {
                      metricDefinition: true
                    }
                  }
                }
              }
            }
          },
          alertRules: {
            include: {
              rule: true
            }
          }
        }
      }
    }
  });

  if (enrollments.length === 0) {
    console.log('❌ No active enrollments found. Run seed-production.js first.');
    return;
  }

  for (const enrollment of enrollments) {
    console.log(`\n👤 Generating activity for: ${enrollment.patient.firstName} ${enrollment.patient.lastName}`);
    console.log(`   Condition: ${enrollment.conditionPreset.name}`);

    // Get metrics from template
    const template = enrollment.conditionPreset.templates[0]?.template;
    if (!template) {
      console.log('   ⚠️  No template found for this enrollment');
      continue;
    }

    const metrics = template.items.map(item => item.metricDefinition);
    console.log(`   Template: ${template.name}, Items: ${template.items.length}, Metrics: ${metrics.length}`);

    // Generate 18 days of observations (past)
    console.log(`\n   📊 Creating 18 days of observations...`);
    const observationPromises = [];

    for (let daysAgo = 0; daysAgo < 18; daysAgo++) {
      const recordedDate = new Date();
      recordedDate.setDate(recordedDate.getDate() - daysAgo);
      recordedDate.setHours(9, 0, 0, 0); // 9 AM each day

      // Create observation for each metric in template
      for (const metric of metrics) {
        let value;

        // Generate realistic values based on metric type
        switch (metric.key) {
          case 'body_weight':
            // Gradual weight increase over 18 days (simulates fluid retention for heart failure)
            value = { numeric: 185 + (daysAgo * 0.3) }; // Starting at 185, increasing
            break;

          case 'dyspnea_severity':
            // Shortness of breath worsening
            value = { numeric: Math.min(10, 2 + Math.floor(daysAgo / 3)) };
            break;

          case 'edema_severity':
            // Swelling increasing
            value = { numeric: Math.min(10, 1 + Math.floor(daysAgo / 4)) };
            break;

          case 'fatigue_level':
            // Fatigue varies
            value = { numeric: 3 + Math.floor(Math.random() * 4) }; // 3-7 range
            break;

          case 'pain_level':
            // Pain varies, some days high
            if (daysAgo < 3) {
              value = { numeric: 9 }; // Last 3 days very high (triggers alert)
            } else {
              value = { numeric: 2 + Math.floor(Math.random() * 5) }; // 2-7 range
            }
            break;

          case 'sleep_quality':
            value = { numeric: 5 + Math.floor(Math.random() * 3) }; // 5-8 range
            break;

          case 'mood':
            value = { numeric: 4 + Math.floor(Math.random() * 4) }; // 4-8 range
            break;

          case 'activity_level':
            value = { numeric: 3 + Math.floor(Math.random() * 5) }; // 3-8 range
            break;

          case 'systolic_bp':
            // Blood pressure high on some days
            if (daysAgo === 5 || daysAgo === 10) {
              value = { numeric: 185 }; // Triggers critical alert
            } else {
              value = { numeric: 125 + Math.floor(Math.random() * 20) }; // 125-145
            }
            break;

          case 'diastolic_bp':
            if (daysAgo === 5 || daysAgo === 10) {
              value = { numeric: 95 };
            } else {
              value = { numeric: 75 + Math.floor(Math.random() * 15) }; // 75-90
            }
            break;

          case 'oxygen_saturation':
            value = { numeric: 94 + Math.floor(Math.random() * 5) }; // 94-99%
            break;

          default:
            value = { numeric: 5 }; // Default moderate value
        }

        observationPromises.push(
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
              notes: `Day ${18 - daysAgo} observation`
            }
          })
        );
      }
    }

    const observations = await Promise.all(observationPromises);
    console.log(`   ✅ Created ${observations.length} observations over 18 days`);

    // Create assessments for past 18 days
    console.log(`\n   📋 Creating 18 completed assessments...`);
    const assessmentPromises = [];

    for (let daysAgo = 0; daysAgo < 18; daysAgo++) {
      const completedDate = new Date();
      completedDate.setDate(completedDate.getDate() - daysAgo);
      completedDate.setHours(9, 30, 0, 0); // 9:30 AM

      // Build responses based on template questions
      const responses = {};
      template.items.forEach((item, idx) => {
        responses[`q${idx + 1}`] = {
          metricKey: item.metricDefinition.key,
          value: 5 + Math.floor(Math.random() * 3) // Random 5-8
        };
      });

      assessmentPromises.push(
        prisma.assessment.create({
          data: {
            patientId: enrollment.patientId,
            clinicianId: enrollment.clinicianId,
            templateId: template.id,
            responses: responses,
            score: {
              total: Object.keys(responses).length * 6,
              maxScore: Object.keys(responses).length * 10
            },
            completedAt: completedDate,
            notes: `Completed via test data generation (day ${18 - daysAgo})`
          }
        })
      );
    }

    const assessments = await Promise.all(assessmentPromises);
    console.log(`   ✅ Created ${assessments.length} completed assessments`);

    // Create clinician time logs (25+ minutes for billing)
    console.log(`\n   ⏱️  Creating clinician time logs...`);
    const timeLogPromises = [
      // Initial assessment review - 15 minutes
      prisma.timeLog.create({
        data: {
          patientId: enrollment.patientId,
          enrollmentId: enrollment.id,
          clinicianId: enrollment.clinicianId,
          activity: 'REVIEW_ASSESSMENTS',
          duration: 15,
          cptCode: 'CODE_99457', // First 20 minutes
          billable: true,
          loggedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          notes: 'Reviewed multiple assessments and observation trends'
        }
      }),
      // Patient phone call - 12 minutes
      prisma.timeLog.create({
        data: {
          patientId: enrollment.patientId,
          enrollmentId: enrollment.id,
          clinicianId: enrollment.clinicianId,
          activity: 'CALL_PATIENT',
          duration: 12,
          cptCode: 'CODE_99458', // Additional increment
          billable: true,
          loggedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          notes: 'Discussed worsening symptoms and medication adherence'
        }
      }),
      // Care coordination - 8 minutes
      prisma.timeLog.create({
        data: {
          patientId: enrollment.patientId,
          enrollmentId: enrollment.id,
          clinicianId: enrollment.clinicianId,
          activity: 'CARE_COORDINATION',
          duration: 8,
          billable: true,
          loggedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          notes: 'Coordinated with cardiology for follow-up'
        }
      })
    ];

    const timeLogs = await Promise.all(timeLogPromises);
    const totalMinutes = timeLogs.reduce((sum, log) => sum + log.duration, 0);
    console.log(`   ✅ Created ${timeLogs.length} time logs totaling ${totalMinutes} minutes`);

    console.log('\n   ' + '─'.repeat(76));
  }

  console.log('\n📈 SUMMARY\n');
  console.log('Test data generation complete!');
  console.log('\nWhat you can now test:');
  console.log('  1. Billing Readiness: Visit /billing-readiness');
  console.log('     - Should show patients eligible for billing (16+ days, 20+ minutes)');
  console.log('  2. Alert Triggering: Check /triage-queue');
  console.log('     - Should see alerts for high pain, high BP, weight gain');
  console.log('  3. Patient Timeline: Visit patient details pages');
  console.log('     - Should show 18 days of observation history');
  console.log('  4. Assessment History: View completed assessments');
  console.log('     - Should show 18 completed assessments per patient');
  console.log('\nNext Steps:');
  console.log('  - Test alert evaluation engine (may need to manually trigger)');
  console.log('  - Verify billing calculations are accurate');
  console.log('  - Test clinician workflows in UI');

  await prisma.$disconnect();
}

generateRealisticActivity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
