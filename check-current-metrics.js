const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCurrentMetrics() {
  console.log('🔍 Checking Current Metrics...\n');

  try {
    // Get all current metrics
    const allMetrics = await prisma.metricDefinition.findMany({
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Total metrics in database: ${allMetrics.length}`);

    // Check for standardized metrics (those with coding)
    const standardizedMetrics = allMetrics.filter(metric => metric.coding);
    const customMetrics = allMetrics.filter(metric => !metric.coding);

    console.log(`🏷️ Standardized metrics: ${standardizedMetrics.length}`);
    console.log(`🔧 Custom metrics: ${customMetrics.length}`);

    if (standardizedMetrics.length > 0) {
      console.log('\n📋 Standardized Metrics:');
      standardizedMetrics.forEach(metric => {
        const loincCode = metric.coding?.primary?.code || 'No LOINC';
        console.log(`   ✅ ${metric.displayName} (${metric.key}) - LOINC: ${loincCode}`);
      });
    }

    if (customMetrics.length > 0) {
      console.log('\n🔧 Custom Metrics:');
      customMetrics.slice(0, 10).forEach(metric => {
        console.log(`   📝 ${metric.displayName} (${metric.key}) - Type: ${metric.valueType}`);
      });
      if (customMetrics.length > 10) {
        console.log(`   ... and ${customMetrics.length - 10} more custom metrics`);
      }
    }

    // Check for common standardized metric keys
    const expectedStandardMetrics = [
      'pain_scale_0_10',
      'pain_location',
      'pain_interference',
      'blood_glucose',
      'systolic_bp',
      'diastolic_bp',
      'phq9_score',
      'gad7_score',
      'oxygen_saturation',
      'peak_flow'
    ];

    console.log('\n🎯 Checking for Expected Standard Metrics:');
    const missingStandardMetrics = [];
    
    for (const expectedKey of expectedStandardMetrics) {
      const exists = allMetrics.find(m => m.key === expectedKey);
      if (exists) {
        const hasStandardCoding = exists.coding ? '✅' : '⚠️ (no coding)';
        console.log(`   ${hasStandardCoding} ${expectedKey}`);
      } else {
        console.log(`   ❌ ${expectedKey} - MISSING`);
        missingStandardMetrics.push(expectedKey);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   - Total metrics: ${allMetrics.length}`);
    console.log(`   - Standardized: ${standardizedMetrics.length}`);
    console.log(`   - Custom: ${customMetrics.length}`);
    console.log(`   - Missing standard metrics: ${missingStandardMetrics.length}`);

    if (missingStandardMetrics.length > 0) {
      console.log('\n⚠️ Missing Standard Metrics:');
      missingStandardMetrics.forEach(key => console.log(`   - ${key}`));
      console.log('\n💡 Recommendation: Run the standardized metrics seed script to add these.');
    }

    return {
      total: allMetrics.length,
      standardized: standardizedMetrics.length,
      custom: customMetrics.length,
      missing: missingStandardMetrics
    };

  } catch (error) {
    console.error('❌ Error checking metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkCurrentMetrics();
}

module.exports = { checkCurrentMetrics };