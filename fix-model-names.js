const fs = require('fs');
const path = require('path');

async function fixModelNames() {
  console.log('🔧 Fixing Prisma model names to match database tables...\n');

  const schemaPath = '/home/vsumup/pain-db/prisma/schema.prisma';
  
  try {
    // Read the current schema
    let content = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📝 Current model names in schema:');
    
    // Find all model declarations
    const modelMatches = content.match(/model\s+(\w+)\s*{/g);
    if (modelMatches) {
      modelMatches.forEach(match => {
        const modelName = match.match(/model\s+(\w+)/)[1];
        console.log(`   - ${modelName}`);
      });
    }
    
    console.log('\n🔄 Updating model names to match database tables...');
    
    // Map of current model names to correct table names
    const modelMappings = {
      'AssessmentTemplate': 'assessment_templates',
      'AssessmentTemplateItem': 'assessment_template_items', 
      'ConditionPreset': 'condition_presets',
      'ConditionPresetDiagnosis': 'condition_preset_diagnoses',
      'ConditionPresetTemplate': 'condition_preset_templates',
      'ConditionPresetAlertRule': 'condition_preset_alert_rules',
      'MetricDefinition': 'metric_definitions',
      'AlertRule': 'alert_rules'
    };
    
    // Update model names
    Object.entries(modelMappings).forEach(([oldName, newName]) => {
      // Update model declaration
      const modelRegex = new RegExp(`model\\s+${oldName}\\s*{`, 'g');
      if (content.match(modelRegex)) {
        content = content.replace(modelRegex, `model ${newName} {`);
        console.log(`   ✅ Updated model: ${oldName} → ${newName}`);
      }
      
      // Update references in relations
      const relationRegex = new RegExp(`(\\w+)\\s+(${oldName})\\s+`, 'g');
      content = content.replace(relationRegex, `$1 ${newName} `);
    });
    
    // Write the updated schema
    fs.writeFileSync(schemaPath, content);
    console.log('\n✅ Schema updated successfully!');
    
    console.log('\n🔄 Regenerating Prisma client...');
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing model names:', error);
    return false;
  }
}

fixModelNames();