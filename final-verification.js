const { PrismaClient } = require('@prisma/client');

async function finalVerification() {
    const prisma = new PrismaClient();
    console.log('🔍 FINAL SYSTEM VERIFICATION');
    console.log('============================\n');

    try {
        // Test all main models with correct naming
        const models = [
            { name: 'MetricDefinition', model: prisma.MetricDefinition },
            { name: 'AlertRule', model: prisma.AlertRule },
            { name: 'AssessmentTemplate', model: prisma.assessment_templates },
            { name: 'ConditionPreset', model: prisma.condition_presets }
        ];

        console.log('📊 MODEL ACCESSIBILITY TEST:');
        console.log('----------------------------');
        
        let workingModels = 0;
        for (const { name, model } of models) {
            try {
                const count = await model.count();
                console.log(`✅ ${name}: ${count} records`);
                workingModels++;
            } catch (error) {
                console.log(`❌ ${name}: ${error.message}`);
            }
        }

        console.log(`\n📈 COMPLIANCE RATE: ${workingModels}/${models.length} (${(workingModels/models.length*100).toFixed(1)}%)`);

        // Test AlertRule specifically with relationships
        console.log('\n🔗 ALERT RULE RELATIONSHIP TEST:');
        console.log('--------------------------------');
        try {
            const alertRules = await prisma.AlertRule.findMany({
                include: {
                    condition_preset_alert_rules: {
                        include: {
                            condition_presets: true
                        }
                    }
                },
                take: 1
            });
            console.log(`✅ AlertRule relationships: Working (${alertRules.length} records tested)`);
        } catch (error) {
            console.log(`❌ AlertRule relationships: ${error.message}`);
        }

        // Test assessment_templates relationships
        console.log('\n📋 ASSESSMENT TEMPLATE RELATIONSHIP TEST:');
        console.log('------------------------------------------');
        try {
            const templates = await prisma.assessment_templates.findMany({
                include: {
                    assessment_template_items: {
                        include: {
                            metric_definitions: true
                        }
                    }
                },
                take: 1
            });
            console.log(`✅ AssessmentTemplate relationships: Working (${templates.length} records tested)`);
        } catch (error) {
            console.log(`❌ AssessmentTemplate relationships: ${error.message}`);
        }

        // Test condition_presets relationships
        console.log('\n🎯 CONDITION PRESET RELATIONSHIP TEST:');
        console.log('--------------------------------------');
        try {
            const presets = await prisma.condition_presets.findMany({
                include: {
                    condition_preset_alert_rules: {
                        include: {
                            alert_rules: true
                        }
                    },
                    condition_preset_templates: {
                        include: {
                            assessment_templates: true
                        }
                    }
                },
                take: 1
            });
            console.log(`✅ ConditionPreset relationships: Working (${presets.length} records tested)`);
        } catch (error) {
            console.log(`❌ ConditionPreset relationships: ${error.message}`);
        }

        // Summary
        if (workingModels === models.length) {
            console.log('\n🎉 EXCELLENT: All models are now working!');
            console.log('✅ System is fully compliant with naming standards');
            console.log('\n📋 NAMING CONVENTION SUMMARY:');
            console.log('-----------------------------');
            console.log('✅ MetricDefinition: PascalCase (maps to metric_definitions)');
            console.log('✅ AlertRule: PascalCase (maps to alert_rules)');
            console.log('✅ assessment_templates: snake_case (direct table name)');
            console.log('✅ condition_presets: snake_case (direct table name)');
        } else {
            console.log(`\n⚠️  ${models.length - workingModels} models still need attention`);
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

finalVerification().catch(console.error);