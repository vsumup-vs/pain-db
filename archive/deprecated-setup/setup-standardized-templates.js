const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// Standardized template definitions with isStandardized flag
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

async function setupStandardizedTemplates() {
  try {
    console.log('🚀 Setting up standardized assessment templates...');
    
    for (const template of standardizedTemplates) {
      // Check if template exists
      const existing = await prisma.assessmentTemplate.findFirst({
        where: { name: template.name }
      });
      
      if (existing) {
        // Update existing template to mark as standardized
        await prisma.assessmentTemplate.update({
          where: { id: existing.id },
          data: {
            isStandardized: true,
            standardizedVersion: template.standardizedVersion,
            validationStatus: template.validationStatus,
            category: template.category
          }
        });
        console.log(`   ✅ Updated existing: ${template.name}`);
      } else {
        // Create new standardized template
        await prisma.assessmentTemplate.create({
          data: template
        });
        console.log(`   ➕ Created new: ${template.name}`);
      }
    }
    
    // Verify results
    const totalTemplates = await prisma.assessmentTemplate.count();
    const standardizedTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    const customTemplates = totalTemplates - standardizedTemplates;
    
    console.log('\n📊 Final Status:');
    console.log(`   📋 Total templates: ${totalTemplates}`);
    console.log(`   🏆 Standardized templates: ${standardizedTemplates}`);
    console.log(`   🛠️  Custom templates: ${customTemplates}`);
    
    if (standardizedTemplates >= 5) {
      console.log('\n🎉 Success! All standardized templates are properly configured.');
    }
    
  } catch (error) {
    console.error('❌ Error setting up templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupStandardizedTemplates();