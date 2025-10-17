/**
 * Direct Database Billing Data Inspection
 *
 * Purpose: Query the database directly to simulate what the billing API should return
 * and diagnose why test patients aren't appearing in the UI.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectBillingData() {
  try {
    // Get the organization
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: 'Default Healthcare Organization' },
          { name: 'Test Clinic - Triage Queue' }
        ]
      }
    });

    if (!org) {
      console.log('❌ Organization not found');
      return;
    }

    console.log(`✅ Found organization: ${org.name} (ID: ${org.id})\n`);

    // Get all enrollments for this organization
    const enrollments = await prisma.enrollment.findMany({
      where: {
        organizationId: org.id,
        status: 'ACTIVE'
      },
      include: {
        patient: true,
        billingProgram: true,
        careProgram: true,
        clinician: true
      }
    });

    console.log(`=== TOTAL ACTIVE ENROLLMENTS: ${enrollments.length} ===\n`);

    // Get billing month date range
    const billingMonth = '2025-10';
    const [year, month] = billingMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

    console.log(`Billing Period: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);

    // Check each enrollment for test patients
    const testNames = ['Alice', 'Bob', 'Carol', 'David'];
    const eligiblePatients = [];
    const notEligiblePatients = [];

    for (const enrollment of enrollments) {
      const patientName = `${enrollment.patient?.firstName || ''} ${enrollment.patient?.lastName || ''}`.trim();
      const isTestPatient = testNames.some(name =>
        enrollment.patient?.firstName?.includes(name) || enrollment.patient?.lastName?.includes(name)
      );

      // Count days with observations using Prisma (avoiding raw SQL)
      const observations = await prisma.observation.findMany({
        where: {
          enrollmentId: enrollment.id,
          recordedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          recordedAt: true
        }
      });

      // Count unique dates
      const uniqueDates = new Set(
        observations.map(obs => obs.recordedAt.toISOString().split('T')[0])
      );
      const days = uniqueDates.size;

      // Sum clinical time
      const timeTotal = await prisma.timeLog.aggregate({
        where: {
          enrollmentId: enrollment.id,
          billable: true,
          loggedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          duration: true
        }
      });

      const clinicalMinutes = timeTotal._sum.duration || 0;

      // Determine eligibility based on program requirements
      const daysRequired = enrollment.billingProgram?.daysRequired || 16;
      const minutesRequired = enrollment.billingProgram?.minutesRequired || 20;

      const meetsDataRequirement = days >= daysRequired;
      const meetsTimeRequirement = clinicalMinutes >= minutesRequired;
      const isEligible = meetsDataRequirement && meetsTimeRequirement;

      const patientData = {
        patientId: enrollment.patient?.id,
        patientName: patientName || 'MISSING NAME',
        enrollmentId: enrollment.id,
        programCode: enrollment.billingProgram?.code,
        programName: enrollment.billingProgram?.name,
        daysWithData: days,
        daysRequired,
        clinicalTimeMinutes: clinicalMinutes,
        minutesRequired,
        meetsDataRequirement,
        meetsTimeRequirement,
        isEligible,
        isTestPatient
      };

      if (isEligible) {
        eligiblePatients.push(patientData);
      } else {
        notEligiblePatients.push(patientData);
      }

      // Log test patients immediately
      if (isTestPatient) {
        console.log(`🔍 TEST PATIENT FOUND:`);
        console.log(`   Name: ${patientName}`);
        console.log(`   Program: ${enrollment.billingProgram?.name}`);
        console.log(`   Days: ${days}/${daysRequired}`);
        console.log(`   Minutes: ${clinicalMinutes}/${minutesRequired}`);
        console.log(`   Status: ${isEligible ? 'ELIGIBLE ✅' : 'NOT ELIGIBLE ❌'}`);
        console.log('');
      }
    }

    // Summary
    console.log(`\n=== ELIGIBILITY SUMMARY ===`);
    console.log(`Eligible: ${eligiblePatients.length}`);
    console.log(`Not Eligible: ${notEligiblePatients.length}\n`);

    // Test patients search results
    console.log(`=== TEST PATIENTS SEARCH RESULTS ===`);
    testNames.forEach(name => {
      const found = eligiblePatients.find(p => p.patientName.includes(name)) ||
                   notEligiblePatients.find(p => p.patientName.includes(name));
      if (found) {
        console.log(`✅ ${name}: FOUND - ${found.isEligible ? 'Eligible' : 'Not Eligible'}`);
      } else {
        console.log(`❌ ${name}: NOT FOUND in enrollments`);
      }
    });

    // Inspect blank "Not Eligible" patients
    console.log(`\n=== NOT ELIGIBLE PATIENTS DETAILS ===\n`);
    notEligiblePatients.forEach((patient, index) => {
      console.log(`Patient ${index + 1}:`);
      console.log(`  - Name: ${patient.patientName}`);
      console.log(`  - Patient ID: ${patient.patientId || 'MISSING'}`);
      console.log(`  - Enrollment ID: ${patient.enrollmentId}`);
      console.log(`  - Program: ${patient.programName}`);
      console.log(`  - Days: ${patient.daysWithData}/${patient.daysRequired}`);
      console.log(`  - Minutes: ${patient.clinicalTimeMinutes}/${patient.minutesRequired}`);
      console.log(`  - Meets Data: ${patient.meetsDataRequirement ? 'YES' : 'NO'}`);
      console.log(`  - Meets Time: ${patient.meetsTimeRequirement ? 'YES' : 'NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

inspectBillingData();
