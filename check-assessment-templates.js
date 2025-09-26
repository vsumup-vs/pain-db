const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

async function checkAssessmentTemplates() {
  console.log('🔍 Checking Assessment Templates Status...\n');

  try {
    // Step 1: Check database directly
    console.log('1. 📊 Checking database for assessment templates...');
    
    const allTemplates = await prisma.assessmentTemplate.findMany({
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
                id: true,
                key: true,
                displayName: true,
                valueType: true
              }
            }
          },
          orderBy: { displayOrder: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`   📋 Total templates found: ${allTemplates.length}`);
    
    if (allTemplates.length === 0) {
      console.log('   ❌ No assessment templates found in database');
      console.log('   💡 You may need to run the creation script first');
      return;
    }

    // Check for standardized templates
    const standardizedTemplates = allTemplates.filter(t => t.isStandardized === true);
    const customTemplates = allTemplates.filter(t => t.isStandardized !== true);
    
    console.log(`   🏆 Standardized templates: ${standardizedTemplates.length}`);
    console.log(`   🛠️  Custom templates: ${customTemplates.length}\n`);

    // Step 2: List standardized templates
    if (standardizedTemplates.length > 0) {
      console.log('2. 🏆 Standardized Templates Found:');
      standardizedTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name}`);
        console.log(`      📂 Category: ${template.category || 'Not set'}`);
        console.log(`      📝 Items: ${template.items.length}`);
        console.log(`      🏥 Clinical Use: ${template.clinicalUse || 'Not specified'}`);
        if (template.validationInfo) {
          console.log(`      ✅ Validation: ${template.validationInfo.instrument || 'Available'}`);
        }
        console.log('');
      });
    } else {
      console.log('2. ❌ No standardized templates found');
      console.log('   💡 Templates exist but may not be marked as standardized\n');
      
      // Show first few templates for reference
      console.log('   📋 Available templates:');
      allTemplates.slice(0, 5).forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.items.length} items)`);
      });
      console.log('');
    }

    // Step 3: Test API endpoints
    console.log('3. 🌐 Testing API endpoints...');
    
    const baseURL = 'http://localhost:3001/api';
    
    try {
      // Test enhanced endpoint
      console.log('   Testing GET /assessment-templates-v2...');
      const enhancedResponse = await axios.get(`${baseURL}/assessment-templates-v2`, { timeout: 5000 });
      console.log(`   ✅ Enhanced endpoint: ${enhancedResponse.status} - Found ${enhancedResponse.data.length || 0} templates`);
    } catch (error) {
      console.log(`   ❌ Enhanced endpoint failed: ${error.message}`);
    }

    try {
      // Test standardized endpoint
      console.log('   Testing GET /assessment-templates-v2/standardized...');
      const standardizedResponse = await axios.get(`${baseURL}/assessment-templates-v2/standardized`, { timeout: 5000 });
      console.log(`   ✅ Standardized endpoint: ${standardizedResponse.status} - Found ${standardizedResponse.data.length || 0} templates`);
    } catch (error) {
      console.log(`   ❌ Standardized endpoint failed: ${error.message}`);
    }

    try {
      // Test categories endpoint
      console.log('   Testing GET /assessment-templates-v2/categories...');
      const categoriesResponse = await axios.get(`${baseURL}/assessment-templates-v2/categories`, { timeout: 5000 });
      console.log(`   ✅ Categories endpoint: ${categoriesResponse.status} - Found ${categoriesResponse.data.length || 0} categories`);
    } catch (error) {
      console.log(`   ❌ Categories endpoint failed: ${error.message}`);
    }

    // Step 4: Check for expected standardized templates
    console.log('\n4. 🎯 Checking for expected standardized templates...');
    
    const expectedTemplates = [
      'Brief Pain Inventory (BPI)',
      'Patient Health Questionnaire-9 (PHQ-9)',
      'Generalized Anxiety Disorder-7 (GAD-7)',
      'Fibromyalgia Impact Questionnaire (FIQ)',
      'Summary of Diabetes Self-Care Activities (SDSCA)'
    ];

    expectedTemplates.forEach(expectedName => {
      const found = allTemplates.find(t => t.name === expectedName);
      if (found) {
        console.log(`   ✅ ${expectedName} - Found (${found.isStandardized ? 'Standardized' : 'Not marked as standardized'})`);
      } else {
        console.log(`   ❌ ${expectedName} - Missing`);
      }
    });

    console.log('\n🎉 Assessment template check completed!');

  } catch (error) {
    console.error('❌ Error checking assessment templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the check
checkAssessmentTemplates();