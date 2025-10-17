/**
 * Setup Test Data for Frontend Testing
 * Creates patient, clinician, observations, and alerts for E2E testing
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupTestData() {
  try {
    console.log('🚀 Setting up test data for frontend testing...\n');

    // Get existing organization and user
    const organization = await prisma.organization.findFirst({
      where: { name: 'Test Clinic - Triage Queue' }
    });

    const user = await prisma.user.findFirst({
      where: { email: 'user@vsumup.com' }
    });

    console.log(`✅ Using organization: ${organization.name}`);
    console.log(`✅ Using user: ${user.email}\n`);

    // Create clinician
    console.log('👨‍⚕️ Creating clinician...');
    const clinician = await prisma.clinician.upsert({
      where: { email: 'dr.smith@testclinic.com' },
      update: {},
      create: {
        organizationId: organization.id,
        firstName: 'John',
        lastName: 'Smith',
        email: 'dr.smith@testclinic.com',
        phone: '555-0100',
        specialization: 'Pain Management',
        licenseNumber: 'MD-TEST-001',
        credentials: 'MD',
        department: 'Pain Management'
      }
    });
    console.log(`✅ Clinician created: Dr. ${clinician.firstName} ${clinician.lastName}\n`);

    // Create patients
    console.log('👥 Creating patients...');
    const patients = [];
    for (let i = 1; i <= 5; i++) {
      const patient = await prisma.patient.upsert({
        where: { medicalRecordNumber: `MRN-TEST-00${i}` },
        update: {},
        create: {
          organizationId: organization.id,
          firstName: ['Alice', 'Bob', 'Carol', 'David', 'Eve'][i - 1],
          lastName: ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller'][i - 1],
          dateOfBirth: new Date(1960 + i * 5, i, 15),
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          email: `patient${i}@test.com`,
          phone: `555-010${i}`,
          medicalRecordNumber: `MRN-TEST-00${i}`,
          address: `${100 + i} Test St, Test City, TC 12345`
        }
      });
      patients.push(patient);
    }
    console.log(`✅ Created ${patients.length} patients\n`);

    // Get metric definitions
    const painMetric = await prisma.metricDefinition.findFirst({
      where: { key: 'pain-level-nrs' }
    });

    const bpSystolicMetric = await prisma.metricDefinition.findFirst({
      where: { key: 'bp-systolic' }
    });

    console.log(`✅ Found metrics: ${painMetric?.name || 'Pain'}, ${bpSystolicMetric?.name || 'BP'}\n`);

    // Create care program
    console.log('🏥 Creating care program...');
    const careProgram = await prisma.careProgram.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: 'Test Pain Management Program'
        }
      },
      update: {},
      create: {
        organizationId: organization.id,
        name: 'Test Pain Management Program',
        type: 'PAIN_MANAGEMENT',
        description: 'Test program for E2E testing',
        isActive: true
      }
    });
    console.log(`✅ Care program created: ${careProgram.name}\n`);

    // Enroll patients
    console.log('📋 Enrolling patients...');
    const enrollments = [];
    for (const patient of patients) {
      try {
        const enrollment = await prisma.enrollment.create({
          data: {
            patientId: patient.id,
            careProgramId: careProgram.id,
            clinicianId: clinician.id,
            organizationId: organization.id,
            status: 'ACTIVE',
            startDate: new Date()
          }
        });
        enrollments.push(enrollment);
      } catch (error) {
        // Skip if already enrolled
        if (!error.message.includes('Unique constraint')) {
          throw error;
        }
      }
    }
    console.log(`✅ Enrolled ${enrollments.length} patients\n`);

    // Create observations and alerts
    console.log('📊 Creating observations and alerts...');
    const alertRule = await prisma.alertRule.findFirst({
      where: { isActive: true, severity: 'HIGH' }
    });

    let alertCount = 0;
    let obsCount = 0;

    for (const patient of patients) {
      // Create normal observations
      for (let day = 0; day < 3; day++) {
        if (painMetric) {
          await prisma.observation.create({
            data: {
              patientId: patient.id,
              metricDefinitionId: painMetric.id,
              value: { numeric: 2 + Math.floor(Math.random() * 3) },
              source: 'MANUAL',
              context: 'CLINICAL_MONITORING',
              recordedAt: new Date(Date.now() - day * 24 * 60 * 60 * 1000)
            }
          });
          obsCount++;
        }
      }

      // Create high pain observation for first 3 patients (triggers alerts)
      if (painMetric && patients.indexOf(patient) < 3) {
        const highObs = await prisma.observation.create({
          data: {
            patientId: patient.id,
            metricDefinitionId: painMetric.id,
            value: { numeric: 8 + Math.floor(Math.random() * 2) },
            source: 'MANUAL',
            context: 'CLINICAL_MONITORING',
            recordedAt: new Date()
          }
        });
        obsCount++;

        // Create alert
        if (alertRule) {
          const alert = await prisma.alert.create({
            data: {
              patientId: patient.id,
              ruleId: alertRule.id,
              organizationId: organization.id,
              severity: ['CRITICAL', 'HIGH', 'MEDIUM'][patients.indexOf(patient)],
              status: 'PENDING',
              message: `Pain level ${highObs.value.numeric}/10 exceeds threshold`,
              triggeredAt: new Date(),
              metadata: {
                observationId: highObs.id,
                value: highObs.value.numeric
              }
            }
          });
          alertCount++;

          // Create task for alert
          await prisma.task.create({
            data: {
              patientId: patient.id,
              organizationId: organization.id,
              title: 'Follow up on elevated pain',
              description: `Patient ${patient.firstName} ${patient.lastName} reported pain ${highObs.value.numeric}/10`,
              taskType: 'FOLLOW_UP_CALL',
              priority: alert.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              status: 'PENDING',
              dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
              assignedToId: clinician.id,
              createdById: clinician.id,
              linkedAlertId: alert.id
            }
          });
        }
      }
    }

    console.log(`✅ Created ${obsCount} observations`);
    console.log(`✅ Created ${alertCount} alerts\n`);

    // Summary
    console.log('═══════════════════════════════════════════════════');
    console.log('🎉 TEST DATA SETUP COMPLETED SUCCESSFULLY!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n📊 Summary:`);
    console.log(`   👨‍⚕️ Clinicians: 1`);
    console.log(`   👥 Patients: ${patients.length}`);
    console.log(`   📋 Enrollments: ${patients.length}`);
    console.log(`   📊 Observations: ${obsCount}`);
    console.log(`   🚨 Alerts: ${alertCount} (PENDING)`);
    console.log(`\n🌐 Frontend Testing:`);
    console.log(`   Login: http://localhost:5173`);
    console.log(`   User: user@vsumup.com`);
    console.log(`   Password: (your test password)`);
    console.log(`\n✨ You can now test:`);
    console.log(`   • View patients in Patients page`);
    console.log(`   • View alerts in Alerts page`);
    console.log(`   • Claim and acknowledge alerts`);
    console.log(`   • Resolve alerts with documentation`);
    console.log(`   • View tasks in Tasks page`);
    console.log(`   • Complete tasks`);
    console.log(`   • View analytics (when endpoints are connected)`);
    console.log(`═══════════════════════════════════════════════════\n`);

  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupTestData };
