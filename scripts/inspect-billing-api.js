/**
 * Billing API Inspection Script
 *
 * Purpose: Diagnose why test patients aren't appearing in the Billing Readiness Dashboard
 * and why 5 "Not Eligible" patients show as blank.
 */

const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspectBillingAPI() {
  try {
    // Get the Default Healthcare Organization
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

    // Query the billing API
    const response = await axios.get(
      `http://localhost:3000/api/billing/organizations/${org.id}/summary?billingMonth=2025-10`
    );

    console.log('=== BILLING API RESPONSE ===\n');
    console.log(`Total Enrollments: ${response.data.totalEnrollments}`);
    console.log(`Eligible: ${response.data.eligiblePatients?.length || 0}`);
    console.log(`Not Eligible: ${response.data.notEligiblePatients?.length || 0}\n`);

    // Check for test patients
    console.log('=== TEST PATIENTS SEARCH ===\n');
    const testNames = ['Alice', 'Bob', 'Carol', 'David'];

    testNames.forEach(name => {
      const inEligible = response.data.eligiblePatients?.find(p =>
        p.patientName?.includes(name)
      );
      const inNotEligible = response.data.notEligiblePatients?.find(p =>
        p.patientName?.includes(name)
      );

      if (inEligible) {
        console.log(`✅ ${name}: FOUND in eligiblePatients`);
        console.log(`   - Name: ${inEligible.patientName}`);
        console.log(`   - Status: ${inEligible.status}`);
      } else if (inNotEligible) {
        console.log(`✅ ${name}: FOUND in notEligiblePatients`);
        console.log(`   - Name: ${inNotEligible.patientName}`);
        console.log(`   - Status: ${inNotEligible.status}`);
      } else {
        console.log(`❌ ${name}: NOT FOUND in API response`);
      }
    });

    // Inspect blank "Not Eligible" patients
    console.log('\n=== NOT ELIGIBLE PATIENTS DETAILS ===\n');
    if (response.data.notEligiblePatients && response.data.notEligiblePatients.length > 0) {
      response.data.notEligiblePatients.forEach((patient, index) => {
        console.log(`Patient ${index + 1}:`);
        console.log(`  - Patient Name: ${patient.patientName || 'MISSING/NULL'}`);
        console.log(`  - Patient ID: ${patient.patientId}`);
        console.log(`  - Enrollment ID: ${patient.enrollmentId}`);
        console.log(`  - Program: ${patient.programName || patient.program || 'N/A'}`);
        console.log(`  - Status: ${patient.status}`);
        console.log(`  - Days with Data: ${patient.daysWithData || 0}`);
        console.log(`  - Clinical Time: ${patient.clinicalTimeMinutes || 0}`);
        console.log('');
      });
    } else {
      console.log('No "Not Eligible" patients in response');
    }

    // Full response for debugging
    console.log('\n=== FULL API RESPONSE (JSON) ===\n');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await prisma.$disconnect();
  }
}

inspectBillingAPI();
