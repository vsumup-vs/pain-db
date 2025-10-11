const { PrismaClient } = require('@prisma/client');

async function migrateDataOnly() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Migrating value types to lowercase...');
    
    const valueTypeMapping = {
      'NUMERIC': 'numeric',
      'TEXT': 'text',
      'BOOLEAN': 'boolean',
      'DATE': 'date',
      'TIME': 'time',
      'DATETIME': 'datetime',
      'JSON': 'json'
    };
    
    let totalUpdated = 0;
    
    for (const [oldType, newType] of Object.entries(valueTypeMapping)) {
      const result = await prisma.metricDefinition.updateMany({
        where: { valueType: oldType },
        data: { valueType: newType }
      });
      
      if (result.count > 0) {
        console.log(`✅ Updated ${result.count} metrics from ${oldType} to ${newType}`);
        totalUpdated += result.count;
      }
    }
    
    console.log(`\n✅ Total updated: ${totalUpdated} metrics`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateDataOnly();