const fs = require('fs');
const path = require('path');

function fixAlertRuleController() {
    console.log('🔧 FIXING ALERT RULE CONTROLLER');
    console.log('===============================\n');

    const controllerPath = '/home/vsumup/pain-db/src/controllers/alertRuleController.js';
    
    try {
        // Read the current file
        let content = fs.readFileSync(controllerPath, 'utf8');
        console.log('📖 Reading alertRuleController.js...');

        // Track changes
        let changeCount = 0;

        // Fix 1: Change prisma.alertRule to prisma.AlertRule
        const alertRuleMatches = content.match(/prisma\.alertRule/g);
        if (alertRuleMatches) {
            console.log(`🔍 Found ${alertRuleMatches.length} instances of 'prisma.alertRule'`);
            content = content.replace(/prisma\.alertRule/g, 'prisma.AlertRule');
            changeCount += alertRuleMatches.length;
        }

        // Fix 2: Change presetLinks to condition_preset_alert_rules
        const presetLinksMatches = content.match(/presetLinks/g);
        if (presetLinksMatches) {
            console.log(`🔍 Found ${presetLinksMatches.length} instances of 'presetLinks'`);
            content = content.replace(/presetLinks/g, 'condition_preset_alert_rules');
            changeCount += presetLinksMatches.length;
        }

        // Fix 3: Change preset to condition_presets in includes
        const presetMatches = content.match(/preset:\s*{/g);
        if (presetMatches) {
            console.log(`🔍 Found ${presetMatches.length} instances of 'preset:' in includes`);
            content = content.replace(/preset:\s*{/g, 'condition_presets: {');
            changeCount += presetMatches.length;
        }

        // Write the fixed file
        fs.writeFileSync(controllerPath, content);
        
        console.log(`✅ Fixed ${changeCount} naming issues in alertRuleController.js`);
        console.log('📝 Changes made:');
        console.log('   • prisma.alertRule → prisma.AlertRule');
        console.log('   • presetLinks → condition_preset_alert_rules');
        console.log('   • preset → condition_presets');
        
        return true;
    } catch (error) {
        console.error('❌ Error fixing controller:', error.message);
        return false;
    }
}

// Run the fix
if (fixAlertRuleController()) {
    console.log('\n🎉 AlertRule controller fixed successfully!');
    console.log('💡 Next: Run verification script to confirm fixes');
} else {
    console.log('\n❌ Failed to fix AlertRule controller');
}