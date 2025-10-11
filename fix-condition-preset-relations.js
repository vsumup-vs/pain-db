const fs = require('fs');
const path = require('path');

async function fixConditionPresetRelations() {
  console.log('🔧 Fixing condition preset controller relation names...\n');

  const filePath = '/home/vsumup/pain-db/src/controllers/conditionPresetController.js';
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      return false;
    }

    console.log(`📝 Processing: ${path.basename(filePath)}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let changesMade = false;

    // Fix the relation names in include statements
    const fixes = [
      {
        from: /template:\s*{/g,
        to: 'assessment_templates: {',
        description: 'template → assessment_templates'
      },
      {
        from: /rule:\s*{/g,
        to: 'alert_rules: {',
        description: 'rule → alert_rules'
      },
      {
        from: /diagnoses:/g,
        to: 'condition_preset_diagnoses:',
        description: 'diagnoses → condition_preset_diagnoses'
      },
      {
        from: /templates:/g,
        to: 'condition_preset_templates:',
        description: 'templates → condition_preset_templates'
      },
      {
        from: /alertRules:/g,
        to: 'condition_preset_alert_rules:',
        description: 'alertRules → condition_preset_alert_rules'
      }
    ];

    fixes.forEach(fix => {
      const matches = content.match(fix.from);
      if (matches) {
        content = content.replace(fix.from, fix.to);
        console.log(`   ✅ Updated: ${fix.description} (${matches.length} occurrences)`);
        changesMade = true;
      }
    });

    if (changesMade) {
      fs.writeFileSync(filePath, content);
      console.log(`   💾 Saved changes to ${path.basename(filePath)}`);
    } else {
      console.log(`   ℹ️  No changes needed for ${path.basename(filePath)}`);
    }

    console.log('\n✅ Condition preset controller fixes completed!');
    return true;

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

fixConditionPresetRelations();