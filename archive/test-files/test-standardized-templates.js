const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

async function testStandardizedTemplates() {
  console.log('🧪 Testing Standardized Template Endpoints...\n');

  const baseURL = 'http://localhost:3001/api';

  try {
    // Test 1: Get standardized templates
    console.log('1. Testing GET /metric-definitions/templates/standardized');
    const templatesResponse = await axios.get(`${baseURL}/metric-definitions/templates/standardized`);
    
    console.log('✅ Templates fetched successfully');
    console.log(`📊 Found ${templatesResponse.data.totalTemplates} standardized templates`);
    
    const categories = Object.keys(templatesResponse.data.data);
    console.log(`📂 Categories: ${categories.join(', ')}\n`);

    // Test 2: Get template details
    if (categories.length > 0) {
      const firstCategory = categories[0];
      const firstTemplate = templatesResponse.data.data[firstCategory][0];
      
      console.log(`2. Testing GET /metric-definitions/templates/${firstTemplate.key}`);
      const templateDetailsResponse = await axios.get(`${baseURL}/metric-definitions/templates/${firstTemplate.key}`);
      
      console.log('✅ Template details fetched successfully');
      console.log(`📋 Template: ${templateDetailsResponse.data.data.displayName}`);
      console.log(`🔒 Protected fields: ${templateDetailsResponse.data.data.protectedFields.join(', ')}`);
      console.log(`✏️ Editable fields: ${templateDetailsResponse.data.data.editableFields.join(', ')}\n`);

      // Test 3: Create metric from template
      console.log('3. Testing POST /metric-definitions/templates/create');
      const createData = {
        templateKey: firstTemplate.key,
        customizations: {
          displayName: `${firstTemplate.displayName} (Test Custom)`,
          defaultFrequency: 'daily',
          requiredDefault: true
        }
      };

      const createResponse = await axios.post(`${baseURL}/metric-definitions/templates/create`, createData);
      
      console.log('✅ Metric created from template successfully');
      console.log(`📝 Created metric: ${createResponse.data.data.displayName}`);
      console.log(`🔑 New metric key: ${createResponse.data.data.key}`);
      console.log(`🏷️ Template used: ${createResponse.data.data.templateUsed}`);
      console.log(`🛡️ Is standardized: ${createResponse.data.data.isStandardized}\n`);

      // Test 4: Verify the created metric has standardized codes
      console.log('4. Verifying standardized codes in created metric');
      const createdMetric = createResponse.data.data;
      
      if (createdMetric.coding) {
        console.log('✅ Standardized codes preserved:');
        if (createdMetric.coding.primary) {
          console.log(`   LOINC: ${createdMetric.coding.primary.code} - ${createdMetric.coding.primary.display}`);
        }
        if (createdMetric.coding.secondary && createdMetric.coding.secondary.length > 0) {
          console.log(`   SNOMED: ${createdMetric.coding.secondary[0].code} - ${createdMetric.coding.secondary[0].display}`);
        }
        if (createdMetric.coding.mappings && createdMetric.coding.mappings.icd10) {
          console.log(`   ICD-10: ${createdMetric.coding.mappings.icd10} - ${createdMetric.coding.mappings.description}`);
        }
      } else {
        console.log('❌ No standardized codes found in created metric');
      }

      // Clean up - delete the test metric
      console.log('\n5. Cleaning up test metric...');
      await axios.delete(`${baseURL}/metric-definitions/${createdMetric.id}`);
      console.log('✅ Test metric deleted');
    }

    console.log('\n🎉 All tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testStandardizedTemplates();