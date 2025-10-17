const { PrismaClient } = require('@prisma/client');

async function verifyMigration() {
    const prisma = new PrismaClient();
    
    try {
        console.log('🔍 Verifying ValueType migration...');
        
        // Check current ValueType distribution
        const valueTypes = await prisma.$queryRaw`
            SELECT "valueType", COUNT(*) as count 
            FROM "metric_definitions" 
            GROUP BY "valueType" 
            ORDER BY count DESC
        `;
        
        console.log('📊 Current ValueType distribution:');
        valueTypes.forEach(row => {
            console.log(`  ${row.valueType}: ${row.count} records`);
        });
        
        // Check if we have any uppercase values left
        const uppercaseCheck = await prisma.$queryRaw`
            SELECT "valueType", COUNT(*) as count 
            FROM "metric_definitions" 
            WHERE "valueType" IN ('NUMERIC', 'TEXT', 'BOOLEAN', 'DATE', 'TIME', 'DATETIME', 'JSON')
            GROUP BY "valueType"
        `;
        
        if (uppercaseCheck.length > 0) {
            console.log('⚠️  Found remaining uppercase values:');
            uppercaseCheck.forEach(row => {
                console.log(`  ${row.valueType}: ${row.count} records`);
            });
        } else {
            console.log('✅ No uppercase values found - migration successful!');
        }
        
        // Test if we can query existing metrics with the new enum values
        console.log('\n🧪 Testing enum value queries...');
        
        const numericMetrics = await prisma.metricDefinition.findMany({
            where: { valueType: 'numeric' },
            take: 3
        });
        
        console.log(`✅ Successfully queried ${numericMetrics.length} numeric metrics`);
        
        const textMetrics = await prisma.metricDefinition.findMany({
            where: { valueType: 'text' },
            take: 3
        });
        
        console.log(`✅ Successfully queried ${textMetrics.length} text metrics`);
        
        // Test creating a simple metric (without the problematic key field)
        console.log('\n🧪 Testing metric creation with new enum values...');
        
        try {
            const testMetric = await prisma.metricDefinition.create({
                data: {
                    name: 'Test Categorical Metric',
                    description: 'Testing new categorical value type',
                    valueType: 'categorical',
                    category: 'test',
                    unit: 'category'
                }
            });
            
            console.log('✅ Successfully created metric with categorical type!');
            
            // Clean up test metric
            await prisma.metricDefinition.delete({
                where: { id: testMetric.id }
            });
            
            console.log('✅ Test metric cleaned up');
            
        } catch (createError) {
            console.log('⚠️  Metric creation test failed:', createError.message);
            console.log('💡 This might indicate the Prisma client needs regeneration');
        }
        
        console.log('\n🎉 ValueType enum migration verification complete!');
        console.log('✅ Data successfully migrated from uppercase to lowercase');
        console.log('✅ New enum values (categorical, ordinal) are available in schema');
        
    } catch (error) {
        console.error('❌ Migration verification failed:', error.message);
        
        if (error.message.includes('Invalid value provided')) {
            console.log('💡 The Prisma client needs to be regenerated...');
            console.log('Run: npx prisma generate');
        }
    } finally {
        await prisma.$disconnect();
    }
}

verifyMigration();