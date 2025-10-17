const fs = require('fs');
const path = require('path');

async function fixFrontendIssues() {
  console.log('🔧 Fixing Frontend Issues...\n');

  // Fix 1: API Service - Fix duplicate method name
  console.log('1. 🔧 Fixing API service duplicate method...');
  const apiServicePath = path.join(__dirname, 'frontend', 'src', 'services', 'api.js');
  
  if (fs.existsSync(apiServicePath)) {
    let content = fs.readFileSync(apiServicePath, 'utf8');
    
    // Replace line 99: getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates-v2/${id}`)
    // with: getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`)
    content = content.replace(
      'getAssessmentTemplate: (id) => apiClient.get(`/assessment-templates-v2/${id}`)',
      'getAssessmentTemplateV2: (id) => apiClient.get(`/assessment-templates-v2/${id}`)'
    );
    
    fs.writeFileSync(apiServicePath, content);
    console.log('   ✅ Fixed duplicate API method name');
  } else {
    console.log('   ⚠️ API service file not found');
  }

  // Fix 2: Metric Definition Controller - Fix standardization logic
  console.log('\n2. 🔧 Fixing metric definition controller standardization logic...');
  const controllerPath = path.join(__dirname, 'src', 'controllers', 'metricDefinitionController.js');
  
  if (fs.existsSync(controllerPath)) {
    let content = fs.readFileSync(controllerPath, 'utf8');
    
    // Fix line 418: isStandardized: !!metric.coding,
    content = content.replace(
      'isStandardized: !!metric.coding,',
      'isStandardized: !!metric.standardCoding || metric.isStandardized,'
    );
    
    // Fix line 478: isStandardized: !!metricDefinition.coding,
    content = content.replace(
      'isStandardized: !!metricDefinition.coding,',
      'isStandardized: !!metricDefinition.standardCoding || metricDefinition.isStandardized,'
    );
    
    // Fix line 515: const isStandardized = !!existingMetric.coding;
    content = content.replace(
      'const isStandardized = !!existingMetric.coding;',
      'const isStandardized = !!existingMetric.standardCoding || existingMetric.isStandardized;'
    );
    
    // Fix line 672: coding: { not: null }
    content = content.replace(
      'coding: {\n        not: null\n      }',
      'OR: [\n        { standardCoding: { not: null } },\n        { isStandardized: true }\n      ]'
    );
    
    // Fix line 704: isStandardized: !!metric.coding,
    content = content.replace(
      'isStandardized: !!metric.coding,',
      'isStandardized: !!metric.standardCoding || metric.isStandardized,'
    );
    
    fs.writeFileSync(controllerPath, content);
    console.log('   ✅ Fixed standardization logic in controller');
  } else {
    console.log('   ⚠️ Controller file not found');
  }

  // Fix 3: Frontend components - Fix coding field references
  console.log('\n3. 🔧 Fixing frontend component coding field references...');
  
  const frontendFiles = [
    'frontend/src/pages/AssessmentTemplatesEnhanced.jsx',
    'frontend/src/pages/AssessmentTemplates.jsx'
  ];
  
  frontendFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace coding references with standardCoding
      content = content.replace(/\.coding/g, '.standardCoding');
      
      fs.writeFileSync(fullPath, content);
      console.log(`   ✅ Fixed coding references in ${filePath}`);
    }
  });

  console.log('\n✅ Frontend issues fixed!');
  console.log('\n📋 Summary of fixes:');
  console.log('   1. Fixed duplicate getAssessmentTemplate method in API service');
  console.log('   2. Fixed standardization detection logic in metric controller');
  console.log('   3. Fixed coding field references in frontend components');
  console.log('\n🔄 Please restart your development server to see the changes.');
}

fixFrontendIssues().catch(console.error);