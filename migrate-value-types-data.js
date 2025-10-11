const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateValueTypesData() {
  console.log('🔄 Migrating Value Type data from uppercase to lowercase...\n');

  try {
    // Step 1: Check current data
    const allMetrics = await prisma.metricDefinition.findMany({
      select: {
        id: true,
        key: true,
        name: true,
        valueType: true
      }
    });

    console.log(`📊 Found ${allMetrics.length} metric definitions to check`);

    // Map old value types to new ones
    const valueTypeMapping = {
      'NUMERIC': 'numeric',
      'TEXT': 'text', 
      'BOOLEAN': 'boolean',
      'DATE': 'date',
      'TIME': 'time',
      'DATETIME': 'datetime',
      'JSON': 'json'
    };

    // Count current types
    const typeCounts = {};
    allMetrics.forEach(metric => {
      const type = metric.valueType;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log('\n📈 Current value type distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} metrics`);
    });

    // Step 2: Migrate data
    console.log('\n🔄 Starting migration...');
    
    let totalUpdated = 0;
    
    for (const [oldType, newType] of Object.entries(valueTypeMapping)) {
      try {
        const result = await prisma.metricDefinition.updateMany({
          where: { valueType: oldType },
          data: { valueType: newType }
        });
        
        if (result.count > 0) {
          console.log(`✅ Updated ${result.count} metrics from ${oldType} to ${newType}`);
          totalUpdated += result.count;
        }
      } catch (error) {
        console.error(`❌ Failed to update ${oldType} to ${newType}:`, error.message);
      }
    }

    console.log(`\n✅ Migration completed! Updated ${totalUpdated} total records`);

    // Step 3: Verify migration
    console.log('\n🔍 Verifying migration...');
    const updatedMetrics = await prisma.metricDefinition.findMany({
      select: {
        valueType: true
      }
    });

    const newTypeCounts = {};
    updatedMetrics.forEach(metric => {
      const type = metric.valueType;
      newTypeCounts[type] = (newTypeCounts[type] || 0) + 1;
    });

    console.log('\n📈 Updated value type distribution:');
    Object.entries(newTypeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} metrics`);
    });

    // Check for any remaining uppercase types
    const remainingUppercase = Object.keys(newTypeCounts).filter(type => 
      type === type.toUpperCase() && type.length > 1
    );

    if (remainingUppercase.length > 0) {
      console.log('\n⚠️  Warning: Some uppercase value types still remain:');
      remainingUppercase.forEach(type => {
        console.log(`   ${type}: ${newTypeCounts[type]} metrics`);
      });
    } else {
      console.log('\n✅ All value types successfully converted to lowercase!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateValueTypesData();
}

module.exports = { migrateValueTypesData };