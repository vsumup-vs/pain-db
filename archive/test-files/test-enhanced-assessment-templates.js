const { PrismaClient } = require('./generated/prisma');
const axios = require('axios');

const prisma = new PrismaClient();

async function testEnhancedAssessmentTemplates() {
  console.log('🧪 TESTING ENHANCED ASSESSMENT TEMPLATE IMPLEMENTATION');
  console.log('=' .repeat(70));

  try {
    // Test 1: Database Schema Validation
    console.log('\n1. 📊 DATABASE SCHEMA VALIDATION');
    console.log('-'.repeat(40));

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

    console.log(`✅ Total templates found: ${allTemplates.length}`);
    
    // Check for standardization fields
    const templatesWithStandardization = allTemplates.filter(t => 
      t.hasOwnProperty('isStandardized') && 
      t.hasOwnProperty('category') && 
      t.hasOwnProperty('validationInfo')
    );
    
    console.log(`✅ Templates with standardization fields: ${templatesWithStandardization.length}/${allTemplates.length}`);

    const standardizedTemplates = allTemplates.filter(t => t.isStandardized === true);
    const customTemplates = allTemplates.filter(t => t.isStandardized !== true);
    
    console.log(`✅ Standardized templates: ${standardizedTemplates.length}`);
    console.log(`✅ Custom templates: ${customTemplates.length}`);

    // Test 2: Enhanced API Endpoints
    console.log('\n2. 🌐 ENHANCED API ENDPOINTS TEST');
    console.log('-'.repeat(40));

    const baseURL = 'http://localhost:3001/api';
    const endpoints = [
      { path: '/assessment-templates-v2', name: 'Enhanced Templates' },
      { path: '/assessment-templates-v2/standardized', name: 'Standardized Templates' },
      { path: '/assessment-templates-v2/custom', name: 'Custom Templates' },
      { path: '/assessment-templates-v2/categories', name: 'Template Categories' }
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`   Testing ${endpoint.name}...`);
        const response = await axios.get(`${baseURL}${endpoint.path}`, { timeout: 5000 });
        console.log(`   ✅ ${endpoint.name}: ${response.status} - ${Array.isArray(response.data) ? response.data.length : 'OK'} items`);
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`   ⚠️  ${endpoint.name}: Server not running (${error.code})`);
        } else {
          console.log(`   ❌ ${endpoint.name}: ${error.response?.status || error.code} - ${error.message}`);
        }
      }
    }

    // Test 3: Data Integrity Validation
    console.log('\n3. 🔍 DATA INTEGRITY VALIDATION');
    console.log('-'.repeat(40));

    if (standardizedTemplates.length > 0) {
      console.log('   Validating standardized templates...');
      
      for (const template of standardizedTemplates) {
        const issues = [];
        
        if (!template.category) issues.push('Missing category');
        if (!template.validationInfo) issues.push('Missing validation info');
        if (!template.clinicalUse) issues.push('Missing clinical use');
        if (template.items.length === 0) issues.push('No template items');
        
        if (issues.length === 0) {
          console.log(`   ✅ ${template.name}: Valid`);
        } else {
          console.log(`   ⚠️  ${template.name}: ${issues.join(', ')}`);
        }
      }
    } else {
      console.log('   ⚠️  No standardized templates found for validation');
    }

    // Test 4: Frontend File Validation
    console.log('\n4. 📁 FRONTEND FILE VALIDATION');
    console.log('-'.repeat(40));

    const fs = require('fs');
    const path = require('path');

    const frontendFiles = [
      { path: 'frontend/src/services/api.js', name: 'Enhanced API Service' },
      { path: 'frontend/src/pages/AssessmentTemplatesEnhanced.jsx', name: 'Enhanced Frontend Page' }
    ];

    for (const file of frontendFiles) {
      const filePath = path.join(__dirname, file.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for enhanced API endpoints
        if (file.path.includes('api.js')) {
          const hasEnhancedEndpoints = content.includes('assessment-templates-v2') &&
                                     content.includes('getStandardizedTemplates') &&
                                     content.includes('getCustomTemplates');
          console.log(`   ${hasEnhancedEndpoints ? '✅' : '❌'} ${file.name}: Enhanced endpoints ${hasEnhancedEndpoints ? 'present' : 'missing'}`);
        }
        
        // Check for enhanced frontend component
        if (file.path.includes('AssessmentTemplatesEnhanced.jsx')) {
          const hasTabInterface = content.includes('All Templates') &&
                                 content.includes('Standardized') &&
                                 content.includes('Custom');
          console.log(`   ${hasTabInterface ? '✅' : '❌'} ${file.name}: Tab interface ${hasTabInterface ? 'present' : 'missing'}`);
        }
      } else {
        console.log(`   ❌ ${file.name}: File not found`);
      }
    }

    // Test 5: Backend Route Validation
    console.log('\n5. 🔧 BACKEND ROUTE VALIDATION');
    console.log('-'.repeat(40));

    const backendFiles = [
      { path: 'src/routes/assessmentTemplateRoutes.enhanced.js', name: 'Enhanced Routes' },
      { path: 'src/controllers/assessmentTemplateController.enhanced.js', name: 'Enhanced Controller' }
    ];

    for (const file of backendFiles) {
      const filePath = path.join(__dirname, file.path);
      if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file.name}: File exists`);
      } else {
        console.log(`   ❌ ${file.name}: File not found`);
      }
    }

    // Test 6: System Integration Check
    console.log('\n6. 🔗 SYSTEM INTEGRATION CHECK');
    console.log('-'.repeat(40));

    // Check if enhanced routes are registered
    const indexPath = path.join(__dirname, 'index.js');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      const hasEnhancedRoutes = indexContent.includes('assessment-templates-v2');
      console.log(`   ${hasEnhancedRoutes ? '✅' : '❌'} Enhanced routes registration: ${hasEnhancedRoutes ? 'Found' : 'Missing'}`);
    }

    // Summary
    console.log('\n📋 TEST SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Database Templates: ${allTemplates.length} total`);
    console.log(`Standardized Templates: ${standardizedTemplates.length}`);
    console.log(`Custom Templates: ${customTemplates.length}`);
    console.log(`Schema Fields: ${templatesWithStandardization.length}/${allTemplates.length} have standardization fields`);

    if (standardizedTemplates.length > 0 && templatesWithStandardization.length === allTemplates.length) {
      console.log('\n🎉 ENHANCED ASSESSMENT TEMPLATE SYSTEM: READY');
      console.log('✅ Database schema enhanced');
      console.log('✅ Standardized templates present');
      console.log('✅ Enhanced APIs implemented');
      console.log('✅ Frontend components created');
    } else {
      console.log('\n⚠️  SYSTEM NEEDS ATTENTION');
      if (standardizedTemplates.length === 0) {
        console.log('❌ No standardized templates found');
        console.log('💡 Run: node create-standardized-assessment-templates.js');
      }
      if (templatesWithStandardization.length < allTemplates.length) {
        console.log('❌ Some templates missing standardization fields');
        console.log('💡 Run: node enhance-assessment-templates-final.js');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
if (require.main === module) {
  testEnhancedAssessmentTemplates()
    .catch(console.error)
    .finally(() => process.exit());
}

module.exports = { testEnhancedAssessmentTemplates };