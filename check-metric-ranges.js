const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkMetricRanges() {
  try {
    console.log('🔍 Checking metric range values in database...\n');
    
    // Get metrics that are showing infinity in the UI
    const problematicMetrics = [
      'fiq_pain_level',
      'fiq_depression',
      'fiq_anxiety',
      'fiq_stiffness',
      'fiq_morning_tiredness',
      'fiq_fatigue_level',
      'pain_severity_now',
      'pain_severity_average',
      'pain_interference_mood',
      'systolic_bp',
      'diastolic_bp',
      'hba1c',
      'blood_glucose'
    ];
    
    for (const key of problematicMetrics) {
      const metric = await prisma.metricDefinition.findFirst({
        where: { key },
        select: {
          key: true,
          displayName: true,
          valueType: true,
          scaleMin: true,
          scaleMax: true,
          unit: true,
          coding: true
        }
      });
      
      if (metric) {
        console.log(`📊 ${metric.displayName} (${metric.key})`);
        console.log(`   Type: ${metric.valueType}`);
        console.log(`   Unit: ${metric.unit || 'N/A'}`);
        console.log(`   scaleMin: ${metric.scaleMin} (type: ${typeof metric.scaleMin})`);
        console.log(`   scaleMax: ${metric.scaleMax} (type: ${typeof metric.scaleMax})`);
        console.log(`   isFinite(min): ${Number.isFinite(metric.scaleMin)}`);
        console.log(`   isFinite(max): ${Number.isFinite(metric.scaleMax)}`);
        console.log(`   Standardized: ${!!metric.coding}`);
        console.log('');
      } else {
        console.log(`❌ Metric not found: ${key}\n`);
      }
    }
    
    // Check all numeric metrics with ranges
    console.log('🔍 All numeric metrics with ranges:');
    console.log('─'.repeat(50));
    
    const numericMetrics = await prisma.metricDefinition.findMany({
      where: {
        valueType: 'numeric',
        OR: [
          { scaleMin: { not: null } },
          { scaleMax: { not: null } }
        ]
      },
      select: {
        key: true,
        displayName: true,
        scaleMin: true,
        scaleMax: true,
        unit: true
      },
      orderBy: { key: 'asc' }
    });
    
    numericMetrics.forEach(metric => {
      const minValid = Number.isFinite(metric.scaleMin);
      const maxValid = Number.isFinite(metric.scaleMax);
      const status = minValid && maxValid ? '✅' : '❌';
      
      console.log(`${status} ${metric.key}: ${metric.scaleMin} - ${metric.scaleMax} ${metric.unit || ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking metric ranges:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetricRanges();