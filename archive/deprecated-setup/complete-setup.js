const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function completeSetup() {
  try {
    console.log('🚀 Complete Standardized Template Setup');
    console.log('=====================================');
    
    // Step 1: Check current status
    console.log('\n📊 Step 1: Current Status');
    const currentTemplates = await prisma.assessmentTemplate.findMany({
      select: { name: true, isStandardized: true }
    });
    
    console.log(`Found ${currentTemplates.length} existing templates:`);
    currentTemplates.forEach(t => {
      console.log(`   ${t.isStandardized ? '🏆' : '🛠️'} ${t.name}`);
    });
    
    // Step 2: Add missing standardized templates
    console.log('\n➕ Step 2: Adding Missing Standardized Templates');
    
    const standardizedTemplates = [
      {
        name: 'Brief Pain Inventory (BPI)',
        description: 'Validated pain assessment tool measuring pain severity and interference',
        category: 'pain_management',
        isStandardized: true,
        standardizedVersion: '1.0',
        validationStatus: 'validated'
      },
      {
        name: 'Patient Health Questionnaire-9 (PHQ-9)',
        description: 'Validated depression screening and severity assessment tool',
        category: 'mental_health',
        isStandardized: true,
        standardizedVersion: '1.0',
        validationStatus: 'validated'
      },
      {
        name: 'Generalized Anxiety Disorder-7 (GAD-7)',
        description: 'Validated anxiety screening and severity assessment tool',
        category: 'mental_health',
        isStandardized: true,
        standardizedVersion: '1.0',
        validationStatus: 'validated'
      },
      {
        name: 'Fibromyalgia Impact Questionnaire (FIQ)',
        description: 'Disease-specific validated assessment for fibromyalgia impact',
        category: 'fibromyalgia',
        isStandardized: true,
        standardizedVersion: '1.0',
        validationStatus: 'validated'
      },
      {
        name: 'Summary of Diabetes Self-Care Activities (SDSCA)',
        description: 'Validated diabetes self-management assessment tool',
        category: 'diabetes',
        isStandardized: true,
        standardizedVersion: '1.0',
        validationStatus: 'validated'
      }
    ];
    
    for (const template of standardizedTemplates) {
      const existing = await prisma.assessmentTemplate.findFirst({
        where: { name: template.name }
      });
      
      if (!existing) {
        await prisma.assessmentTemplate.create({
          data: template
        });
        console.log(`   ✅ Created: ${template.name}`);
      } else {
        console.log(`   ⏭️  Already exists: ${template.name}`);
      }
    }
    
    // Step 3: Final verification
    console.log('\n🔍 Step 3: Final Verification');
    
    const finalTemplates = await prisma.assessmentTemplate.findMany({
      select: { name: true, isStandardized: true, category: true }
    });
    
    const totalCount = finalTemplates.length;
    const standardizedCount = finalTemplates.filter(t => t.isStandardized).length;
    const customCount = totalCount - standardizedCount;
    
    console.log(`📋 Total templates: ${totalCount}`);
    console.log(`🏆 Standardized templates: ${standardizedCount}`);
    console.log(`🛠️  Custom templates: ${customCount}`);
    
    console.log('\nStandardized templates:');
    finalTemplates
      .filter(t => t.isStandardized)
      .forEach(t => console.log(`   ✅ ${t.name} (${t.category})`));
    
    console.log('\nCustom templates:');
    finalTemplates
      .filter(t => !t.isStandardized)
      .forEach(t => console.log(`   🛠️  ${t.name} (${t.category || 'no category'})`));
    
    // Step 4: Test API endpoints (if server is running)
    console.log('\n🌐 Step 4: Testing API Endpoints');
    try {
      const fetch = require('node-fetch');
      
      // Test basic endpoint
      const response = await fetch('http://localhost:3000/api/assessment-templates');
      if (response.ok) {
        console.log('   ✅ Basic API endpoint working');
        
        // Test enhanced endpoints
        const enhancedResponse = await fetch('http://localhost:3000/api/assessment-templates-v2');
        if (enhancedResponse.ok) {
          console.log('   ✅ Enhanced API endpoint working');
        } else {
          console.log('   ⚠️  Enhanced API endpoint not responding');
        }
      } else {
        console.log('   ⚠️  API endpoints not responding (server may not be running)');
      }
    } catch (error) {
      console.log('   ⚠️  Cannot test API endpoints (server not running or fetch not available)');
    }
    
    console.log('\n🎉 Setup Complete!');
    
    if (standardizedCount >= 5) {
      console.log('✅ All expected standardized templates are present');
    } else {
      console.log('⚠️  Some standardized templates may be missing');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

completeSetup();