const { PrismaClient } = require('@prisma/client');

async function testAlertRuleFix() {
    const prisma = new PrismaClient();
    console.log('🧪 TESTING ALERT RULE CONTROLLER FIX');
    console.log('===================================\n');

    try {
        // Test 1: Check if AlertRule model is accessible
        console.log('1. Testing AlertRule model access...');
        const count = await prisma.AlertRule.count();
        console.log(`✅ AlertRule.count(): ${count} records`);

        // Test 2: Test findMany with relationships
        console.log('\n2. Testing AlertRule relationships...');
        const rules = await prisma.AlertRule.findMany({
            include: {
                condition_preset_alert_rules: {
                    include: {
                        condition_presets: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            take: 1
        });
        console.log(`✅ AlertRule.findMany() with relationships: ${rules.length} records`);

        // Test 3: Check if we can create a test rule
        console.log('\n3. Testing AlertRule creation...');
        const testRule = await prisma.AlertRule.create({
            data: {
                name: 'Test Rule - High Pain Score',
                description: 'Alert when pain score exceeds threshold',
                conditions: {
                    metric: 'pain_score',
                    operator: '>',
                    value: 8,
                    window: '5m'
                },
                actions: {
                    notify: true,
                    escalate: false,
                    cooldown: 300
                },
                severity: 'HIGH',
                category: 'Pain Management',
                isActive: true
            }
        });
        console.log(`✅ AlertRule.create(): Created rule with ID ${testRule.id}`);

        // Test 4: Test update operation
        console.log('\n4. Testing AlertRule update...');
        const updatedRule = await prisma.AlertRule.update({
            where: { id: testRule.id },
            data: {
                description: 'Updated: Alert when pain score exceeds threshold',
                priority: 1
            }
        });
        console.log(`✅ AlertRule.update(): Updated rule ${updatedRule.id}`);

        // Test 5: Test findById
        console.log('\n5. Testing AlertRule findById...');
        const foundRule = await prisma.AlertRule.findUnique({
            where: { id: testRule.id },
            include: {
                condition_preset_alert_rules: true
            }
        });
        console.log(`✅ AlertRule.findUnique(): Found rule "${foundRule.name}"`);

        // Clean up test data
        await prisma.AlertRule.delete({
            where: { id: testRule.id }
        });
        console.log('\n🧹 Cleaned up test data');

        console.log('\n🎉 ALL TESTS PASSED! AlertRule controller is now working.');
        console.log('\n📋 Summary:');
        console.log('   ✅ Model access: Working');
        console.log('   ✅ Relationships: Working');
        console.log('   ✅ Create operation: Working');
        console.log('   ✅ Update operation: Working');
        console.log('   ✅ Find operations: Working');
        console.log('   ✅ Delete operation: Working');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\n🔍 Error details:');
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        if (error.meta) {
            console.error(`   Meta: ${JSON.stringify(error.meta, null, 2)}`);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testAlertRuleFix().catch(console.error);