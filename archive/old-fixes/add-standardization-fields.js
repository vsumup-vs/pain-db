const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addStandardizationFields() {
  console.log('🔧 Adding Standardization Fields to Database Schema');
  console.log('==================================================\n');

  try {
    // Note: These would normally be done via Prisma migrations
    // For now, we'll use raw SQL to add the missing columns
    
    console.log('📋 Step 1: Adding fields to MetricDefinition...');
    await prisma.$executeRaw`
      ALTER TABLE metric_definitions 
      ADD COLUMN IF NOT EXISTS is_standardized BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS standard_coding JSONB,
      ADD COLUMN IF NOT EXISTS validation_info JSONB;
    `;
    console.log('   ✅ MetricDefinition fields added');

    console.log('📋 Step 2: Adding fields to AssessmentTemplate...');
    await prisma.$executeRaw`
      ALTER TABLE assessment_templates 
      ADD COLUMN IF NOT EXISTS is_standardized BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS standard_coding JSONB,
      ADD COLUMN IF NOT EXISTS validation_info JSONB,
      ADD COLUMN IF NOT EXISTS scoring_info JSONB,
      ADD COLUMN IF NOT EXISTS copyright_info TEXT,
      ADD COLUMN IF NOT EXISTS clinical_use TEXT;
    `;
    console.log('   ✅ AssessmentTemplate fields added');

    console.log('📋 Step 3: Adding fields to ConditionPreset...');
    await prisma.$executeRaw`
      ALTER TABLE condition_presets 
      ADD COLUMN IF NOT EXISTS is_standardized BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS standard_coding JSONB,
      ADD COLUMN IF NOT EXISTS clinical_guidelines JSONB;
    `;
    console.log('   ✅ ConditionPreset fields added');

    console.log('📋 Step 4: Adding fields to AlertRule...');
    await prisma.$executeRaw`
      ALTER TABLE alert_rules 
      ADD COLUMN IF NOT EXISTS is_standardized BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
      ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS standard_coding JSONB,
      ADD COLUMN IF NOT EXISTS clinical_evidence JSONB;
    `;
    console.log('   ✅ AlertRule fields added');

    console.log('\n🎯 Step 5: Updating existing standardized content...');
    
    // Mark known standardized assessment templates
    const standardizedTemplateNames = [
      'Brief Pain Inventory (BPI)',
      'Patient Health Questionnaire-9 (PHQ-9)', 
      'Generalized Anxiety Disorder-7 (GAD-7)',
      'Fibromyalgia Impact Questionnaire (FIQ)',
      'Summary of Diabetes Self-Care Activities (SDSCA)'
    ];

    for (const templateName of standardizedTemplateNames) {
      await prisma.$executeRaw`
        UPDATE assessment_templates 
        SET is_standardized = true,
            category = CASE 
              WHEN name LIKE '%Pain%' OR name LIKE '%BPI%' THEN 'Pain Management'
              WHEN name LIKE '%PHQ%' OR name LIKE '%GAD%' THEN 'Mental Health'
              WHEN name LIKE '%Fibromyalgia%' OR name LIKE '%FIQ%' THEN 'Fibromyalgia'
              WHEN name LIKE '%Diabetes%' OR name LIKE '%SDSCA%' THEN 'Diabetes'
              ELSE 'General'
            END
        WHERE name = ${templateName};
      `;
    }

    // Mark standardized condition presets
    const standardizedPresetNames = [
      'Chronic Pain Management',
      'Diabetes Type 2 Management', 
      'Fibromyalgia Care Protocol',
      'Depression and Anxiety Care',
      'Hypertension Management'
    ];

    for (const presetName of standardizedPresetNames) {
      await prisma.$executeRaw`
        UPDATE condition_presets 
        SET is_standardized = true,
            category = CASE 
              WHEN name LIKE '%Pain%' THEN 'Pain Management'
              WHEN name LIKE '%Diabetes%' THEN 'Diabetes'
              WHEN name LIKE '%Fibromyalgia%' THEN 'Fibromyalgia'
              WHEN name LIKE '%Depression%' OR name LIKE '%Anxiety%' THEN 'Mental Health'
              WHEN name LIKE '%Hypertension%' THEN 'Cardiovascular'
              ELSE 'General'
            END
        WHERE name = ${presetName};
      `;
    }

    console.log('   ✅ Standardized content marked');

    console.log('\n🔍 Step 6: Verifying changes...');
    
    const standardizedTemplates = await prisma.assessmentTemplate.count({
      where: { isStandardized: true }
    });
    
    const standardizedPresets = await prisma.conditionPreset.count({
      where: { isStandardized: true }
    });

    console.log(`   📊 Standardized Templates: ${standardizedTemplates}`);
    console.log(`   📊 Standardized Presets: ${standardizedPresets}`);

    console.log('\n✅ Standardization fields successfully added!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Update Prisma schema file with new fields');
    console.log('   2. Run: npx prisma generate');
    console.log('   3. Update controllers to use standardization fields');
    console.log('   4. Test the standardized vs custom endpoints');

  } catch (error) {
    console.error('❌ Error adding standardization fields:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  addStandardizationFields()
    .then(() => {
      console.log('\n🎉 Standardization setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { addStandardizationFields };