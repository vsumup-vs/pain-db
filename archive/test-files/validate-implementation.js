const { PrismaClient } = require('./generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function validateImplementation() {
  console.log('🔍 VALIDATING ENHANCED ASSESSMENT TEMPLATE IMPLEMENTATION');
  console.log('=' .repeat(65));

  let allChecks = [];

  try {
    // Check 1: Database Schema
    console.log('\n1. 📊 DATABASE SCHEMA CHECK');
    console.log('-'.repeat(35));

    const sampleTemplate = await prisma.assessmentTemplate.findFirst();
    
    if (sampleTemplate) {
      const hasStandardizationFields = 
        sampleTemplate.hasOwnProperty('isStandardized') &&
        sampleTemplate.hasOwnProperty('category') &&
        sampleTemplate.hasOwnProperty('validationInfo');
      
      console.log(`✅ Assessment templates exist: ${hasStandardizationFields ? 'With standardization fields' : 'Basic fields only'}`);
      allChecks.push({ name: 'Database Schema', status: hasStandardizationFields });
    } else {
      console.log('❌ No assessment templates found');
      allChecks.push({ name: 'Database Schema', status: false });
    }

    // Check 2: Enhanced API File
    console.log('\n2. 📁 ENHANCED API FILE CHECK');
    console.log('-'.repeat(35));

    const apiPath = path.join(__dirname, 'frontend/src/services/api.js');
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      const hasEnhancedEndpoints = 
        apiContent.includes('getAssessmentTemplatesV2') &&
        apiContent.includes('getStandardizedTemplates') &&
        apiContent.includes('getCustomTemplates');
      
      console.log(`${hasEnhancedEndpoints ? '✅' : '❌'} Enhanced API endpoints: ${hasEnhancedEndpoints ? 'Present' : 'Missing'}`);
      allChecks.push({ name: 'Enhanced API', status: hasEnhancedEndpoints });
    } else {
      console.log('❌ API file not found');
      allChecks.push({ name: 'Enhanced API', status: false });
    }

    // Check 3: Enhanced Frontend Component
    console.log('\n3. 🖥️  ENHANCED FRONTEND CHECK');
    console.log('-'.repeat(35));

    const frontendPath = path.join(__dirname, 'frontend/src/pages/AssessmentTemplatesEnhanced.jsx');
    if (fs.existsSync(frontendPath)) {
      const frontendContent = fs.readFileSync(frontendPath, 'utf8');
      const hasTabInterface = 
        frontendContent.includes('All Templates') &&
        frontendContent.includes('Standardized') &&
        frontendContent.includes('Custom');
      
      console.log(`${hasTabInterface ? '✅' : '❌'} Enhanced frontend page: ${hasTabInterface ? 'With tabs' : 'Basic'}`);
      allChecks.push({ name: 'Enhanced Frontend', status: hasTabInterface });
    } else {
      console.log('❌ Enhanced frontend page not found');
      allChecks.push({ name: 'Enhanced Frontend', status: false });
    }

    // Check 4: Backend Routes
    console.log('\n4. 🔧 BACKEND ROUTES CHECK');
    console.log('-'.repeat(35));

    const routesPath = path.join(__dirname, 'src/routes/assessmentTemplateRoutes.enhanced.js');
    const controllerPath = path.join(__dirname, 'src/controllers/assessmentTemplateController.enhanced.js');
    
    const routesExist = fs.existsSync(routesPath);
    const controllerExists = fs.existsSync(controllerPath);
    
    console.log(`${routesExist ? '✅' : '❌'} Enhanced routes: ${routesExist ? 'Present' : 'Missing'}`);
    console.log(`${controllerExists ? '✅' : '❌'} Enhanced controller: ${controllerExists ? 'Present' : 'Missing'}`);
    
    allChecks.push({ name: 'Backend Routes', status: routesExist && controllerExists });

    // Check 5: Route Registration
    console.log('\n5. 🔗 ROUTE REGISTRATION CHECK');
    console.log('-'.repeat(35));

    const indexPath = path.join(__dirname, 'index.js');
    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      const routesRegistered = indexContent.includes('assessment-templates-v2');
      
      console.log(`${routesRegistered ? '✅' : '❌'} Enhanced routes registered: ${routesRegistered ? 'Yes' : 'No'}`);
      allChecks.push({ name: 'Route Registration', status: routesRegistered });
    } else {
      console.log('❌ Main server file not found');
      allChecks.push({ name: 'Route Registration', status: false });
    }

    // Check 6: Data Validation
    console.log('\n6. 📋 DATA VALIDATION CHECK');
    console.log('-'.repeat(35));

    const allTemplates = await prisma.assessmentTemplate.findMany();
    const standardizedTemplates = allTemplates.filter(t => t.isStandardized === true);
    
    console.log(`📊 Total templates: ${allTemplates.length}`);
    console.log(`🏆 Standardized templates: ${standardizedTemplates.length}`);
    console.log(`🛠️  Custom templates: ${allTemplates.length - standardizedTemplates.length}`);
    
    const hasStandardizedData = standardizedTemplates.length > 0;
    allChecks.push({ name: 'Standardized Data', status: hasStandardizedData });

    // Summary
    console.log('\n📋 VALIDATION SUMMARY');
    console.log('=' .repeat(65));

    const passedChecks = allChecks.filter(check => check.status).length;
    const totalChecks = allChecks.length;

    allChecks.forEach(check => {
      console.log(`${check.status ? '✅' : '❌'} ${check.name}`);
    });

    console.log(`\n📊 Overall Status: ${passedChecks}/${totalChecks} checks passed`);

    if (passedChecks === totalChecks) {
      console.log('\n🎉 IMPLEMENTATION COMPLETE!');
      console.log('✅ All components are properly implemented');
      console.log('✅ System is ready for enhanced assessment templates');
      console.log('\n🚀 Next Steps:');
      console.log('   1. Start the server: npm run start:all');
      console.log('   2. Navigate to enhanced assessment templates page');
      console.log('   3. Test the tabbed interface');
    } else {
      console.log('\n⚠️  IMPLEMENTATION INCOMPLETE');
      console.log('❌ Some components need attention');
      console.log('\n🔧 Recommended Actions:');
      
      allChecks.forEach(check => {
        if (!check.status) {
          switch (check.name) {
            case 'Database Schema':
              console.log('   • Run: node enhance-assessment-templates-final.js');
              break;
            case 'Standardized Data':
              console.log('   • Run: node create-standardized-assessment-templates.js');
              break;
            case 'Enhanced API':
              console.log('   • Update frontend/src/services/api.js with enhanced endpoints');
              break;
            case 'Enhanced Frontend':
              console.log('   • Create AssessmentTemplatesEnhanced.jsx component');
              break;
            case 'Backend Routes':
              console.log('   • Create enhanced routes and controller files');
              break;
            case 'Route Registration':
              console.log('   • Register enhanced routes in index.js');
              break;
          }
        }
      });
    }

  } catch (error) {
    console.error('❌ Validation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
if (require.main === module) {
  validateImplementation()
    .catch(console.error)
    .finally(() => process.exit());
}

module.exports = { validateImplementation };