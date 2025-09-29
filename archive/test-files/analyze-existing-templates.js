const { PrismaClient } = require('./generated/prisma');
const { standardizedAssessmentTemplates } = require('./create-standardized-assessment-templates.js');

const prisma = new PrismaClient();

async function analyzeExistingTemplates() {
  console.log('🔍 Analyzing Existing Assessment Templates');
  console.log('==========================================\n');

  try {
    // Get all existing templates with their items
    const existingTemplates = await prisma.assessmentTemplate.findMany({
      include: {
        items: {
          include: {
            metricDefinition: {
              select: {
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

    console.log(`📊 Found ${existingTemplates.length} existing templates\n`);

    // Separate standardized and custom templates
    const standardizedTemplates = existingTemplates.filter(t => t.isStandardized === true);
    const customTemplates = existingTemplates.filter(t => t.isStandardized !== true);

    console.log(`🏆 Standardized templates: ${standardizedTemplates.length}`);
    console.log(`🛠️  Custom templates: ${customTemplates.length}\n`);

    if (standardizedTemplates.length > 0) {
      console.log('🏆 STANDARDIZED TEMPLATES:');
      standardizedTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name}`);
        console.log(`      📂 Category: ${template.category || 'Not set'}`);
        console.log(`      📝 Items: ${template.items.length}`);
        console.log(`      🏥 Clinical Use: ${template.clinicalUse || 'Not specified'}`);
        console.log('');
      });
    }

    if (customTemplates.length > 0) {
      console.log('🛠️  CUSTOM TEMPLATES:');
      customTemplates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name}`);
        console.log(`      📂 Category: ${template.category || 'Not set'}`);
        console.log(`      📝 Items: ${template.items.length}`);
        console.log(`      🏥 Clinical Use: ${template.clinicalUse || 'Not specified'}`);
        
        // Show first few metric keys for analysis
        const metricKeys = template.items.map(item => item.metricDefinition?.key).filter(Boolean);
        if (metricKeys.length > 0) {
          console.log(`      🔑 Sample metrics: ${metricKeys.slice(0, 3).join(', ')}${metricKeys.length > 3 ? '...' : ''}`);
        }
        console.log('');
      });
    }

    // Now analyze if any custom templates match standardized ones
    console.log('🔍 ANALYZING FOR POTENTIAL STANDARDIZED TEMPLATES:');
    console.log('==================================================\n');

    const standardizedNames = standardizedAssessmentTemplates.map(t => t.name.toLowerCase());
    const potentialMatches = [];

    for (const customTemplate of customTemplates) {
      const templateName = customTemplate.name.toLowerCase();
      
      // Check for exact name matches
      const exactMatch = standardizedNames.find(stdName => stdName === templateName);
      if (exactMatch) {
        potentialMatches.push({
          template: customTemplate,
          matchType: 'exact',
          standardizedName: standardizedAssessmentTemplates.find(t => t.name.toLowerCase() === exactMatch).name
        });
        continue;
      }

      // Check for partial name matches (common abbreviations)
      const partialMatches = [];
      
      // BPI variations
      if (templateName.includes('bpi') || templateName.includes('brief pain inventory')) {
        partialMatches.push('Brief Pain Inventory (BPI)');
      }
      
      // PHQ-9 variations
      if (templateName.includes('phq') || templateName.includes('patient health questionnaire')) {
        partialMatches.push('Patient Health Questionnaire-9 (PHQ-9)');
      }
      
      // GAD-7 variations
      if (templateName.includes('gad') || templateName.includes('generalized anxiety')) {
        partialMatches.push('Generalized Anxiety Disorder-7 (GAD-7)');
      }
      
      // FIQ variations
      if (templateName.includes('fiq') || templateName.includes('fibromyalgia impact')) {
        partialMatches.push('Fibromyalgia Impact Questionnaire (FIQ)');
      }
      
      // SDSCA variations
      if (templateName.includes('sdsca') || templateName.includes('diabetes self-care') || templateName.includes('self-care activities')) {
        partialMatches.push('Summary of Diabetes Self-Care Activities (SDSCA)');
      }

      if (partialMatches.length > 0) {
        potentialMatches.push({
          template: customTemplate,
          matchType: 'partial',
          possibleStandardized: partialMatches
        });
      }

      // Check for metric key patterns
      const metricKeys = customTemplate.items.map(item => item.metricDefinition?.key).filter(Boolean);
      const metricPatterns = [];

      // BPI metric patterns
      if (metricKeys.some(key => key.includes('pain_severity') || key.includes('pain_interference'))) {
        metricPatterns.push('Brief Pain Inventory (BPI)');
      }

      // PHQ-9 metric patterns
      if (metricKeys.some(key => key.includes('phq9') || key.includes('depression'))) {
        metricPatterns.push('Patient Health Questionnaire-9 (PHQ-9)');
      }

      // GAD-7 metric patterns
      if (metricKeys.some(key => key.includes('gad7') || key.includes('anxiety'))) {
        metricPatterns.push('Generalized Anxiety Disorder-7 (GAD-7)');
      }

      // FIQ metric patterns
      if (metricKeys.some(key => key.includes('fiq') || key.includes('fibromyalgia'))) {
        metricPatterns.push('Fibromyalgia Impact Questionnaire (FIQ)');
      }

      // SDSCA metric patterns
      if (metricKeys.some(key => key.includes('sdsca') || key.includes('diabetes') || key.includes('self_care'))) {
        metricPatterns.push('Summary of Diabetes Self-Care Activities (SDSCA)');
      }

      if (metricPatterns.length > 0 && partialMatches.length === 0) {
        potentialMatches.push({
          template: customTemplate,
          matchType: 'metric_pattern',
          possibleStandardized: metricPatterns
        });
      }
    }

    // Report findings
    if (potentialMatches.length === 0) {
      console.log('✅ No custom templates appear to be standardized instruments.');
      console.log('   All custom templates seem to be truly custom assessments.\n');
    } else {
      console.log(`🎯 Found ${potentialMatches.length} potential standardized template(s):\n`);
      
      potentialMatches.forEach((match, index) => {
        console.log(`${index + 1}. "${match.template.name}" (ID: ${match.template.id})`);
        console.log(`   📝 Items: ${match.template.items.length}`);
        
        if (match.matchType === 'exact') {
          console.log(`   🎯 EXACT MATCH: Should be "${match.standardizedName}"`);
          console.log(`   ⚠️  This template should be marked as standardized!`);
        } else if (match.matchType === 'partial') {
          console.log(`   🔍 PARTIAL MATCH: Possibly "${match.possibleStandardized.join('" or "')}")`);
          console.log(`   💡 Review this template - it may be a standardized instrument`);
        } else if (match.matchType === 'metric_pattern') {
          console.log(`   🔑 METRIC PATTERN MATCH: Possibly "${match.possibleStandardized.join('" or "')}")`);
          console.log(`   💡 Metric keys suggest this might be a standardized instrument`);
        }
        
        // Show metric keys for analysis
        const metricKeys = match.template.items.map(item => item.metricDefinition?.key).filter(Boolean);
        if (metricKeys.length > 0) {
          console.log(`   🔑 Metric keys: ${metricKeys.join(', ')}`);
        }
        console.log('');
      });

      // Provide recommendations
      console.log('📋 RECOMMENDATIONS:');
      console.log('===================\n');
      
      const exactMatches = potentialMatches.filter(m => m.matchType === 'exact');
      if (exactMatches.length > 0) {
        console.log('🚨 IMMEDIATE ACTION REQUIRED:');
        exactMatches.forEach(match => {
          console.log(`   • Update "${match.template.name}" to set isStandardized = true`);
        });
        console.log('');
      }

      const reviewMatches = potentialMatches.filter(m => m.matchType !== 'exact');
      if (reviewMatches.length > 0) {
        console.log('🔍 MANUAL REVIEW RECOMMENDED:');
        reviewMatches.forEach(match => {
          console.log(`   • Review "${match.template.name}" - may be a standardized instrument`);
        });
        console.log('');
      }
    }

    // Summary
    console.log('📊 SUMMARY:');
    console.log('===========');
    console.log(`Total templates: ${existingTemplates.length}`);
    console.log(`Standardized: ${standardizedTemplates.length}`);
    console.log(`Custom: ${customTemplates.length}`);
    console.log(`Potential standardized (misclassified): ${potentialMatches.length}`);
    
    if (potentialMatches.length > 0) {
      console.log('\n💡 Next steps:');
      console.log('1. Review the identified templates above');
      console.log('2. For exact matches, update isStandardized flag');
      console.log('3. For partial/pattern matches, verify against clinical standards');
      console.log('4. Run comprehensive-standardized-setup.js to add missing standardized templates');
    }

  } catch (error) {
    console.error('❌ Error analyzing templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  analyzeExistingTemplates().catch(console.error);
}

module.exports = { analyzeExistingTemplates };