const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function verifySystemStandards() {
    const prisma = new PrismaClient();
    console.log('🔍 SYSTEM CODING STANDARDS VERIFICATION');
    console.log('=====================================\n');

    try {
        // 1. PRE-CHANGE ANALYSIS
        console.log('📋 1. PRE-CHANGE ANALYSIS');
        console.log('-------------------------');
        
        const models = ['MetricDefinition', 'AlertRule', 'AssessmentTemplate', 'ConditionPreset'];
        const modelResults = {};
        
        for (const model of models) {
            try {
                const count = await prisma[model].count();
                modelResults[model] = { accessible: true, count, error: null };
                console.log(`✅ ${model}: Accessible (${count} records)`);
            } catch (error) {
                modelResults[model] = { accessible: false, count: 0, error: error.message };
                console.log(`❌ ${model}: Not accessible - ${error.message}`);
            }
        }

        // 2. TEST ALTERNATIVE NAMING PATTERNS
        console.log('\n🔄 2. TESTING ALTERNATIVE NAMING PATTERNS');
        console.log('------------------------------------------');
        
        const namingTests = [
            { pattern: 'PascalCase', models: ['MetricDefinition', 'AlertRule'] },
            { pattern: 'camelCase', models: ['metricDefinition', 'alertRule'] },
            { pattern: 'snake_case', models: ['metric_definition', 'alert_rule'] }
        ];
        
        for (const test of namingTests) {
            console.log(`\n${test.pattern} Pattern:`);
            for (const modelName of test.models) {
                try {
                    if (prisma[modelName]) {
                        const count = await prisma[modelName].count();
                        console.log(`  ✅ prisma.${modelName}: Works (${count} records)`);
                    } else {
                        console.log(`  ❌ prisma.${modelName}: Model not found`);
                    }
                } catch (error) {
                    console.log(`  ❌ prisma.${modelName}: Error - ${error.message}`);
                }
            }
        }

        // 3. VERIFY RELATIONSHIP PATTERNS
        console.log('\n🔗 3. RELATIONSHIP PATTERN VERIFICATION');
        console.log('---------------------------------------');
        
        try {
            // Test AssessmentTemplate relationships
            const templateWithRelations = await prisma.AssessmentTemplate.findFirst({
                include: {
                    assessments: true,
                    condition_preset_templates: {
                        include: {
                            condition_presets: true
                        }
                    }
                }
            });
            console.log('✅ AssessmentTemplate relationships: Working');
        } catch (error) {
            console.log(`❌ AssessmentTemplate relationships: ${error.message}`);
        }

        try {
            // Test ConditionPreset relationships
            const presetWithRelations = await prisma.ConditionPreset.findFirst({
                include: {
                    condition_preset_diagnoses: true,
                    condition_preset_templates: {
                        include: {
                            assessment_templates: true
                        }
                    }
                }
            });
            console.log('✅ ConditionPreset relationships: Working');
        } catch (error) {
            console.log(`❌ ConditionPreset relationships: ${error.message}`);
        }

        // 4. CONTROLLER FILE ANALYSIS
        console.log('\n📁 4. CONTROLLER FILE ANALYSIS');
        console.log('------------------------------');
        
        const controllerDir = '/home/vsumup/pain-db/src/controllers';
        const controllers = fs.readdirSync(controllerDir).filter(file => file.endsWith('.js'));
        
        for (const controller of controllers) {
            const filePath = path.join(controllerDir, controller);
            const content = fs.readFileSync(filePath, 'utf8');
            
            console.log(`\n${controller}:`);
            
            // Check for prisma model usage
            const prismaMatches = content.match(/prisma\.(\w+)/g);
            if (prismaMatches) {
                const uniqueModels = [...new Set(prismaMatches)];
                uniqueModels.forEach(match => {
                    console.log(`  📝 Uses: ${match}`);
                });
            }
            
            // Check for potential issues
            if (content.includes('condition_preset_condition_preset')) {
                console.log('  ⚠️  WARNING: Corrupted relation names detected');
            }
        }

        // 5. COMPLIANCE SUMMARY
        console.log('\n📊 5. COMPLIANCE SUMMARY');
        console.log('------------------------');
        
        const workingModels = Object.entries(modelResults).filter(([_, result]) => result.accessible).length;
        const totalModels = Object.keys(modelResults).length;
        const complianceRate = (workingModels / totalModels * 100).toFixed(1);
        
        console.log(`Model Accessibility: ${workingModels}/${totalModels} (${complianceRate}%)`);
        
        if (complianceRate === '100.0') {
            console.log('🎉 EXCELLENT: All models are accessible!');
        } else if (complianceRate >= '75.0') {
            console.log('✅ GOOD: Most models are working');
        } else {
            console.log('⚠️  NEEDS ATTENTION: Multiple models have issues');
        }

        // 6. TARGETED RECOMMENDATIONS
        console.log('\n🎯 6. TARGETED RECOMMENDATIONS');
        console.log('------------------------------');
        
        const brokenModels = Object.entries(modelResults).filter(([_, result]) => !result.accessible);
        
        if (brokenModels.length === 0) {
            console.log('✅ No immediate fixes needed - system is compliant!');
        } else {
            console.log('🔧 Required fixes:');
            brokenModels.forEach(([model, result]) => {
                console.log(`  • Fix ${model}: ${result.error}`);
            });
        }

        // 7. DATA POPULATION STATUS
        console.log('\n📈 7. DATA POPULATION STATUS');
        console.log('----------------------------');
        
        const emptyModels = Object.entries(modelResults)
            .filter(([_, result]) => result.accessible && result.count === 0);
        
        if (emptyModels.length > 0) {
            console.log('📋 Models needing data population:');
            emptyModels.forEach(([model, _]) => {
                console.log(`  • ${model}: No records found`);
            });
        } else {
            console.log('✅ All accessible models have data');
        }

    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Run verification
verifySystemStandards().catch(console.error);