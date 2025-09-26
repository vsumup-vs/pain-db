const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

async function testEnhancedMetrics() {
  console.log('🚀 Testing Enhanced Metric Creation Flow...\n');

  const baseURL = 'http://localhost:3001/api';

  try {
    // Test 1: Get all metrics with standardization info
    console.log('1. Testing enhanced metric listing');
    const metricsResponse = await axios.get(`${baseURL}/metric-definitions`);
    
    console.log('✅ Metrics fetched successfully');
    console.log(`📊 Total metrics: ${metricsResponse.data.data.length}`);
    
    const standardizedCount = metricsResponse.data.data.filter(m => m.isStandardized).length;
    const customCount = metricsResponse.data.data.length - standardizedCount;
    
    console.log(`🛡️ Standardized metrics: ${standardizedCount}`);
    console.log(`🔧 Custom metrics: ${customCount}\n`);

    // Test 2: Test editing restrictions on standardized metrics
    const standardizedMetric = metricsResponse.data.data.find(m => m.isStandardized);
    
    if (standardizedMetric) {
      console.log('2. Testing standardized metric edit restrictions');
      console.log(`📝 Testing with metric: ${standardizedMetric.displayName}`);
      
      // Try to edit a protected field (should fail)
      try {
        await axios.put(`${baseURL}/metric-definitions/${standardizedMetric.id}`, {
          valueType: 'text', // This should be protected
          displayName: 'Updated Name' // This should be allowed
        });
        console.log('❌ Expected restriction not enforced');
      } catch (error) {
        if (error.response?.status === 400 && error.response.data.message.includes('protected fields')) {
          console.log('✅ Protected field restriction working correctly');
          console.log(`🔒 Protected fields: ${error.response.data.protectedFields.join(', ')}`);
          console.log(`✏️ Editable fields: ${error.response.data.editableFields.join(', ')}`);
        } else {
          console.log('❌ Unexpected error:', error.response?.data || error.message);
        }
      }

      // Try to edit only allowed fields (should succeed)
      try {
        const updateResponse = await axios.put(`${baseURL}/metric-definitions/${standardizedMetric.id}`, {
          displayName: `${standardizedMetric.displayName} (Updated)`,
          description: 'Updated description for testing'
        });
        console.log('✅ Allowed field update successful');
        
        // Revert the changes
        await axios.put(`${baseURL}/metric-definitions/${standardizedMetric.id}`, {
          displayName: standardizedMetric.displayName,
          description: standardizedMetric.description
        });
        console.log('✅ Changes reverted\n');
      } catch (error) {
        console.log('❌ Allowed field update failed:', error.response?.data || error.message);
      }
    }

    // Test 3: Test custom metric creation (full flexibility)
    console.log('3. Testing custom metric creation');
    const customMetricData = {
      key: 'test_custom_metric',
      displayName: 'Test Custom Metric',
      description: 'A fully customizable test metric',
      valueType: 'categorical',
      options: ['Option 1', 'Option 2', 'Option 3'],
      requiredDefault: false,
      defaultFrequency: 'weekly'
    };

    const customCreateResponse = await axios.post(`${baseURL}/metric-definitions`, customMetricData);
    console.log('✅ Custom metric created successfully');
    console.log(`📝 Created: ${customCreateResponse.data.data.displayName}`);
    console.log(`🔧 Is standardized: ${customCreateResponse.data.data.isStandardized || false}`);

    // Test editing the custom metric (should allow all fields)
    const customMetricId = customCreateResponse.data.data.id;
    const updateData = {
      displayName: 'Updated Custom Metric',
      valueType: 'ordinal', // This should be allowed for custom metrics
      options: ['Low', 'Medium', 'High']
    };

    const customUpdateResponse = await axios.put(`${baseURL}/metric-definitions/${customMetricId}`, updateData);
    console.log('✅ Custom metric updated successfully (all fields allowed)');

    // Clean up
    await axios.delete(`${baseURL}/metric-definitions/${customMetricId}`);
    console.log('✅ Test custom metric deleted\n');

    // Test 4: Test metric statistics
    console.log('4. Testing metric statistics');
    const statsResponse = await axios.get(`${baseURL}/metric-definitions/stats`);
    
    console.log('✅ Statistics fetched successfully');
    console.log(`📊 Total metrics: ${statsResponse.data.data.totalMetrics}`);
    console.log(`🛡️ Standardized: ${statsResponse.data.data.standardizedMetrics}`);
    console.log(`🔧 Custom: ${statsResponse.data.data.customMetrics}`);
    console.log(`📈 By type:`, statsResponse.data.data.byType);

    console.log('\n🎉 Enhanced metric creation flow tests completed successfully!');

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
testEnhancedMetrics();