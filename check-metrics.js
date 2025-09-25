const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

async function checkMetrics() {
  try {
    console.log('🔍 Checking metric definitions...');
    
    const allMetrics = await prisma.metricDefinition.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`\n📊 Total metric definitions: ${allMetrics.length}`);
    
    console.log('\n📋 All metrics:');
    allMetrics.forEach((metric, index) => {
      console.log(`${index + 1}. ${metric.displayName} (${metric.key}) - ID: ${metric.id}`);
    });
    
    // Check specifically for arthritis and fibromyalgia metrics
    const arthritisMetrics = allMetrics.filter(m => m.key.includes('arthritis'));
    const fibromyalgiaMetrics = allMetrics.filter(m => m.key.includes('fibromyalgia'));
    
    console.log(`\n🦴 Arthritis metrics: ${arthritisMetrics.length}`);
    arthritisMetrics.forEach(m => console.log(`  - ${m.displayName} (${m.key})`));
    
    console.log(`\n💪 Fibromyalgia metrics: ${fibromyalgiaMetrics.length}`);
    fibromyalgiaMetrics.forEach(m => console.log(`  - ${m.displayName} (${m.key})`));
    
  } catch (error) {
    console.error('❌ Error checking metrics:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetrics();