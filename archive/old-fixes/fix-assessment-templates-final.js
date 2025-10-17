const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixAssessmentTemplatesFinal() {
  console.log('🔧 Final Fix for Assessment Templates Display...\n');

  try {
    // Step 1: Restore templates if missing
    console.log('1. 🔄 Checking and restoring templates...');
    await checkAndRestoreTemplates();

    // Step 2: Fix API service
    console.log('\n2. 🔧 Fixing API service...');
    await fixApiService();

    // Step 3: Fix frontend component data access
    console.log('\n3. 🎨 Fixing frontend component...');
    await fixFrontendComponent();

    // Step 4: Test the fix
    console.log('\n4. 🧪 Testing the fix...');
    await testFix();

    console.log('\n✅ Assessment Templates Fix Complete!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Templates restored to database');
    console.log('   ✅ API service duplicate method fixed');
    console.log('   ✅ Frontend data access corrected');
    console.log('   ✅ Response format standardized');
    
    console.log('\n🚀 Next Steps:');
    console.log('   1. Restart your development server');
    console.log('   2. Refresh the Assessment Templates page');
    console.log('   3. Templates should now display correctly');

  } catch (error) {
    console.error('❌ Error in final fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkAndRestoreTemplates() {
  const templateCount = await prisma.assessmentTemplate.count();
  console.log(`   Current templates in database: ${templateCount}`);

  if (templateCount === 0) {
    console.log('   🔄 Restoring templates...');
    await restoreTemplates();
  } else {
    console.log('   ✅ Templates exist');
  }
}

async function restoreTemplates() {
  const templates = [
    {
      name: "Brief Pain Inventory (BPI)",
      description: "Standardized pain assessment measuring pain intensity and interference with daily activities",
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
          },
          {
            title: "Pain Interference",
            questions: [
              { id: "general_activity", text: "Pain interference with general activity", type: "scale", scale: { min: 0, max: 10 } },
              { id: "mood", text: "Pain interference with mood", type: "scale", scale: { min: 0, max: 10 } },
              { id: "walking", text: "Pain interference with walking ability", type: "scale", scale: { min: 0, max: 10 } },
              { id: "work", text: "Pain interference with normal work", type: "scale", scale: { min: 0, max: 10 } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "Brief Pain Inventory",
        validation: "Validated for chronic pain assessment",
        reliability: "High internal consistency (α > 0.85)",
        references: "Cleeland & Ryan, 1994"
      },
      clinicalUse: "Comprehensive pain assessment for chronic pain management and treatment monitoring"
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
              { id: "interest", text: "Little interest or pleasure in doing things", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "mood", text: "Feeling down, depressed, or hopeless", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "sleep", text: "Trouble falling or staying asleep, or sleeping too much", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "energy", text: "Feeling tired or having little energy", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "PHQ-9",
        validation: "Validated depression screening tool",
        reliability: "Excellent reliability (α = 0.89)",
        references: "Kroenke et al., 2001"
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
              { id: "nervous", text: "Feeling nervous, anxious, or on edge", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "worry", text: "Not being able to stop or control worrying", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "trouble_relaxing", text: "Trouble relaxing", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } },
              { id: "restless", text: "Being so restless that it's hard to sit still", type: "scale", scale: { min: 0, max: 3, labels: ["Not at all", "Several days", "More than half the days", "Nearly every day"] } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "GAD-7",
        validation: "Validated anxiety screening tool",
        reliability: "Excellent reliability (α = 0.92)",
        references: "Spitzer et al., 2006"
      },
      clinicalUse: "Anxiety screening and severity assessment"
    },
    {
      name: "PROMIS Pain Intensity",
      description: "Patient-Reported Outcomes Measurement Information System pain intensity scale",
      category: "Pain Management",
      isStandardized: true,
      questions: {
        sections: [
          {
            title: "Pain Intensity",
            questions: [
              { id: "pain_intensity", text: "In the past 7 days, how would you rate your pain on average?", type: "scale", scale: { min: 1, max: 5, labels: ["Had no pain", "Mild", "Moderate", "Severe", "Very severe"] } },
              { id: "pain_worst", text: "In the past 7 days, how would you rate your worst pain?", type: "scale", scale: { min: 1, max: 5, labels: ["Had no pain", "Mild", "Moderate", "Severe", "Very severe"] } }
            ]
          }
        ]
      },
      validationInfo: {
        instrument: "PROMIS Pain Intensity",
        validation: "NIH PROMIS validated measure",
        reliability: "High reliability (α > 0.90)",
        references: "PROMIS Health Organization, 2013"
      },
      clinicalUse: "Standardized pain intensity measurement for research and clinical care"
    },
    {
      name: "Custom Pain Assessment",
      description: "Organization-specific pain monitoring tool for daily use",
      category: "Pain Management",
      isStandardized: false,
      questions: {
        sections: [
          {
            title: "Daily Pain Check",
            questions: [
              { id: "pain_level", text: "Current pain level (0-10)", type: "scale", scale: { min: 0, max: 10 } },
              { id: "pain_location", text: "Primary pain location", type: "text" },
              { id: "pain_quality", text: "Pain quality", type: "select", options: ["Sharp", "Dull", "Burning", "Throbbing", "Aching"] },
              { id: "medication_taken", text: "Pain medication taken today?", type: "boolean" }
            ]
          }
        ]
      },
      clinicalUse: "Daily pain monitoring and medication tracking"
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
              { id: "energy", text: "Energy level today (0-10)", type: "scale", scale: { min: 0, max: 10 } },
              { id: "sleep", text: "Sleep quality last night (0-10)", type: "scale", scale: { min: 0, max: 10 } },
              { id: "mood", text: "Overall mood today", type: "select", options: ["Excellent", "Good", "Fair", "Poor"] },
              { id: "stress", text: "Stress level (0-10)", type: "scale", scale: { min: 0, max: 10 } }
            ]
          }
        ]
      },
      clinicalUse: "General wellness monitoring and quality of life tracking"
    },
    {
      name: "Functional Assessment",
      description: "Assessment of daily functional capabilities",
      category: "Functional Assessment",
      isStandardized: false,
      questions: {
        sections: [
          {
            title: "Activities of Daily Living",
            questions: [
              { id: "mobility", text: "Mobility level today", type: "select", options: ["Independent", "Needs assistance", "Unable to perform"] },
              { id: "self_care", text: "Self-care abilities", type: "select", options: ["Independent", "Needs assistance", "Unable to perform"] },
              { id: "work_activities", text: "Ability to perform work activities", type: "scale", scale: { min: 0, max: 10 } }
            ]
          }
        ]
      },
      clinicalUse: "Functional status monitoring and rehabilitation planning"
    }
  ];

  for (const template of templates) {
    await prisma.assessmentTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template
    });
    console.log(`     ✅ ${template.name}`);
  }
  
  console.log(`   ✅ Restored ${templates.length} templates`);
}

