const fs = require('fs');
const path = require('path');

async function fixControllerModelNames() {
  console.log('🔧 Fixing controller model names to match Prisma schema...\n');

  const controllerFiles = [
    '/home/vsumup/pain-db/src/controllers/assessmentTemplateController.js',
    '/home/vsumup/pain-db/src/controllers/assessmentTemplateController.enhanced.js',
    '/home/vsumup/pain-db/src/controllers/conditionPresetController.js'
  ];

  // Model name mappings from camelCase to snake_case
  const modelMappings = {
    'assessmentTemplate': 'assessment_templates',
    'assessmentTemplateItem': 'assessment_template_items',
    'conditionPreset': 'condition_presets',
    'conditionPresetDiagnosis': 'condition_preset_diagnoses',
    'conditionPresetTemplate': 'condition_preset_templates',
    'conditionPresetAlertRule': 'condition_preset_alert_rules',
    'metricDefinition': 'metric_definitions',
    'alertRule': 'alert_rules'
  };

  for (const filePath of controllerFiles) {
    try {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        continue;
      }

      console.log(`📝 Processing: ${path.basename(filePath)}`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      let changesMade = false;

      // Replace model names in prisma calls
      Object.entries(modelMappings).forEach(([camelCase, snake_case]) => {
        const regex = new RegExp(`prisma\\.${camelCase}`, 'g');
        const matches = content.match(regex);
        
        if (matches) {
          content = content.replace(regex, `prisma.${snake_case}`);
          console.log(`   ✅ Updated: prisma.${camelCase} → prisma.${snake_case} (${matches.length} occurrences)`);
          changesMade = true;
        }
      });

      // Also fix relation names in include statements
      const relationMappings = {
        'conditionPresetTemplates': 'condition_preset_templates',
        'conditionPresetDiagnoses': 'condition_preset_diagnoses',
        'conditionPresetAlertRules': 'condition_preset_alert_rules',
        'assessmentTemplateItems': 'assessment_template_items',
        'metricDefinitions': 'metric_definitions',
        'conditionPreset': 'condition_presets',
        'assessmentTemplate': 'assessment_templates',
        'metricDefinition': 'metric_definitions',
        'alertRules': 'condition_preset_alert_rules',
        'templates': 'condition_preset_templates',
        'diagnoses': 'condition_preset_diagnoses',
        'items': 'assessment_template_items'
      };

      Object.entries(relationMappings).forEach(([camelCase, snake_case]) => {
        const regex = new RegExp(`\\b${camelCase}:`, 'g');
        const matches = content.match(regex);
        
        if (matches) {
          content = content.replace(regex, `${snake_case}:`);
          console.log(`   ✅ Updated relation: ${camelCase} → ${snake_case} (${matches.length} occurrences)`);
          changesMade = true;
        }
      });

      if (changesMade) {
        fs.writeFileSync(filePath, content);
        console.log(`   💾 Saved changes to ${path.basename(filePath)}`);
      } else {
        console.log(`   ℹ️  No changes needed for ${path.basename(filePath)}`);
      }

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log('\n✅ Controller fixes completed!');
  console.log('\n🔄 Next steps:');
  console.log('   1. Regenerate Prisma client: npx prisma generate');
  console.log('   2. Restart the server');
  console.log('   3. Test the endpoints again');
  
  return true;
}

fixControllerModelNames();