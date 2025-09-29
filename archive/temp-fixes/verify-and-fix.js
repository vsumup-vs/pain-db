const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

async function verifyAndFix() {
  console.log('🔍 Checking current template status...');
  
  // Get all templates
  const allTemplates = await prisma.assessmentTemplate.findMany({
    select: {
      id: true,
      name: true,
      isStandardized: true,
      category: true
    }
  });
  
  console.log(`📋 Found ${allTemplates.length} total templates:`);
  allTemplates.forEach(t => {
    console.log(`   ${t.isStandardized ? '🏆' : '🛠️'} ${t.name} (${t.isStandardized ? 'standardized' : 'custom'})`);
  });
  
  // List of templates that should be standardized
  const shouldBeStandardized = [
    'Brief Pain Inventory (BPI)',
    'Patient Health Questionnaire-9 (PHQ-9)', 
    'Generalized Anxiety Disorder-7 (GAD-7)',
    'Fibromyalgia Impact Questionnaire (FIQ)',
    'Summary of Diabetes Self-Care Activities (SDSCA)'
  ];
  
  console.log('\n🔧 Fixing standardization flags...');
  
  for (const templateName of shouldBeStandardized) {
    const template = allTemplates.find(t => t.name === templateName);
    
    if (template) {
      if (!template.isStandardized) {
        await prisma.assessmentTemplate.update({
          where: { id: template.id },
          data: { 
            isStandardized: true,
            standardizedVersion: '1.0',
            validationStatus: 'validated'
          }
        });
        console.log(`   ✅ Fixed: ${templateName}`);
      } else {
        console.log(`   ⏭️ Already standardized: ${templateName}`);
      }
    } else {
      console.log(`   ❌ Missing: ${templateName}`);
    }
  }
  
  // Final count
  const finalStandardized = await prisma.assessmentTemplate.count({
    where: { isStandardized: true }
  });
  
  console.log(`\n📊 Final result: ${finalStandardized} standardized templates`);
  
  await prisma.$disconnect();
}

verifyAndFix().catch(console.error);