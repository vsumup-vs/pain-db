const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function safeValueTypeMigration() {
  console.log('🔧 Safe Value Type Migration\n');

  // Step 1: Temporarily revert schema to uppercase to match existing data
  console.log('📝 Step 1: Temporarily reverting schema to match existing database...');
  
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  let schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  // Create backup
  fs.writeFileSync(schemaPath + '.backup', schemaContent);
  console.log('✅ Schema backup created');

  // Temporarily revert to uppercase enum
  const uppercaseEnum = `// Temporarily using uppercase to match existing data
enum ValueType {
  NUMERIC
  TEXT
  BOOLEAN
  DATE
  TIME
  DATETIME
  JSON
}`;

  schemaContent = schemaContent.replace(
    /\/\/ Updated ValueType enum to match frontend usage and add missing types\nenum ValueType \{[^}]+\}/s,
    uppercaseEnum
  );

  fs.writeFileSync(schemaPath, schemaContent);
  console.log('✅ Schema temporarily reverted to uppercase');

  // Step 2: Initialize Prisma client with uppercase enum
  console.log('\n🔄 Step 2: Initializing database connection...');
  const prisma = new PrismaClient();

  try {
    // Step 3: Check current data
    console.log('\n📊 Step 3: Analyzing current data...');
    
    const allMetrics = await prisma.metricDefinition.findMany({
      select: {
        id: true,
        key: true,
        valueType: true
      }
    });

    console.log(`Found ${allMetrics.length} metric definitions`);

    // Count current types
    const typeCounts = {};
    allMetrics.forEach(metric => {
      const type = metric.valueType;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    console.log('\nCurrent value type distribution:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} metrics`);
    });

    // Step 4: Migrate data to lowercase
    console.log('\n🔄 Step 4: Migrating data to lowercase...');
    
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
      try {
        // Use updateMany to change the values
        const updateResult = await prisma.metricDefinition.updateMany({
          where: { valueType: oldType },
          data: { valueType: newType }
        });
        
        if (updateResult.count > 0) {
          console.log(`✅ Updated ${updateResult.count} metrics from ${oldType} to ${newType}`);
          totalUpdated += updateResult.count;
        }
      } catch (updateError) {
        console.error(`❌ Failed to update ${oldType}: ${updateError.message}`);
      }
    }

    console.log(`\n✅ Data migration completed! Updated ${totalUpdated} total records`);

    // Step 5: Verify migration
    console.log('\n🔍 Step 5: Verifying migration...');
    const updatedMetrics = await prisma.metricDefinition.findMany({
      select: { valueType: true }
    });

    const newTypeCounts = {};
    updatedMetrics.forEach(metric => {
      const type = metric.valueType;
      newTypeCounts[type] = (newTypeCounts[type] || 0) + 1;
    });

    console.log('\nUpdated value type distribution:');
    Object.entries(newTypeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} metrics`);
    });

    // Check for remaining uppercase
    const remainingUppercase = Object.keys(newTypeCounts).filter(type => 
      type === type.toUpperCase() && type.length > 1
    );

    if (remainingUppercase.length > 0) {
      console.log('\n⚠️  Warning: Some uppercase types remain:', remainingUppercase);
      await prisma.$disconnect();
      return false;
    }

    await prisma.$disconnect();

    // Step 6: Restore schema with lowercase enum and new types
    console.log('\n📝 Step 6: Restoring schema with lowercase enum and new types...');
    
    const finalEnum = `// Updated ValueType enum to match frontend usage and add missing types
enum ValueType {
  numeric
  text
  boolean
  categorical
  ordinal
  date
  time
  datetime
  json
}`;

    schemaContent = fs.readFileSync(schemaPath, 'utf8');
    schemaContent = schemaContent.replace(
      /\/\/ Temporarily using uppercase to match existing data\nenum ValueType \{[^}]+\}/s,
      finalEnum
    );

    fs.writeFileSync(schemaPath, schemaContent);
    console.log('✅ Schema restored with lowercase enum and new types');

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Run: npx prisma db push');
    console.log('   2. Run: npx prisma generate');
    console.log('\n✅ Your data is now ready for the new schema!');

    return true;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    // Restore backup on failure
    console.log('\n🔄 Restoring schema backup...');
    try {
      const backupContent = fs.readFileSync(schemaPath + '.backup', 'utf8');
      fs.writeFileSync(schemaPath, backupContent);
      console.log('✅ Schema backup restored');
    } catch (backupError) {
      console.error('❌ Failed to restore backup:', backupError.message);
    }
    
    await prisma.$disconnect();
    return false;
  }
}

if (require.main === module) {
  safeValueTypeMigration();
}

module.exports = { safeValueTypeMigration };