const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRelationships() {
    console.log('🔍 COMPREHENSIVE RELATIONSHIP CHECK');
    console.log('=' .repeat(50));

    try {
        // 1. Check condition presets and their relationships
        console.log('\n📋 1. CONDITION PRESETS ANALYSIS:');
        console.log('-'.repeat(40));
        
        const conditionPresets = await prisma.condition_presets.findMany({
            include: {
                condition_preset_diagnoses: true,
                condition_preset_templates: {
                    include: {
                        assessment_templates: {
                            select: {
                                id: true,
                                name: true,
                                description: true,
                                isStandardized: true,
                                category: true
                            }
                        }
                    }
                },
                condition_preset_alert_rules: {
                    include: {
                        alert_rules: {
                            select: {
                                id: true,
                                name: true,
                                severity: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Total Condition Presets: ${conditionPresets.length}`);
        
        for (const preset of conditionPresets) {
            console.log(`\n📋 ${preset.name} (ID: ${preset.id})`);
            console.log(`   Diagnoses: ${preset.condition_preset_diagnoses.length}`);
            console.log(`   Templates: ${preset.condition_preset_templates.length}`);
            console.log(`   Alert Rules: ${preset.condition_preset_alert_rules.length}`);
            
            if (preset.condition_preset_templates.length > 0) {
                console.log(`   📝 Linked Templates:`);
                for (const link of preset.condition_preset_templates) {
                    const template = link.assessment_templates;
                    console.log(`      - ${template.name} (${template.isStandardized ? 'Standardized' : 'Custom'})`);
                }
            }
        }

        // 2. Check assessment templates and their relationships
        console.log('\n\n📝 2. ASSESSMENT TEMPLATES ANALYSIS:');
        console.log('-'.repeat(40));
        
        const assessmentTemplates = await prisma.assessment_templates.findMany({
            include: {
                assessment_template_items: {
                    include: {
                        metric_definitions: {
                            select: {
                                id: true,
                                name: true,
                                type: true
                            }
                        }
                    }
                },
                condition_preset_templates: {
                    include: {
                        condition_presets: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Total Assessment Templates: ${assessmentTemplates.length}`);
        
        const standardizedTemplates = assessmentTemplates.filter(t => t.isStandardized);
        const customTemplates = assessmentTemplates.filter(t => !t.isStandardized);
        
        console.log(`Standardized Templates: ${standardizedTemplates.length}`);
        console.log(`Custom Templates: ${customTemplates.length}`);

        console.log('\n📊 Template Details:');
        for (const template of assessmentTemplates) {
            console.log(`\n📝 ${template.name} (ID: ${template.id})`);
            console.log(`   Type: ${template.isStandardized ? 'Standardized' : 'Custom'}`);
            console.log(`   Category: ${template.category || 'No category'}`);
            console.log(`   Items: ${template.assessment_template_items.length}`);
            console.log(`   Linked to Presets: ${template.condition_preset_templates.length}`);
            
            // Check metric definitions linkage
            const itemsWithMetrics = template.assessment_template_items.filter(item => item.metric_definitions);
            console.log(`   Items with Metrics: ${itemsWithMetrics.length}`);
            
            if (template.condition_preset_templates.length > 0) {
                console.log(`   🔗 Linked to Presets:`);
                for (const link of template.condition_preset_templates) {
                    console.log(`      - ${link.condition_presets.name}`);
                }
            } else {
                console.log(`   ⚠️  Not linked to any condition presets`);
            }
        }

        // 3. Check metric definitions
        console.log('\n\n📊 3. METRIC DEFINITIONS ANALYSIS:');
        console.log('-'.repeat(40));
        
        const metricDefinitions = await prisma.metric_definitions.findMany({
            include: {
                assessment_template_items: {
                    include: {
                        assessment_templates: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        console.log(`Total Metric Definitions: ${metricDefinitions.length}`);
        
        const linkedMetrics = metricDefinitions.filter(m => m.assessment_template_items.length > 0);
        const unlinkedMetrics = metricDefinitions.filter(m => m.assessment_template_items.length === 0);
        
        console.log(`Linked to Templates: ${linkedMetrics.length}`);
        console.log(`Unlinked: ${unlinkedMetrics.length}`);

        // 4. Check for missing relationships
        console.log('\n\n🔍 4. MISSING RELATIONSHIPS ANALYSIS:');
        console.log('-'.repeat(40));
        
        const templatesWithoutPresets = assessmentTemplates.filter(t => t.condition_preset_templates.length === 0);
        const presetsWithoutTemplates = conditionPresets.filter(p => p.condition_preset_templates.length === 0);
        const templatesWithoutMetrics = assessmentTemplates.filter(t => 
            t.assessment_template_items.every(item => !item.metric_definitions)
        );

        console.log(`\n⚠️  Templates not linked to any presets: ${templatesWithoutPresets.length}`);
        for (const template of templatesWithoutPresets) {
            console.log(`   - ${template.name} (${template.isStandardized ? 'Standardized' : 'Custom'})`);
        }

        console.log(`\n⚠️  Presets without templates: ${presetsWithoutTemplates.length}`);
        for (const preset of presetsWithoutTemplates) {
            console.log(`   - ${preset.name}`);
        }

        console.log(`\n⚠️  Templates without metric definitions: ${templatesWithoutMetrics.length}`);
        for (const template of templatesWithoutMetrics) {
            console.log(`   - ${template.name}`);
        }

        // 5. Suggested fixes
        console.log('\n\n💡 5. SUGGESTED FIXES:');
        console.log('-'.repeat(40));
        
        if (templatesWithoutPresets.length > 0) {
            console.log('\n🔗 Templates that should be linked to presets:');
            for (const template of templatesWithoutPresets) {
                if (template.isStandardized) {
                    const templateName = template.name.toLowerCase();
                    const suggestedPresets = conditionPresets.filter(preset => {
                        const presetName = preset.name.toLowerCase();
                        if (templateName.includes('pain') || templateName.includes('bpi')) {
                            return presetName.includes('pain') || presetName.includes('fibromyalgia');
                        }
                        if (templateName.includes('phq') || templateName.includes('depression')) {
                            return presetName.includes('mental') || presetName.includes('depression');
                        }
                        if (templateName.includes('gad') || templateName.includes('anxiety')) {
                            return presetName.includes('mental') || presetName.includes('anxiety');
                        }
                        if (templateName.includes('diabetes') || templateName.includes('sdsca')) {
                            return presetName.includes('diabetes');
                        }
                        return false;
                    });
                    
                    if (suggestedPresets.length > 0) {
                        console.log(`   📝 ${template.name} → ${suggestedPresets.map(p => p.name).join(', ')}`);
                    }
                }
            }
        }

    } catch (error) {
        console.error('❌ Error during relationship check:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRelationships();