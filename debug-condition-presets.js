const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugConditionPresets() {
  console.log('🔍 Debugging condition presets specifically...\n');

  try {
    // Test 1: Simple query without includes
    console.log('1. 📊 Testing simple condition presets query...');
    try {
      const simplePresets = await prisma.condition_presets.findMany({
        take: 3
      });
      console.log(`   ✅ Simple query: Found ${simplePresets.length} presets`);
      if (simplePresets.length > 0) {
        console.log(`   📋 Sample: ${simplePresets[0].name}`);
        console.log(`   📋 Fields: ${Object.keys(simplePresets[0]).join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ Simple query error: ${error.message}`);
    }

    // Test 2: Test each include separately
    console.log('\n2. 🔍 Testing individual includes...');
    
    // Test diagnoses include
    try {
      const withDiagnoses = await prisma.condition_presets.findMany({
        take: 1,
        include: {
          condition_preset_diagnoses: true
        }
      });
      console.log(`   ✅ Diagnoses include: OK`);
    } catch (error) {
      console.log(`   ❌ Diagnoses include error: ${error.message}`);
    }

    // Test templates include
    try {
      const withTemplates = await prisma.condition_presets.findMany({
        take: 1,
        include: {
          condition_preset_templates: true
        }
      });
      console.log(`   ✅ Templates include: OK`);
    } catch (error) {
      console.log(`   ❌ Templates include error: ${error.message}`);
    }

    // Test templates with nested include
    try {
      const withTemplatesNested = await prisma.condition_presets.findMany({
        take: 1,
        include: {
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
          }
        }
      });
      console.log(`   ✅ Templates with nested include: OK`);
    } catch (error) {
      console.log(`   ❌ Templates with nested include error: ${error.message}`);
    }

    // Test alert rules include
    try {
      const withAlertRules = await prisma.condition_presets.findMany({
        take: 1,
        include: {
          condition_preset_alert_rules: true
        }
      });
      console.log(`   ✅ Alert rules include: OK`);
    } catch (error) {
      console.log(`   ❌ Alert rules include error: ${error.message}`);
    }

    // Test alert rules with nested include
    try {
      const withAlertRulesNested = await prisma.condition_presets.findMany({
        take: 1,
        include: {
          condition_preset_alert_rules: {
            include: {
              alert_rules: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  severity: true,
                  isStandardized: true
                }
              }
            }
          }
        }
      });
      console.log(`   ✅ Alert rules with nested include: OK`);
    } catch (error) {
      console.log(`   ❌ Alert rules with nested include error: ${error.message}`);
    }

    // Test _count
    try {
      const withCount = await prisma.condition_presets.findMany({
        take: 1,
        include: {
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      });
      console.log(`   ✅ Count include: OK`);
    } catch (error) {
      console.log(`   ❌ Count include error: ${error.message}`);
    }

    console.log('\n3. 🔍 Testing full query like in controller...');
    try {
      const fullQuery = await prisma.condition_presets.findMany({
        take: 1,
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
                  description: true,
                  severity: true,
                  isStandardized: true
                }
              }
            }
          },
          _count: {
            select: {
              enrollments: true
            }
          }
        }
      });
      console.log(`   ✅ Full query: Found ${fullQuery.length} presets`);
      if (fullQuery.length > 0) {
        console.log(`   📋 Sample preset: ${fullQuery[0].name}`);
        console.log(`   📋 Diagnoses: ${fullQuery[0].condition_preset_diagnoses.length}`);
        console.log(`   📋 Templates: ${fullQuery[0].condition_preset_templates.length}`);
        console.log(`   📋 Alert rules: ${fullQuery[0].condition_preset_alert_rules.length}`);
      }
    } catch (error) {
      console.log(`   ❌ Full query error: ${error.message}`);
      console.log(`   🔍 Error details: ${error.code || 'Unknown'}`);
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConditionPresets();