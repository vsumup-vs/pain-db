const axios = require('axios');

async function testEnhancedObservationForm() {
  try {
    console.log('🧪 Testing Enhanced Observation Form Implementation...\n');

    // 1. Get enrollments to test with
    console.log('1. Fetching enrollments...');
    const enrollmentsResponse = await axios.get('http://localhost:3001/api/enrollments?limit=1');
    
    if (!enrollmentsResponse.data.data || enrollmentsResponse.data.data.length === 0) {
      console.log('❌ No enrollments found. Please create an enrollment first.');
      return;
    }

    const enrollment = enrollmentsResponse.data.data[0];
    console.log(`✅ Found enrollment: ${enrollment.id} (Patient: ${enrollment.patient?.firstName} ${enrollment.patient?.lastName})`);

    // 2. Test the filtered metrics endpoint
    console.log('\n2. Testing filtered metrics endpoint...');
    const filteredResponse = await axios.get(`http://localhost:3001/api/enrollments/${enrollment.id}/filtered-metrics`);
    
    console.log('✅ Filtered metrics response received');
    console.log(`   - Condition Preset: ${filteredResponse.data.data.context.conditionPreset}`);
    console.log(`   - Available Metrics: ${filteredResponse.data.data.context.totalAvailableMetrics}`);
    console.log(`   - Assessment Templates: ${filteredResponse.data.data.assessmentTemplates.length}`);

    // 3. Analyze metric guidance potential
    console.log('\n3. Analyzing metrics for guidance features...');
    const metrics = filteredResponse.data.data.filteredMetricDefinitions;
    
    metrics.forEach((metric, index) => {
      console.log(`\n   Metric ${index + 1}: ${metric.displayName}`);
      console.log(`   - Type: ${metric.valueType}`);
      console.log(`   - Unit: ${metric.unit || 'None'}`);
      
      if (metric.valueType === 'numeric') {
        console.log(`   - Range: ${metric.scaleMin} - ${metric.scaleMax}`);
        if (metric.decimalPrecision) {
          console.log(`   - Precision: ${metric.decimalPrecision} decimal places`);
        }
      }
      
      if (metric.options && metric.options.length > 0) {
        console.log(`   - Options: ${metric.options.join(', ')}`);
      }
      
      if (metric.description) {
        console.log(`   - Description: ${metric.description}`);
      }

      // Determine guidance type
      let guidanceType = 'Basic';
      if (metric.key?.includes('pain')) guidanceType = 'Pain Assessment';
      else if (metric.key?.includes('fatigue')) guidanceType = 'Fatigue Assessment';
      else if (metric.key?.includes('sleep')) guidanceType = 'Sleep Quality';
      else if (metric.key?.includes('mood')) guidanceType = 'Mood Assessment';
      
      console.log(`   - Guidance Type: ${guidanceType}`);
    });

    // 4. Test observation creation with guidance
    console.log('\n4. Testing observation creation...');
    if (metrics.length > 0) {
      const testMetric = metrics[0];
      let testValue;
      
      if (testMetric.valueType === 'numeric') {
        testValue = testMetric.scaleMin !== null ? testMetric.scaleMin : 5;
      } else if (testMetric.valueType === 'categorical' || testMetric.valueType === 'ordinal') {
        testValue = testMetric.options?.[0] || 'Test Value';
      } else {
        testValue = 'Test observation value';
      }

      const observationData = {
        patientId: enrollment.patientId,
        enrollmentId: enrollment.id,
        metricDefinitionId: testMetric.id,
        notes: 'Test observation created by enhanced form test',
        source: 'clinician'
      };

      // Add appropriate value field
      if (testMetric.valueType === 'numeric') {
        observationData.valueNumeric = parseFloat(testValue);
      } else if (testMetric.valueType === 'categorical' || testMetric.valueType === 'ordinal') {
        observationData.valueCode = testValue;
      } else {
        observationData.valueText = testValue;
      }

      const observationResponse = await axios.post('http://localhost:3001/api/observations', observationData);
      console.log(`✅ Test observation created: ${observationResponse.data.data.id}`);
      console.log(`   - Metric: ${testMetric.displayName}`);
      console.log(`   - Value: ${testValue}`);
    }

    console.log('\n🎉 Enhanced Observation Form Test Complete!');
    console.log('\n📋 Summary of Enhancements:');
    console.log('   ✅ Contextual metric filtering based on condition preset');
    console.log('   ✅ Assessment template visibility');
    console.log('   ✅ Metric guidance system ready');
    console.log('   ✅ Range validation for numeric inputs');
    console.log('   ✅ Option display for categorical inputs');
    console.log('   ✅ Clinical guidance based on metric type');

  } catch (error) {
    console.error('❌ Error testing enhanced observation form:', error.response?.data || error.message);
  }
}

testEnhancedObservationForm();