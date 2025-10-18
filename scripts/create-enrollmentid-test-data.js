/**
 * Create comprehensive test data for enrollmentId linkage testing
 *
 * Creates:
 * - Organization
 * - Clinician
 * - Patient
 * - Care Program
 * - Enrollment with billing program
 * - Sample observations
 * - Sample time logs
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating test data for enrollmentId linkage testing...\n');

  try {
    // Step 1: Get or create organization
    console.log('1️⃣  Setting up organization...');
    let organization = await prisma.organization.findFirst({
      where: { type: 'CLINIC' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'Test Clinic for enrollmentId',
          type: 'CLINIC',
          email: 'test@enrollmentid.com',
          isActive: true
        }
      });
      console.log(`   Created organization: ${organization.name}`);
    } else {
      console.log(`   Using existing organization: ${organization.name}`);
    }

    // Step 2: Get or create clinician
    console.log('\n2️⃣  Setting up clinician...');
    let clinician = await prisma.clinician.findFirst({
      where: { organizationId: organization.id }
    });

    if (!clinician) {
      clinician = await prisma.clinician.create({
        data: {
          organizationId: organization.id,
          firstName: 'Test',
          lastName: 'Clinician',
          email: 'clinician@enrollmentid.com',
          specialization: 'Primary Care',
          credentials: 'MD'
        }
      });
      console.log(`   Created clinician: Dr. ${clinician.lastName}`);
    } else {
      console.log(`   Using existing clinician: Dr. ${clinician.lastName}`);
    }

    // Step 3: Get or create patient
    console.log('\n3️⃣  Setting up test patient...');
    let patient = await prisma.patient.findFirst({
      where: {
        organizationId: organization.id,
        email: 'alice@enrollmenttest.com'
      }
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          organizationId: organization.id,
          firstName: 'Alice',
          lastName: 'EnrollmentTest',
          dateOfBirth: new Date('1975-01-15'),
          gender: 'FEMALE',
          email: 'alice@enrollmenttest.com'
        }
      });
      console.log(`   Created patient: ${patient.firstName} ${patient.lastName}`);
    } else {
      console.log(`   Using existing patient: ${patient.firstName} ${patient.lastName}`);
    }

    // Step 4: Get or create care program
    console.log('\n4️⃣  Setting up care program...');
    let careProgram = await prisma.careProgram.findFirst({
      where: {
        organizationId: organization.id,
        type: 'DIABETES'
      }
    });

    if (!careProgram) {
      careProgram = await prisma.careProgram.create({
        data: {
          organizationId: organization.id,
          name: 'Remote Patient Monitoring - Diabetes',
          type: 'DIABETES',
          description: 'RPM program for diabetic patients',
          isActive: true
        }
      });
      console.log(`   Created care program: ${careProgram.name}`);
    } else {
      console.log(`   Using existing care program: ${careProgram.name}`);
    }

    // Step 5: Get billing program
    console.log('\n5️⃣  Getting billing program...');
    const billingProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RPM_2025' }
    });

    if (!billingProgram) {
      console.log('   ❌ CMS_RPM_2025 billing program not found.');
      console.log('   Run: npm run seed:production');
      return;
    }
    console.log(`   Found billing program: ${billingProgram.name}`);

    // Step 6: Create enrollment with billing program
    console.log('\n6️⃣  Creating enrollment with billing program...');
    const enrollment = await prisma.enrollment.create({
      data: {
        organizationId: organization.id,
        patientId: patient.id,
        clinicianId: clinician.id,
        careProgramId: careProgram.id,
        billingProgramId: billingProgram.id,
        status: 'ACTIVE',
        startDate: new Date(),
        billingEligibility: {
          eligible: true,
          eligibilityDate: new Date().toISOString(),
          insurance: { type: 'Medicare Part B', memberId: 'TEST123456' },
          chronicConditions: ['E11.9'], // Type 2 Diabetes
          consent: true,
          verifiedBy: clinician.id,
          verifiedAt: new Date().toISOString()
        }
      }
    });
    console.log(`   Created enrollment: ${enrollment.id}`);
    console.log(`   Billing Program: ${billingProgram.code}`);

    // Step 7: Get metric definitions
    console.log('\n7️⃣  Getting metric definitions...');
    const glucoseMetric = await prisma.metricDefinition.findFirst({
      where: { displayName: { contains: 'Blood Glucose' } }
    });

    const bpMetric = await prisma.metricDefinition.findFirst({
      where: { displayName: { contains: 'Systolic' } }
    });

    if (!glucoseMetric || !bpMetric) {
      console.log('   ⚠️  Some metrics not found. Observations will be skipped.');
    } else {
      console.log(`   Found metrics: Blood Glucose, Blood Pressure`);
    }

    // Step 8: Create observations (with enrollmentId via helper)
    console.log('\n8️⃣  Creating sample observations...');
    const observations = [];

    if (glucoseMetric) {
      for (let i = 0; i < 5; i++) {
        const obs = await prisma.observation.create({
          data: {
            organizationId: organization.id,
            patientId: patient.id,
            enrollmentId: enrollment.id, // Explicitly link to enrollment
            metricId: glucoseMetric.id,
            value: { numeric: 120 + (i * 5) },
            unit: 'mg/dL',
            source: 'DEVICE',
            context: 'PROGRAM_ENROLLMENT',
            recordedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Past 5 days
          }
        });
        observations.push(obs);
      }
      console.log(`   Created ${observations.length} glucose observations`);
    }

    // Step 9: Create time logs (with enrollmentId)
    console.log('\n9️⃣  Creating sample time logs...');
    const timeLogs = [];

    for (let i = 0; i < 3; i++) {
      const timeLog = await prisma.timeLog.create({
        data: {
          patientId: patient.id,
          clinicianId: clinician.id,
          enrollmentId: enrollment.id, // Explicitly link to enrollment
          activity: 'CALL_PATIENT',
          duration: 10 + (i * 5), // 10, 15, 20 minutes
          cptCode: 'CODE_99457', // RTM: Interactive communication (20+ minutes)
          notes: `Test call ${i + 1}`,
          billable: true,
          loggedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000) // Past 3 days
        }
      });
      timeLogs.push(timeLog);
    }
    console.log(`   Created ${timeLogs.length} time logs`);

    // Step 10: Summary
    console.log('\n✅ Test data created successfully!');
    console.log('─────────────────────────────────────────────────');
    console.log(`Organization: ${organization.name} (${organization.id})`);
    console.log(`Clinician: Dr. ${clinician.lastName} (${clinician.id})`);
    console.log(`Patient: ${patient.firstName} ${patient.lastName} (${patient.id})`);
    console.log(`Enrollment: ${enrollment.id}`);
    console.log(`Billing Program: ${billingProgram.code}`);
    console.log(`Observations: ${observations.length} (all with enrollmentId)`);
    console.log(`Time Logs: ${timeLogs.length} (all with enrollmentId)`);
    console.log('─────────────────────────────────────────────────');
    console.log('\n💡 Next: Run test script to verify enrollmentId linkage');
    console.log('   node scripts/test-enrollmentid-linkage.js');

  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
