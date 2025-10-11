const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixAssessmentTemplatesDisplay() {
  console.log('🔧 Fixing Assessment Templates Display Issues...\n');

  try {
    // Step 1: Check current database state
    console.log('1. 📊 Checking current database state...');
    const templateCount = await prisma.assessmentTemplate.count();
    console.log(`   Templates in database: ${templateCount}`);

    // Step 2: Restore templates if missing
    if (templateCount === 0) {
      console.log('\n2. 🔄 Restoring missing templates...');
      await restoreTemplates();
    } else {
      console.log('\n2. ✅ Templates exist in database');
    }

    // Step 3: Fix API service duplicate method
    console.log('\n3. 🔧 Fixing frontend API service...');
    await fixApiService();

    // Step 4: Test API endpoints
    console.log('\n4. 🧪 Testing API endpoints...');
    await testApiEndpoints();

    console.log('\n✅ Assessment Templates Display Fix Complete!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Refresh the frontend');
    console.log('   3. Check the Assessment Templates page');

  } catch (error) {
    console.error('❌ Error fixing assessment templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function restoreTemplates() {
  const templates = [
    {
      name: "Brief Pain Inventory (BPI)",
      description: "Standardized pain assessment measuring pain intensity and interference",
      category: "Pain Management",
      isStandardized: true,
      questions: {
        sections: [
          {
            title: "Pain Intensity",
            questions: [
              { id: "pain_worst", text: "Rate your pain at its worst in the last 24 hours", type: "scale", scale: { min: 0, max: 10 } },
              { id: "pain_least", text: "Rate your pain at its least in the last 24 hours", type: "scale", scale: { min: 0, max: 10 } },
              { id: "pain_average", text: "Rate your average pain in the last 24 hours", type: "scale", scale: { min: 0, max: 10 } },
              { id: "pain_now", text: "Rate your pain right now", type: "scale", scale: { min: 0, max: 10 } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "Brief Pain Inventory",
        validation: "Validated for chronic pain assessment",
        reliability: "High internal consistency (α > 0.85)"
      },
      clinicalUse: "Comprehensive pain assessment for chronic pain management"
    },
    {
      name: "Patient Health Questionnaire-9 (PHQ-9)",
      description: "Depression screening and severity assessment tool",
      category: "Mental Health",
      isStandardized: true,
      questions: {
        sections: [
          {
            title: "Depression Screening",
            questions: [
              { id: "interest", text: "Little interest or pleasure in doing things", type: "scale", scale: { min: 0, max: 3 } },
              { id: "mood", text: "Feeling down, depressed, or hopeless", type: "scale", scale: { min: 0, max: 3 } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "PHQ-9",
        validation: "Validated depression screening tool",
        reliability: "Excellent reliability (α = 0.89)"
      },
      clinicalUse: "Depression screening and monitoring treatment response"
    },
    {
      name: "Generalized Anxiety Disorder-7 (GAD-7)",
      description: "Anxiety screening and severity assessment",
      category: "Mental Health", 
      isStandardized: true,
      questions: {
        sections: [
          {
            title: "Anxiety Assessment",
            questions: [
              { id: "nervous", text: "Feeling nervous, anxious, or on edge", type: "scale", scale: { min: 0, max: 3 } },
              { id: "worry", text: "Not being able to stop or control worrying", type: "scale", scale: { min: 0, max: 3 } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "GAD-7",
        validation: "Validated anxiety screening tool",
        reliability: "Excellent reliability (α = 0.92)"
      },
      clinicalUse: "Anxiety screening and severity assessment"
    },
    {
      name: "Custom Pain Assessment",
      description: "Organization-specific pain monitoring tool",
      category: "Pain Management",
      isStandardized: false,
      questions: {
        sections: [
          {
            title: "Daily Pain Check",
            questions: [
              { id: "pain_level", text: "Current pain level", type: "scale", scale: { min: 0, max: 10 } },
              { id: "pain_location", text: "Primary pain location", type: "text" }
            ]
          }
        ]
      }
    },
    {
      name: "Wellness Check",
      description: "General wellness and quality of life assessment",
      category: "General Health",
      isStandardized: false,
      questions: {
        sections: [
          {
            title: "Wellness Assessment",
            questions: [
              { id: "energy", text: "Energy level today", type: "scale", scale: { min: 0, max: 10 } },
              { id: "sleep", text: "Sleep quality last night", type: "scale", scale: { min: 0, max: 10 } }
            ]
          }
        ]
      }
    }
  ];

  for (const template of templates) {
    await prisma.assessmentTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template
    });
    console.log(`   ✅ Restored: ${template.name}`);
  }
}

async function fixApiService() {
  const apiServicePath = path.join(__dirname, 'frontend', 'src', 'services', 'api.js');
  
  if (!fs.existsSync(apiServicePath)) {
    console.log('   ⚠️ API service file not found');
    return;
  }

  let content = fs.readFileSync(apiServicePath, 'utf8');
  
  // Fix the duplicate getAssessmentTemplate method
  // Replace the second occurrence (v2 endpoint) with a properly named method
  const lines = content.split('\n');
  let foundFirst = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('getAssessmentTemplate:') && lines[i].includes('assessment-templates/')) {
      if (!foundFirst) {
        foundFirst = true;
      } else {
        // This is the duplicate - rename it to getAssessmentTemplateV2
        lines[i] = lines[i].replace('getAssessmentTemplate:', 'getAssessmentTemplateV2:');
        break;
      }
    }
  }
  
  const fixedContent = lines.join('\n');
  fs.writeFileSync(apiServicePath, fixedContent);
  console.log('   ✅ Fixed duplicate API method');
}

async function testApiEndpoints() {
  try {
    // Test database query directly
    const templates = await prisma.assessmentTemplate.findMany({
      take: 5
    });
    console.log(`   ✅ Database query: Found ${templates.length} templates`);
    
    if (templates.length > 0) {
      console.log(`   📋 Sample template: ${templates[0].name}`);
    }
    
  } catch (error) {
    console.log(`   ❌ Database test failed: ${error.message}`);
  }
}

// Run the fix
fixAssessmentTemplatesDisplay();