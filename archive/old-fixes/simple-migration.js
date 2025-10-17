const { PrismaClient } = require('@prisma/client');

async function simpleMigration() {
  console.log('🔧 Simple Value Type Migration\n');
  
  const prisma = new PrismaClient();
  
  try {
    // Check current data first
    console.log('📊 Checking current value types...');
    const sampleMetrics = await prisma.metricDefinition.findMany({
      select: { valueType: true },
      take: 5
    });
    
    console.log('Sample value types:', sampleMetrics.map(m => m.valueType));
    
    // Count all types
    const allMetrics = await prisma.metricDefinition.findMany({
      select: { valueType: true }
    });
    
    const typeCounts = {};
    allMetrics.forEach(metric => {
      typeCounts[metric.valueType] = (typeCounts[metric.valueType] || 0) + 1;
    });
    
    console.log('\nValue type distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} metrics`);
    });
    
    // Migrate uppercase to lowercase
    console.log('\n🔄 Migrating to lowercase...');
    
    const mapping = {
      'NUMERIC': 'numeric',
      'TEXT': 'text', 
      'BOOLEAN': 'boolean',
      'DATE': 'date',
      'TIME': 'time',
      'DATETIME': 'datetime',
      'JSON': 'json'
    };
    
    let total = 0;
    for (const [old, newType] of Object.entries(mapping)) {
      const result = await prisma.metricDefinition.updateMany({
        where: { valueType: old },
        data: { valueType: newType }
      });
      if (result.count > 0) {
        console.log(`✅ ${old} → ${newType}: ${result.count} updated`);
        total += result.count;
      }
    }
    
    console.log(`\n✅ Migration complete! ${total} records updated`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

simpleMigration();