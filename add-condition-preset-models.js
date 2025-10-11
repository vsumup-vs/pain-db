const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Migration Script: Add ConditionPreset Models
 * 
 * This script adds the missing ConditionPreset models to the database
 * that are required for the RTM standard seed file to work properly.
 */

async function addConditionPresetModels() {
  console.log('🔧 Adding ConditionPreset models to database...');
  
  try {
    // Create the tables using raw SQL since we're adding new models
    await prisma.$executeRaw`
      -- Create condition_presets table
      CREATE TABLE IF NOT EXISTS "condition_presets" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "defaultProtocolId" TEXT,
        "description" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        
        CONSTRAINT "condition_presets_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      -- Create unique constraint on name
      CREATE UNIQUE INDEX IF NOT EXISTS "condition_presets_name_key" ON "condition_presets"("name");
    `;
    
    await prisma.$executeRaw`
      -- Create condition_preset_diagnoses table
      CREATE TABLE IF NOT EXISTS "condition_preset_diagnoses" (
        "id" TEXT NOT NULL,
        "conditionPresetId" TEXT NOT NULL,
        "icd10" TEXT NOT NULL,
        "snomed" TEXT,
        "label" TEXT NOT NULL,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        
        CONSTRAINT "condition_preset_diagnoses_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      -- Create condition_preset_templates table
      CREATE TABLE IF NOT EXISTS "condition_preset_templates" (
        "id" TEXT NOT NULL,
        "conditionPresetId" TEXT NOT NULL,
        "templateId" TEXT NOT NULL,
        "isRequired" BOOLEAN NOT NULL DEFAULT true,
        "frequency" TEXT,
        "displayOrder" INTEGER NOT NULL DEFAULT 0,
        
        CONSTRAINT "condition_preset_templates_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      -- Create unique constraint on conditionPresetId and templateId
      CREATE UNIQUE INDEX IF NOT EXISTS "condition_preset_templates_conditionPresetId_templateId_key" 
      ON "condition_preset_templates"("conditionPresetId", "templateId");
    `;
    
    await prisma.$executeRaw`
      -- Create condition_preset_alert_rules table
      CREATE TABLE IF NOT EXISTS "condition_preset_alert_rules" (
        "id" TEXT NOT NULL,
        "conditionPresetId" TEXT NOT NULL,
        "alertRuleId" TEXT NOT NULL,
        "isEnabled" BOOLEAN NOT NULL DEFAULT true,
        "priority" INTEGER NOT NULL DEFAULT 0,
        
        CONSTRAINT "condition_preset_alert_rules_pkey" PRIMARY KEY ("id")
      );
    `;
    
    await prisma.$executeRaw`
      -- Create unique constraint on conditionPresetId and alertRuleId
      CREATE UNIQUE INDEX IF NOT EXISTS "condition_preset_alert_rules_conditionPresetId_alertRuleId_key" 
      ON "condition_preset_alert_rules"("conditionPresetId", "alertRuleId");
    `;
    
    // Add foreign key constraints using PostgreSQL-compatible syntax
    await prisma.$executeRaw`
      -- Add foreign key constraints for condition_preset_diagnoses
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'condition_preset_diagnoses_conditionPresetId_fkey'
            AND table_name = 'condition_preset_diagnoses'
        ) THEN
          ALTER TABLE "condition_preset_diagnoses" 
          ADD CONSTRAINT "condition_preset_diagnoses_conditionPresetId_fkey" 
          FOREIGN KEY ("conditionPresetId") REFERENCES "condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      -- Add foreign key constraints for condition_preset_templates
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'condition_preset_templates_conditionPresetId_fkey'
            AND table_name = 'condition_preset_templates'
        ) THEN
          ALTER TABLE "condition_preset_templates" 
          ADD CONSTRAINT "condition_preset_templates_conditionPresetId_fkey" 
          FOREIGN KEY ("conditionPresetId") REFERENCES "condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'condition_preset_templates_templateId_fkey'
            AND table_name = 'condition_preset_templates'
        ) THEN
          ALTER TABLE "condition_preset_templates" 
          ADD CONSTRAINT "condition_preset_templates_templateId_fkey" 
          FOREIGN KEY ("templateId") REFERENCES "assessment_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      -- Add foreign key constraints for condition_preset_alert_rules
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'condition_preset_alert_rules_conditionPresetId_fkey'
            AND table_name = 'condition_preset_alert_rules'
        ) THEN
          ALTER TABLE "condition_preset_alert_rules" 
          ADD CONSTRAINT "condition_preset_alert_rules_conditionPresetId_fkey" 
          FOREIGN KEY ("conditionPresetId") REFERENCES "condition_presets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    await prisma.$executeRaw`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'condition_preset_alert_rules_alertRuleId_fkey'
            AND table_name = 'condition_preset_alert_rules'
        ) THEN
          ALTER TABLE "condition_preset_alert_rules" 
          ADD CONSTRAINT "condition_preset_alert_rules_alertRuleId_fkey" 
          FOREIGN KEY ("alertRuleId") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    // Add conditionPresetId to enrollments table
    await prisma.$executeRaw`
      -- Add conditionPresetId column to enrollments table
      ALTER TABLE "enrollments" 
      ADD COLUMN IF NOT EXISTS "conditionPresetId" TEXT;
    `;
    
    await prisma.$executeRaw`
      -- Add foreign key constraint for enrollments
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'enrollments_conditionPresetId_fkey'
            AND table_name = 'enrollments'
        ) THEN
          ALTER TABLE "enrollments" 
          ADD CONSTRAINT "enrollments_conditionPresetId_fkey" 
          FOREIGN KEY ("conditionPresetId") REFERENCES "condition_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `;
    
    // Add isStandardized to assessment_templates table
    await prisma.$executeRaw`
      -- Add isStandardized column to assessment_templates table
      ALTER TABLE "assessment_templates" 
      ADD COLUMN IF NOT EXISTS "isStandardized" BOOLEAN NOT NULL DEFAULT false;
    `;
    
    console.log('✅ ConditionPreset models added successfully!');
    console.log('📋 Tables created:');
    console.log('   • condition_presets');
    console.log('   • condition_preset_diagnoses');
    console.log('   • condition_preset_templates');
    console.log('   • condition_preset_alert_rules');
    console.log('📝 Columns added:');
    console.log('   • enrollments.conditionPresetId');
    console.log('   • assessment_templates.isStandardized');
    
  } catch (error) {
    console.error('❌ Error adding ConditionPreset models:', error);
    throw error;
  }
}

async function main() {
  try {
    await addConditionPresetModels();
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your Prisma schema with the new models');
    console.log('2. Run: npx prisma generate');
    console.log('3. Run: node seed-rtm-standard.js');
    console.log('4. Test the condition presets API');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { addConditionPresetModels };