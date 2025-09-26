const { PrismaClient } = require('./generated/prisma');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Enhanced Assessment Template System
// Supports both standardized (validated) and custom (non-standardized) templates

async function enhanceAssessmentTemplateSystem() {
  console.log('🏥 Enhancing Assessment Template System...\n');
  console.log('📋 Adding support for standardized vs. custom assessment templates\n');

  try {
    // Step 1: Add standardization fields to schema
    console.log('📊 Step 1: Updating database schema...');
    
    // Execute each SQL command separately to avoid the multiple commands error
    const sqlCommands = [
      // Add new columns
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS is_standardized BOOLEAN DEFAULT FALSE`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS validation_info JSONB`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS standard_coding JSONB`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS scoring_info JSONB`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS copyright_info TEXT`,
      
      `ALTER TABLE assessment_templates 
       ADD COLUMN IF NOT EXISTS clinical_use TEXT`,
      
      // Add indexes
      `CREATE INDEX IF NOT EXISTS idx_assessment_templates_standardized 
       ON assessment_templates(is_standardized)`,
      
      `CREATE INDEX IF NOT EXISTS idx_assessment_templates_category 
       ON assessment_templates(category)`,
      
      // Update existing standardized templates
      `UPDATE assessment_templates 
       SET is_standardized = TRUE,
           category = CASE 
             WHEN name LIKE '%Pain%' OR name LIKE '%BPI%' THEN 'pain_management'
             WHEN name LIKE '%PHQ%' OR name LIKE '%Depression%' THEN 'mental_health'
             WHEN name LIKE '%GAD%' OR name LIKE '%Anxiety%' THEN 'mental_health'
             WHEN name LIKE '%Fibromyalgia%' OR name LIKE '%FIQ%' THEN 'fibromyalgia'
             WHEN name LIKE '%Diabetes%' OR name LIKE '%SDSCA%' THEN 'diabetes'
             ELSE 'general'
           END
       WHERE name IN (
         'Brief Pain Inventory (BPI)',
         'Patient Health Questionnaire-9 (PHQ-9)',
         'Generalized Anxiety Disorder-7 (GAD-7)',
         'Fibromyalgia Impact Questionnaire (FIQ)',
         'Summary of Diabetes Self-Care Activities (SDSCA)'
       )`
    ];

    // Execute each command separately
    for (let i = 0; i < sqlCommands.length; i++) {
      try {
        await prisma.$executeRawUnsafe(sqlCommands[i]);
        console.log(`   ✅ Executed SQL command ${i + 1}/${sqlCommands.length}`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log(`   ⚠️  SQL command ${i + 1} skipped (already exists)`);
        } else {
          throw error;
        }
      }
    }
    
    console.log('   ✅ Database schema updated successfully');

    // Step 2: Update existing standardized templates with validation info
    console.log('\n📋 Step 2: Updating existing standardized templates...');
    
    const standardizedTemplateUpdates = [
      {
        name: 'Brief Pain Inventory (BPI)',
        updates: {
          isStandardized: true,
          category: 'pain_management',
          validationInfo: {
            instrument: 'Brief Pain Inventory',
            developer: 'Charles Cleeland, MD',
            validation: 'Validated across multiple pain conditions',
            clinicalUse: 'Chronic pain, cancer pain, arthritis'
          },
          standardCoding: {
            loinc: '72514-3',
            snomed: '22253000',
            icd10: 'R52'
          },
          clinicalUse: 'Comprehensive pain assessment measuring severity and interference'
        }
      },
      {
        name: 'Patient Health Questionnaire-9 (PHQ-9)',
        updates: {
          isStandardized: true,
          category: 'mental_health',
          validationInfo: {
            instrument: 'PHQ-9',
            developer: 'Pfizer Inc.',
            validation: 'Validated for depression screening and monitoring',
            sensitivity: '88%',
            specificity: '88%',
            clinicalUse: 'Depression screening, severity assessment, treatment monitoring'
          },
          standardCoding: {
            loinc: '44249-1',
            snomed: '273724008',
            icd10: 'Z13.89'
          },
          scoringInfo: {
            totalScore: {
              range: '0-27',
              interpretation: {
                '0-4': 'Minimal depression',
                '5-9': 'Mild depression',
                '10-14': 'Moderate depression',
                '15-19': 'Moderately severe depression',
                '20-27': 'Severe depression'
              }
            }
          }
        }
      },
      {
        name: 'Generalized Anxiety Disorder-7 (GAD-7)',
        updates: {
          isStandardized: true,
          category: 'mental_health',
          validationInfo: {
            instrument: 'GAD-7',
            developer: 'Pfizer Inc.',
            validation: 'Validated for anxiety screening and monitoring',
            sensitivity: '89%',
            specificity: '82%',
            clinicalUse: 'Anxiety screening, severity assessment, treatment monitoring'
          },
          standardCoding: {
            loinc: '69737-5',
            snomed: '273724008',
            icd10: 'Z13.89'
          },
          scoringInfo: {
            totalScore: {
              range: '0-21',
              interpretation: {
                '0-4': 'Minimal anxiety',
                '5-9': 'Mild anxiety',
                '10-14': 'Moderate anxiety',
                '15-21': 'Severe anxiety'
              }
            }
          }
        }
      },
      {
        name: 'Fibromyalgia Impact Questionnaire (FIQ)',
        updates: {
          isStandardized: true,
          category: 'fibromyalgia',
          validationInfo: {
            instrument: 'FIQ',
            developer: 'Bennett et al.',
            validation: 'Validated for fibromyalgia impact assessment',
            clinicalUse: 'Fibromyalgia severity and functional impact assessment'
          },
          standardCoding: {
            loinc: '72133-2',
            snomed: '203082005',
            icd10: 'M79.3'
          },
          clinicalUse: 'Fibromyalgia-specific assessment of symptoms and functional impact'
        }
      },
      {
        name: 'Summary of Diabetes Self-Care Activities (SDSCA)',
        updates: {
          isStandardized: true,
          category: 'diabetes',
          validationInfo: {
            instrument: 'SDSCA',
            developer: 'Toobert et al.',
            validation: 'Validated for diabetes self-care monitoring',
            clinicalUse: 'Diabetes self-management monitoring'
          },
          standardCoding: {
            loinc: '33747-0',
            snomed: '182840001',
            icd10: 'Z71.3'
          },
          clinicalUse: 'Diabetes self-care activities assessment and monitoring'
        }
      }
    ];

    for (const templateUpdate of standardizedTemplateUpdates) {
      await prisma.assessmentTemplate.updateMany({
        where: { name: templateUpdate.name },
        data: templateUpdate.updates
      });
      console.log(`   ✅ Updated: ${templateUpdate.name}`);
    }

    console.log('\n🎉 Assessment template enhancement completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database schema updated with standardization fields');
    console.log('   ✅ 5 standardized templates marked and enhanced');
    console.log('   ✅ Categories assigned: pain_management, mental_health, fibromyalgia, diabetes');
    console.log('   ✅ Validation info and clinical coding added');
    
    console.log('\n🔗 Next Steps:');
    console.log('   1. Test the enhanced API endpoints');
    console.log('   2. Start the servers with npm run start:all');
    console.log('   3. Verify the frontend interface shows standardized vs custom filters');

  } catch (error) {
    console.error('❌ Error enhancing assessment template system:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { enhanceAssessmentTemplateSystem };

if (require.main === module) {
  enhanceAssessmentTemplateSystem()
    .catch(console.error)
    .finally(() => process.exit());
}