/**
 * Seed Test Data for Billing Readiness Dashboard Testing
 *
 * Creates test patients with varying eligibility states:
 * - Eligible patients (meet all requirements)
 * - Near-eligible patients (within 3 days/minutes)
 * - Not eligible patients (far from requirements)
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedBillingTestData() {
  console.log('🌱 Seeding billing test data...\n');

  try {
    // Get existing organization (try multiple common names)
    let testOrg = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: 'Default Healthcare Organization' },
          { name: 'Test Clinic - Triage Queue' },
          { name: 'Billing Test Clinic' }
        ]
      }
    });

    if (!testOrg) {
      console.log('❌ Error: No organization found. Please ensure Default Healthcare Organization exists.');
      return;
    }

    console.log('✅ Using existing organization:', testOrg.name);

    // Get billing programs
    const rpmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RPM_2025' }
    });

    const rtmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RTM_2025' }
    });

    if (!rpmProgram || !rtmProgram) {
      console.log('❌ Error: Billing programs not found. Please run seed script first.');
      return;
    }

    // Get or create test clinician
    let testClinician = await prisma.clinician.findFirst({
      where: { organizationId: testOrg.id }
    });

    if (!testClinician) {
      // Try to find any clinician in the system
      testClinician = await prisma.clinician.findFirst();

      if (!testClinician) {
        testClinician = await prisma.clinician.create({
          data: {
            organizationId: testOrg.id,
            firstName: 'Dr. Sarah',
            lastName: 'Tester',
            email: `dr.test-${Date.now()}@clinmetrics.com`,
            specialization: 'Internal Medicine'
          }
        });
        console.log('✅ Created test clinician:', testClinician.firstName, testClinician.lastName);
      } else {
        console.log('✅ Using existing clinician from another org:', testClinician.firstName, testClinician.lastName);
      }
    } else {
      console.log('✅ Using existing clinician:', testClinician.firstName, testClinician.lastName);
    }

    // Get a metric for observations (try blood pressure, fallback to any numeric metric)
    let metric = await prisma.metricDefinition.findFirst({
      where: {
        displayName: { contains: 'Blood Pressure', mode: 'insensitive' },
        valueType: 'numeric'
      }
    });

    if (!metric) {
      // Fallback to any numeric metric
      metric = await prisma.metricDefinition.findFirst({
        where: { valueType: 'numeric' }
      });
    }

    if (!metric) {
      console.log('❌ Error: No numeric metrics found. Please run seed script first.');
      return;
    }

    console.log(`✅ Using metric: ${metric.displayName}`);

    // Get a care program for enrollments
    let careProgram = await prisma.careProgram.findFirst({
      where: { organizationId: testOrg.id }
    });

    if (!careProgram) {
      // Create a care program for the test organization
      careProgram = await prisma.careProgram.create({
        data: {
          organizationId: testOrg.id,
          name: 'Test Care Program',
          type: 'GENERAL_WELLNESS',
          description: 'Test care program for billing readiness testing',
          isActive: true
        }
      });
      console.log('✅ Created care program:', careProgram.name);
    } else {
      console.log('✅ Using existing care program:', careProgram.name);
    }

    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    // Test Scenario 1: ELIGIBLE PATIENT (meets all requirements)
    console.log('\n📊 Creating ELIGIBLE test patient...');
    const eligiblePatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Alice',
        lastName: 'Eligible',
        dateOfBirth: new Date('1970-01-15'),
        medicalRecordNumber: `MRN-ELIGIBLE-${Date.now()}`
      }
    });

    const eligibleEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: eligiblePatient.id,
        clinicianId: testClinician.id,
        careProgramId: careProgram.id,
        billingProgramId: rpmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        billingEligibility: {
          eligible: true,
          insurance: { type: 'Medicare Part B' },
          chronicConditions: ['Hypertension (I10)']
        }
      }
    });

    // Create 18 observations (exceeds 16-day requirement)
    for (let i = 0; i < 18; i++) {
      await prisma.observation.create({
        data: {
          organizationId: testOrg.id,
          patientId: eligiblePatient.id,
          enrollmentId: eligibleEnrollment.id,
          metricId: metric.id,
          value: { numeric: 120 + i },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date(startOfMonth.getTime() + (i * 24 * 60 * 60 * 1000))
        }
      });
    }

    // Create time log (25 minutes - exceeds 20-minute requirement)
    await prisma.timeLog.create({
      data: {
        patientId: eligiblePatient.id,
        clinicianId: testClinician.id,
        enrollmentId: eligibleEnrollment.id,
        activity: 'CALL_PATIENT',
        duration: 25,
        cptCode: 'CODE_99457',
        billable: true,
        loggedAt: currentDate
      }
    });

    console.log('✅ Created eligible patient: Alice Eligible (18 days, 25 minutes)');

    // Test Scenario 2: NEAR-ELIGIBLE PATIENT - Close on readings
    console.log('\n📊 Creating NEAR-ELIGIBLE test patient (close on readings)...');
    const nearPatient1 = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Bob',
        lastName: 'NearReadings',
        dateOfBirth: new Date('1975-03-20'),
        medicalRecordNumber: `MRN-NEAR1-${Date.now()}`
      }
    });

    const nearEnrollment1 = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: nearPatient1.id,
        clinicianId: testClinician.id,
        careProgramId: careProgram.id,
        billingProgramId: rpmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        billingEligibility: {
          eligible: true,
          insurance: { type: 'Medicare Part B' },
          chronicConditions: ['Diabetes (E11)']
        }
      }
    });

    // Create 14 observations (need 16 - within 3 days = near-eligible)
    for (let i = 0; i < 14; i++) {
      await prisma.observation.create({
        data: {
          organizationId: testOrg.id,
          patientId: nearPatient1.id,
          enrollmentId: nearEnrollment1.id,
          metricId: metric.id,
          value: { numeric: 125 + i },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date(startOfMonth.getTime() + (i * 24 * 60 * 60 * 1000))
        }
      });
    }

    // Has sufficient time (22 minutes)
    await prisma.timeLog.create({
      data: {
        patientId: nearPatient1.id,
        clinicianId: testClinician.id,
        enrollmentId: nearEnrollment1.id,
        activity: 'CALL_PATIENT',
        duration: 22,
        cptCode: 'CODE_99457',
        billable: true,
        loggedAt: currentDate
      }
    });

    console.log('✅ Created near-eligible patient: Bob NearReadings (14 days, 22 minutes)');

    // Test Scenario 3: NEAR-ELIGIBLE PATIENT - Close on time
    console.log('\n📊 Creating NEAR-ELIGIBLE test patient (close on time)...');
    const nearPatient2 = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Carol',
        lastName: 'NearTime',
        dateOfBirth: new Date('1968-07-10'),
        medicalRecordNumber: `MRN-NEAR2-${Date.now()}`
      }
    });

    const nearEnrollment2 = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: nearPatient2.id,
        clinicianId: testClinician.id,
        careProgramId: careProgram.id,
        billingProgramId: rtmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        billingEligibility: {
          eligible: true,
          insurance: { type: 'Medicare Advantage' },
          chronicConditions: ['COPD (J44)']
        }
      }
    });

    // Create 17 observations (exceeds requirement)
    for (let i = 0; i < 17; i++) {
      await prisma.observation.create({
        data: {
          organizationId: testOrg.id,
          patientId: nearPatient2.id,
          enrollmentId: nearEnrollment2.id,
          metricId: metric.id,
          value: { numeric: 130 + i },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date(startOfMonth.getTime() + (i * 24 * 60 * 60 * 1000))
        }
      });
    }

    // Has 18 minutes (need 20 - within 2 minutes = near-eligible)
    await prisma.timeLog.create({
      data: {
        patientId: nearPatient2.id,
        clinicianId: testClinician.id,
        enrollmentId: nearEnrollment2.id,
        activity: 'CALL_PATIENT',
        duration: 18,
        cptCode: 'CODE_99457', // Using RPM code (RTM codes not in TimeLog enum yet)
        billable: true,
        loggedAt: currentDate
      }
    });

    console.log('✅ Created near-eligible patient: Carol NearTime (17 days, 18 minutes)');

    // Test Scenario 4: NOT ELIGIBLE PATIENT
    console.log('\n📊 Creating NOT ELIGIBLE test patient...');
    const notEligiblePatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'David',
        lastName: 'NotEligible',
        dateOfBirth: new Date('1980-11-05'),
        medicalRecordNumber: `MRN-NOT-${Date.now()}`
      }
    });

    const notEligibleEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: notEligiblePatient.id,
        clinicianId: testClinician.id,
        careProgramId: careProgram.id,
        billingProgramId: rpmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        billingEligibility: {
          eligible: true,
          insurance: { type: 'Medicare Part B' },
          chronicConditions: ['Heart Failure (I50)']
        }
      }
    });

    // Create only 8 observations (far from 16-day requirement)
    for (let i = 0; i < 8; i++) {
      await prisma.observation.create({
        data: {
          organizationId: testOrg.id,
          patientId: notEligiblePatient.id,
          enrollmentId: notEligibleEnrollment.id,
          metricId: metric.id,
          value: { numeric: 115 + i },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date(startOfMonth.getTime() + (i * 24 * 60 * 60 * 1000))
        }
      });
    }

    // Has only 10 minutes (far from 20-minute requirement)
    await prisma.timeLog.create({
      data: {
        patientId: notEligiblePatient.id,
        clinicianId: testClinician.id,
        enrollmentId: notEligibleEnrollment.id,
        activity: 'CALL_PATIENT',
        duration: 10,
        cptCode: 'CODE_99457',
        billable: true,
        loggedAt: currentDate
      }
    });

    console.log('✅ Created not eligible patient: David NotEligible (8 days, 10 minutes)');

    console.log('\n✨ Test data seeding complete!\n');
    console.log('📋 Summary:');
    console.log('  - 1 Eligible patient (Alice Eligible)');
    console.log('  - 2 Near-Eligible patients (Bob NearReadings, Carol NearTime)');
    console.log('  - 1 Not Eligible patient (David NotEligible)');
    console.log('\n🌐 Test in UI:');
    console.log('  1. Login to http://localhost:5173');
    console.log('  2. Navigate to Billing Readiness');
    console.log('  3. Select current month/year');
    console.log('  4. Verify yellow alert banner appears with 2 near-eligible patients');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedBillingTestData()
  .then(() => {
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