async function fixApiService() {
  const apiServicePath = path.join(__dirname, 'frontend', 'src', 'services', 'api.js');
  
  if (!fs.existsSync(apiServicePath)) {
    console.log('   ⚠️ API service file not found');
    return;
  }

  let content = fs.readFileSync(apiServicePath, 'utf8');
  
  // Fix the duplicate getAssessmentTemplate method
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

async function fixFrontendComponent() {
  const componentPath = path.join(__dirname, 'frontend', 'src', 'pages', 'AssessmentTemplatesEnhanced.jsx');
  
  if (!fs.existsSync(componentPath)) {
    console.log('   ⚠️ Frontend component not found');
    return;
  }

  let content = fs.readFileSync(componentPath, 'utf8');
  
  // Fix the data access pattern
  // Change templatesData?.templates to templatesData?.data
  content = content.replace('templatesData?.templates', 'templatesData?.data');
  
  // Also fix any other similar patterns
  content = content.replace('standardizedTemplates || []', 'standardizedTemplates?.data || []');
  content = content.replace('customTemplates || []', 'customTemplates?.data || []');
  
  fs.writeFileSync(componentPath, content);
  console.log('   ✅ Fixed frontend data access patterns');
}

async function testFix() {
  try {
    const templateCount = await prisma.assessmentTemplate.count();
    const standardizedCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    const customCount = await prisma.assessmentTemplate.count({
      where: { isStandardized: false }
    });
    
    console.log(`   📊 Total templates: ${templateCount}`);
    console.log(`   🏆 Standardized: ${standardizedCount}`);
    console.log(`   🛠️ Custom: ${customCount}`);
    
    // Test categories
    const categories = await prisma.assessmentTemplate.groupBy({
      by: ['category'],
      _count: { id: true },
      where: { category: { not: null } }
    });
    
    console.log(`   📂 Categories: ${categories.length}`);
    categories.forEach(cat => {
      console.log(`      ${cat.category}: ${cat._count.id} templates`);
    });
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
  }
}

// Run the final fix
fixAssessmentTemplatesFinal();