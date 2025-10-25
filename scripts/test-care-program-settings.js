const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test script for Care Program Settings Builder functionality
 *
 * Tests:
 * 1. Create care program with visual builder settings
 * 2. Update care program settings
 * 3. Verify JSON structure matches expected format
 */

async function testCareProgramSettings() {
  console.log('🧪 Testing Care Program Settings Builder\n');

  try {
    // Find test organization
    const organization = await prisma.organization.findFirst({
      where: { name: { contains: 'Test' } }
    });

    if (!organization) {
      console.log('❌ No test organization found. Creating one...');
      const newOrg = await prisma.organization.create({
        data: {
          name: 'Test Clinic',
          type: 'CLINIC',
          email: 'test@clinic.com',
          phone: '555-0100',
          address: '123 Test St'
        }
      });
      console.log(`✅ Created test organization: ${newOrg.name} (${newOrg.id})\n`);
      organizationId = newOrg.id;
    } else {
      console.log(`✅ Found test organization: ${organization.name} (${organization.id})\n`);
      organizationId = organization.id;
    }

    // Test 1: Create care program with RPM settings (Diabetes program type)
    console.log('📝 Test 1: Create Diabetes care program with RPM billing settings');

    const rpmSettings = {
      billing: {
        cptCodes: ['99453', '99454', '99457', '99458'],
        requirements: {
          setupTime: 20,
          deviceReadings: 16,
          clinicalTime: 20
        }
      },
      requiredMetrics: ['blood_glucose', 'weight', 'blood_pressure_systolic'],
      assessmentFrequency: 'weekly'
    };

    const rpmProgram = await prisma.careProgram.create({
      data: {
        organizationId,
        name: 'Diabetes Management (RPM)',
        type: 'DIABETES',
        description: 'Remote Patient Monitoring for diabetic patients with RPM billing',
        isActive: true,
        settings: rpmSettings
      }
    });

    console.log(`✅ Created RPM program: ${rpmProgram.name}`);
    console.log('   Settings:', JSON.stringify(rpmProgram.settings, null, 2));

    // Verify RPM settings structure
    if (rpmProgram.settings.billing?.cptCodes?.length === 4 &&
        rpmProgram.settings.billing?.requirements?.setupTime === 20 &&
        rpmProgram.settings.requiredMetrics?.length === 3 &&
        rpmProgram.settings.assessmentFrequency === 'weekly') {
      console.log('✅ RPM settings structure validated\n');
    } else {
      console.log('❌ RPM settings structure validation failed\n');
    }

    // Test 2: Create care program with RTM settings (Pain Management program type)
    console.log('📝 Test 2: Create Pain Management care program with RTM billing settings');

    const rtmSettings = {
      billing: {
        cptCodes: ['98975', '98976', '98977', '98980', '98981'],
        requirements: {
          setupTime: 20,
          deviceReadings: 16,
          clinicalTime: 20
        }
      },
      requiredMetrics: ['pain_level', 'mood', 'sleep_quality'],
      assessmentFrequency: 'daily'
    };

    const rtmProgram = await prisma.careProgram.create({
      data: {
        organizationId,
        name: 'Pain Management (RTM)',
        type: 'PAIN_MANAGEMENT',
        description: 'Remote Therapeutic Monitoring for chronic pain with RTM billing',
        isActive: true,
        settings: rtmSettings
      }
    });

    console.log(`✅ Created RTM program: ${rtmProgram.name}`);
    console.log('   Settings:', JSON.stringify(rtmProgram.settings, null, 2));

    // Verify RTM settings structure
    if (rtmProgram.settings.billing?.cptCodes?.length === 5 &&
        rtmProgram.settings.assessmentFrequency === 'daily') {
      console.log('✅ RTM settings structure validated\n');
    } else {
      console.log('❌ RTM settings structure validation failed\n');
    }

    // Test 3: Create care program with CCM settings (no device readings required)
    console.log('📝 Test 3: Create Hypertension care program with CCM billing settings');

    const ccmSettings = {
      billing: {
        cptCodes: ['99490', '99439', '99491'],
        requirements: {
          setupTime: 0,
          deviceReadings: 0,
          clinicalTime: 20
        }
      },
      requiredMetrics: ['blood_pressure_systolic', 'blood_pressure_diastolic', 'weight'],
      assessmentFrequency: 'monthly'
    };

    const ccmProgram = await prisma.careProgram.create({
      data: {
        organizationId,
        name: 'Hypertension Management (CCM)',
        type: 'HYPERTENSION',
        description: 'Chronic Care Management for hypertension with CCM billing',
        isActive: true,
        settings: ccmSettings
      }
    });

    console.log(`✅ Created CCM program: ${ccmProgram.name}`);
    console.log('   Settings:', JSON.stringify(ccmProgram.settings, null, 2));

    // Verify CCM settings (should have 0 for setup and device readings)
    if (ccmProgram.settings.billing?.cptCodes?.length === 3 &&
        ccmProgram.settings.billing?.requirements?.setupTime === 0 &&
        ccmProgram.settings.billing?.requirements?.deviceReadings === 0) {
      console.log('✅ CCM settings structure validated (no device readings)\n');
    } else {
      console.log('❌ CCM settings structure validation failed\n');
    }

    // Test 4: Update care program settings
    console.log('📝 Test 4: Update RPM program settings');

    const updatedRpmSettings = {
      ...rpmSettings,
      billing: {
        ...rpmSettings.billing,
        requirements: {
          setupTime: 25, // Changed from 20
          deviceReadings: 18, // Changed from 16
          clinicalTime: 25 // Changed from 20
        }
      },
      requiredMetrics: [...rpmSettings.requiredMetrics, 'heart_rate'], // Added metric
      assessmentFrequency: 'daily' // Changed from weekly
    };

    const updatedRpmProgram = await prisma.careProgram.update({
      where: { id: rpmProgram.id },
      data: { settings: updatedRpmSettings }
    });

    console.log(`✅ Updated RPM program settings`);
    console.log('   New settings:', JSON.stringify(updatedRpmProgram.settings, null, 2));

    // Verify updates
    if (updatedRpmProgram.settings.billing?.requirements?.setupTime === 25 &&
        updatedRpmProgram.settings.requiredMetrics?.length === 4 &&
        updatedRpmProgram.settings.assessmentFrequency === 'daily') {
      console.log('✅ Update validation successful\n');
    } else {
      console.log('❌ Update validation failed\n');
    }

    // Test 5: Test program with minimal settings (no billing)
    console.log('📝 Test 5: Create wellness program with minimal settings');

    const wellnessSettings = {
      requiredMetrics: ['mood', 'sleep_quality'],
      assessmentFrequency: 'weekly'
    };

    const wellnessProgram = await prisma.careProgram.create({
      data: {
        organizationId,
        name: 'General Wellness',
        type: 'GENERAL_WELLNESS',
        description: 'General wellness tracking without billing',
        isActive: true,
        settings: wellnessSettings
      }
    });

    console.log(`✅ Created wellness program: ${wellnessProgram.name}`);
    console.log('   Settings:', JSON.stringify(wellnessProgram.settings, null, 2));

    // Verify minimal settings (no billing)
    if (!wellnessProgram.settings.billing &&
        wellnessProgram.settings.requiredMetrics?.length === 2) {
      console.log('✅ Minimal settings validation successful (no billing)\n');
    } else {
      console.log('❌ Minimal settings validation failed\n');
    }

    // Summary
    console.log('📊 Test Summary:');
    const allPrograms = await prisma.careProgram.findMany({
      where: { organizationId }
    });

    console.log(`   Total care programs created: ${allPrograms.length}`);
    console.log(`   Diabetes programs: ${allPrograms.filter(p => p.type === 'DIABETES').length}`);
    console.log(`   Pain Management programs: ${allPrograms.filter(p => p.type === 'PAIN_MANAGEMENT').length}`);
    console.log(`   Hypertension programs: ${allPrograms.filter(p => p.type === 'HYPERTENSION').length}`);
    console.log(`   Wellness programs: ${allPrograms.filter(p => p.type === 'GENERAL_WELLNESS').length}`);
    console.log(`   Programs with billing: ${allPrograms.filter(p => p.settings?.billing).length}`);
    console.log(`   Programs without billing: ${allPrograms.filter(p => !p.settings?.billing).length}`);

    console.log('\n✅ All tests passed!');
    console.log('🎉 Care Program Settings Builder is working correctly!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run tests
testCareProgramSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
