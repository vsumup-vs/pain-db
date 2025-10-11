const { PrismaClient } = require('@prisma/client');
const axios = require('axios');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000/api';

async function debug500Errors() {
  console.log('🔍 Debugging 500 errors for Condition Presets & Assessment Templates...\n');

  try {
    // Test 1: Direct database queries
    console.log('1. 📊 Testing direct database queries...');
    
    // Test assessment templates query
    try {
      const templates = await prisma.assessment_templates.findMany({
        take: 3,
        include: {
          assessment_template_items: {
            include: {
              metric_definitions: true
            }
          },
          assessments: true,
          condition_preset_templates: {
            include: {
              condition_presets: true
            }
          }
        }
      });
      console.log(`   ✅ Assessment Templates DB: Found ${templates.length} templates`);
      if (templates.length > 0) {
        console.log(`   📋 Sample: ${templates[0].name}`);
      }
    } catch (error) {
      console.log(`   ❌ Assessment Templates DB Error: ${error.message}`);
      console.log(`   🔍 Error details: ${error.code || 'Unknown'}`);
    }

    // Test condition presets query
    try {
      const presets = await prisma.condition_presets.findMany({
        take: 3,
        include: {
          condition_preset_diagnoses: true,
          condition_preset_templates: {
            include: {
              assessment_templates: true
            }
          },
          condition_preset_alert_rules: {
            include: {
              alert_rules: true
            }
          }
        }
      });
      console.log(`   ✅ Condition Presets DB: Found ${presets.length} presets`);
      if (presets.length > 0) {
        console.log(`   📋 Sample: ${presets[0].name}`);
      }
    } catch (error) {
      console.log(`   ❌ Condition Presets DB Error: ${error.message}`);
      console.log(`   🔍 Error details: ${error.code || 'Unknown'}`);
    }

    console.log('');

    // Test 2: API endpoints
    console.log('2. 🌐 Testing API endpoints...');
    
    const endpoints = [
      {
        name: 'Assessment Templates (Original)',
        url: `${BASE_URL}/assessment-templates`,
        method: 'GET'
      },
      {
        name: 'Assessment Templates V2 (Enhanced)',
        url: `${BASE_URL}/assessment-templates-v2`,
        method: 'GET'
      },
      {
        name: 'Condition Presets',
        url: `${BASE_URL}/condition-presets`,
        method: 'GET'
      }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`   Testing: ${endpoint.name}...`);
        const response = await axios({
          method: endpoint.method,
          url: endpoint.url,
          timeout: 10000
        });
        
        console.log(`   ✅ ${endpoint.name}: ${response.status} - Found ${Array.isArray(response.data.data) ? response.data.data.length : 'N/A'} items`);
      } catch (error) {
        if (error.response) {
          console.log(`   ❌ ${endpoint.name}: ${error.response.status} - ${error.response.statusText}`);
          if (error.response.data) {
            console.log(`   📝 Error details: ${JSON.stringify(error.response.data, null, 2)}`);
          }
        } else if (error.code === 'ECONNREFUSED') {
          console.log(`   ⚠️  ${endpoint.name}: Server not running (${error.code})`);
        } else {
          console.log(`   ❌ ${endpoint.name}: ${error.message}`);
        }
      }
    }

    console.log('');

    // Test 3: Schema validation
    console.log('3. 🔍 Schema validation...');
    
    try {
      // Check if the models exist and have expected fields
      const templateModel = await prisma.assessment_templates.findFirst();
      const presetModel = await prisma.condition_presets.findFirst();
      
      console.log('   ✅ Schema models accessible');
      
      if (templateModel) {
        console.log(`   📋 Template fields: ${Object.keys(templateModel).join(', ')}`);
      }
      
      if (presetModel) {
        console.log(`   📋 Preset fields: ${Object.keys(presetModel).join(', ')}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Schema validation error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debug500Errors();