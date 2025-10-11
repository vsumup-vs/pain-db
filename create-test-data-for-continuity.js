/**
 * Create Test Data for Smart Assessment Continuity System
 * 
 * This script creates minimal test data to verify the Phase 1 implementation
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestData() {
  console.log('🏗️ Creating test data for Smart Assessment Continuity System...\n');

  try {
    // Step 1: Create test organization (using findFirst + create since name is not unique)
    console.log('1️⃣ Creating test organization...');
    let testOrg = await prisma.organization.findFirst({
      where: { name: 'Test Continuity Clinic' }
    });
    
    if (!testOrg) {
      testOrg = await prisma.organization.create({
        data: {
          name: 'Test Continuity Clinic',
          type: 'CLINIC',
          address: '123 Test Street',
          phone: '555-0123',
          email: 'test@continuity.clinic'
        }
      });
      console.log(`   ✅ Organization created: ${testOrg.name}`);
    } else {
      console.log(`   ✅ Organization already exists: ${testOrg.name}`);
    }

    // Step 2: Create test clinician (email is unique, so upsert works)
    console.log('\n2️⃣ Creating test clinician...');
    const testClinician = await prisma.clinician.upsert({
      where: { email: 'dr.continuity@test.com' },
      update: {},
      create: {
        firstName: 'Dr. Sarah',
        lastName: 'Continuity',
        email: 'dr.continuity@test.com',
        phone: '555-0124',
        specialization: 'Pain Management',
        licenseNumber: 'TEST-12345',
        organizationId: testOrg.id
      }
    });
    console.log(`   ✅ Clinician created: ${testClinician.firstName} ${testClinician.lastName}`);

    // Step 3: Create test patients (using medicalRecordNumber as unique field)
    console.log('\n3️⃣ Creating test patients...');
    const testPatients = [];
    
    for (let i = 1; i <= 3; i++) {
      const patient = await prisma.patient.upsert({
        where: { medicalRecordNumber: `TEST-MRN-${i}` },
        update: {},
        create: {
          firstName: `Patient`,
          lastName: `Test${i}`,
          email: `patient${i}@continuity.test`,
          phone: `555-012${i}`,
          dateOfBirth: new Date('1980-01-01'),
          gender: i % 2 === 0 ? 'FEMALE' : 'MALE',
          address: `${i}23 Patient Street`,
          medicalRecordNumber: `TEST-MRN-${i}`,
          organizationId: testOrg.id
        }
      });
      testPatients.push(patient);
      console.log(`   ✅ Patient created: ${patient.firstName} ${patient.lastName}`);
    }

    // Step 4: Create test metric definitions (id is unique, so upsert works)
    console.log('\n4️⃣ Creating test metric definitions...');
    const metricDefinitions = [
      {
        id: 'pain-scale-metric',
        name: 'Pain Scale (0-10)',
        description: 'Numeric pain rating scale',
        valueType: 'NUMERIC',
        unit: 'scale'
      },
      {
        id: 'mobility-metric',
        name: 'Mobility Assessment',
        description: 'Patient mobility evaluation',
        valueType: 'TEXT'
      },
      {
        id: 'medication-compliance',
        name: 'Medication Compliance',
        description: 'Patient medication adherence',
        valueType: 'BOOLEAN'
      }
    ];

    const createdMetrics = [];
    for (const metric of metricDefinitions) {
      const created = await prisma.metricDefinition.upsert({
        where: { id: metric.id },
        update: {},
        create: metric
      });
      createdMetrics.push(created);
      console.log(`   ✅ Metric created: ${created.name}`);
    }

    // Step 5: Create test assessment template (id is unique, so upsert works)
    console.log('\n5️⃣ Creating test assessment template...');
    const testTemplate = await prisma.assessmentTemplate.upsert({
      where: { id: 'continuity-test-template' },
      update: {},
      create: {
        id: 'continuity-test-template',
        name: 'Continuity Test Assessment',
        description: 'Test template for continuity system',
        questions: {
          items: createdMetrics.map((metric, index) => ({
            id: `question-${index + 1}`,
            metricDefinitionId: metric.id,
            question: `Please provide ${metric.name}`,
            required: true,
            displayOrder: index + 1
          }))
        }
      }
    });
    console.log(`   ✅ Assessment template created: ${testTemplate.name}`);

    // Step 6: Create test enrollments (id is unique, so upsert works)
    console.log('\n6️⃣ Creating test enrollments...');
    const testEnrollments = [];
    
    for (let i = 0; i < testPatients.length; i++) {
      const enrollment = await prisma.enrollment.upsert({
        where: { id: `test-enrollment-${i + 1}` },
        update: {},
        create: {
          id: `test-enrollment-${i + 1}`,
          patientId: testPatients[i].id,
          clinicianId: testClinician.id,
          organizationId: testOrg.id,
          status: 'ACTIVE'
        }
      });
      testEnrollments.push(enrollment);
      console.log(`   ✅ Enrollment created for: ${testPatients[i].firstName} ${testPatients[i].lastName}`);
    }

    // Step 7: Create some test observations with different contexts
    console.log('\n7️⃣ Creating test observations with context...');
    const contexts = ['WELLNESS', 'CLINICAL_MONITORING', 'PROGRAM_ENROLLMENT', 'ROUTINE_FOLLOWUP'];
    
    for (let i = 0; i < testPatients.length; i++) {
      const patient = testPatients[i];
      
      // Create observations for each metric
      for (let j = 0; j < createdMetrics.length; j++) {
        const metric = createdMetrics[j];
        const context = contexts[j % contexts.length];
        
        let value;
        switch (metric.valueType) {
          case 'NUMERIC':
            value = Math.floor(Math.random() * 10) + 1;
            break;
          case 'BOOLEAN':
            value = Math.random() > 0.5;
            break;
          default:
            value = `Test value for ${metric.name}`;
        }

        const observation = await prisma.observation.create({
          data: {
            patientId: patient.id,
            clinicianId: testClinician.id,
            metricDefinitionId: metric.id,
            value: value,
            recordedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random time in last 7 days
            context: context,
            billingRelevant: Math.random() > 0.5,
            providerReviewed: Math.random() > 0.7,
            isBaseline: context === 'WELLNESS',
            validityPeriodHours: 24,
            notes: `Test observation for ${metric.name} in ${context} context`
          }
        });
        
        console.log(`   ✅ Observation created: ${metric.name} (${context}) for ${patient.firstName}`);
      }
    }

    console.log('\n🎉 Test data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Organization: 1`);
    console.log(`   • Clinician: 1`);
    console.log(`   • Patients: ${testPatients.length}`);
    console.log(`   • Metric Definitions: ${createdMetrics.length}`);
    console.log(`   • Assessment Template: 1`);
    console.log(`   • Enrollments: ${testEnrollments.length}`);
    console.log(`   • Observations: ${testPatients.length * createdMetrics.length}`);
    
    console.log('\n🧪 Now you can run the Phase 1 test again:');
    console.log('   node test-phase1-implementation.js');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = { createTestData };

// Run if called directly
if (require.main === module) {
  createTestData()
    .catch(console.error);
}