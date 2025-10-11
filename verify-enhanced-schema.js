const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyEnhancedSchema() {
  console.log('🔍 Verifying Enhanced Schema Implementation');
  console.log('==========================================');

  let allChecks = [];

  try {
    // Test 1: Unique Constraints
    console.log('\n1. 🔒 Testing Unique Constraints');
    console.log('-'.repeat(35));

    // Test User email uniqueness
    try {
      const testUser = await prisma.user.upsert({
        where: { email: 'test-unique@example.com' },
        update: { firstName: 'Test' },
        create: {
          email: 'test-unique@example.com',
          firstName: 'Test',
          lastName: 'User'
        }
      });
      console.log('✅ User email uniqueness: Working');
      allChecks.push({ name: 'User Email Unique', status: true });
    } catch (error) {
      console.log('❌ User email uniqueness: Failed');
      allChecks.push({ name: 'User Email Unique', status: false });
    }

    // Test Organization name uniqueness
    try {
      const testOrg = await prisma.organization.upsert({
        where: { name: 'Test Unique Organization' },
        update: { type: 'CLINIC' },
        create: {
          name: 'Test Unique Organization',
          type: 'CLINIC'
        }
      });
      console.log('✅ Organization name uniqueness: Working');
      allChecks.push({ name: 'Organization Name Unique', status: true });
    } catch (error) {
      console.log('❌ Organization name uniqueness: Failed');
      console.log(`   Error: ${error.message}`);
      allChecks.push({ name: 'Organization Name Unique', status: false });
    }

    // Test 2: Data Integrity
    console.log('\n2. 📊 Testing Data Integrity');
    console.log('-'.repeat(35));

    const counts = await Promise.all([
      prisma.metricDefinition.count(),
      prisma.conditionPreset.count(),
      prisma.assessmentTemplate.count(),
      prisma.alertRule.count(),
      prisma.organization.count(),
      prisma.user.count()
    ]);

    const [metrics, presets, templates, alerts, orgs, users] = counts;
    
    console.log(`📈 Metric Definitions: ${metrics}`);
    console.log(`🏥 Condition Presets: ${presets}`);
    console.log(`📋 Assessment Templates: ${templates}`);
    console.log(`🚨 Alert Rules: ${alerts}`);
    console.log(`🏢 Organizations: ${orgs}`);
    console.log(`👥 Users: ${users}`);

    allChecks.push({ name: 'Data Seeded', status: metrics > 0 && presets > 0 && templates > 0 });

    // Test 3: Relationships
    console.log('\n3. 🔗 Testing Relationships');
    console.log('-'.repeat(35));

    // Test template-metric relationships
    const templateWithItems = await prisma.assessmentTemplate.findFirst({
      include: {
        items: {
          include: {
            metricDefinition: true
          }
        }
      }
    });

    if (templateWithItems && templateWithItems.items.length > 0) {
      console.log('✅ Template-Metric relationships: Working');
      allChecks.push({ name: 'Template Relationships', status: true });
    } else {
      console.log('❌ Template-Metric relationships: Missing');
      allChecks.push({ name: 'Template Relationships', status: false });
    }

    // Test preset-template relationships (FIXED: using correct relationship name)
    const presetWithTemplates = await prisma.conditionPreset.findFirst({
      include: {
        templates: {
          include: {
            template: true
          }
        }
      }
    });

    if (presetWithTemplates && presetWithTemplates.templates.length > 0) {
      console.log('✅ Preset-Template relationships: Working');
      allChecks.push({ name: 'Preset Relationships', status: true });
    } else {
      console.log('❌ Preset-Template relationships: Missing');
      allChecks.push({ name: 'Preset Relationships', status: false });
    }

    // Test 4: Clinical Standards
    console.log('\n4. 🏥 Testing Clinical Standards');
    console.log('-'.repeat(35));

    // Check for standardized metrics
    const standardizedMetrics = await prisma.metricDefinition.count({
      where: { isStandardized: true }
    });

    console.log(`📊 Standardized Metrics: ${standardizedMetrics}`);
    allChecks.push({ name: 'Standardized Metrics', status: standardizedMetrics > 0 });

    // Check for standardized presets
    const standardizedPresets = await prisma.conditionPreset.count({
      where: { isStandardized: true }
    });

    console.log(`🏥 Standardized Presets: ${standardizedPresets}`);
    allChecks.push({ name: 'Standardized Presets', status: standardizedPresets > 0 });

    // Test 5: Performance Check
    console.log('\n5. ⚡ Testing Performance (Basic)');
    console.log('-'.repeat(35));

    const startTime = Date.now();
    
    // Test indexed query performance
    await prisma.metricDefinition.findMany({
      where: { 
        isStandardized: true,
        category: 'pain'
      },
      take: 10
    });

    const queryTime = Date.now() - startTime;
    console.log(`🔍 Indexed query time: ${queryTime}ms`);
    allChecks.push({ name: 'Query Performance', status: queryTime < 1000 });

    // Test 6: Cleanup Test Data
    console.log('\n6. 🧹 Cleaning Up Test Data');
    console.log('-'.repeat(35));

    try {
      await prisma.user.deleteMany({
        where: { email: 'test-unique@example.com' }
      });
      
      await prisma.organization.deleteMany({
        where: { name: 'Test Unique Organization' }
      });
      
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.log('⚠️  Warning: Could not clean up all test data');
    }

    // Summary
    console.log('\n📋 VERIFICATION SUMMARY');
    console.log('='.repeat(40));
    
    const passed = allChecks.filter(check => check.status).length;
    const total = allChecks.length;
    
    allChecks.forEach(check => {
      const status = check.status ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
    });
    
    console.log(`\n🎯 Overall: ${passed}/${total} checks passed`);
    
    if (passed === total) {
      console.log('🎉 Enhanced schema verification SUCCESSFUL!');
      return true;
    } else {
      console.log('⚠️  Enhanced schema verification INCOMPLETE');
      return false;
    }

  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyEnhancedSchema()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { verifyEnhancedSchema };