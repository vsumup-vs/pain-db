#!/bin/bash

# Create Archive Structure and Clean Project
echo "🗂️  Creating Archive Structure and Cleaning Project"
echo "=================================================="

# Create archive directories
mkdir -p archive/{deprecated-setup,old-seeds,temp-fixes,test-files,backup-files,legacy-scripts}

# Move deprecated setup files (superseded by enhanced-rtm-comprehensive-setup.js)
echo "📦 Moving deprecated setup files..."
[ -f comprehensive-standardized-setup.js ] && mv comprehensive-standardized-setup.js archive/deprecated-setup/
[ -f complete-setup.js ] && mv complete-setup.js archive/deprecated-setup/
[ -f setup-complete-system.sh ] && mv setup-complete-system.sh archive/deprecated-setup/
[ -f setup-standardized-templates.js ] && mv setup-standardized-templates.js archive/deprecated-setup/
[ -f setup-condition-care.js ] && mv setup-condition-care.js archive/deprecated-setup/
[ -f create-standardized-assessment-templates.js ] && mv create-standardized-assessment-templates.js archive/deprecated-setup/
[ -f setup-frontend.sh ] && mv setup-frontend.sh archive/deprecated-setup/

# Move old seed files (superseded by enhanced setup)
echo "🌱 Moving old seed files..."
[ -f seed-rtm-standard.js ] && mv seed-rtm-standard.js archive/old-seeds/
[ -f seed-rtm-standard.js.backup2 ] && mv seed-rtm-standard.js.backup2 archive/old-seeds/
[ -f seed-rtm-enhanced.js ] && mv seed-rtm-enhanced.js archive/old-seeds/
[ -f seed-medication-alerts.js ] && mv seed-medication-alerts.js archive/old-seeds/
[ -f seed-arthritis-metrics.js ] && mv seed-arthritis-metrics.js archive/old-seeds/
[ -f seed-fibromyalgia-metrics.js ] && mv seed-fibromyalgia-metrics.js archive/old-seeds/
[ -f seed-standardized-metrics.js ] && mv seed-standardized-metrics.js archive/old-seeds/
[ -f seed-condition-presets.js ] && mv seed-condition-presets.js archive/old-seeds/
[ -f seed-condition-templates.js ] && mv seed-condition-templates.js archive/old-seeds/
[ -f seed.js ] && mv seed.js archive/old-seeds/

# Move temporary fixes and diagnostics
echo "🔧 Moving temporary fixes..."
[ -f temp-fix-clinician-stats.js ] && mv temp-fix-clinician-stats.js archive/temp-fixes/
[ -f temp_fix.js ] && mv temp_fix.js archive/temp-fixes/
[ -f fix-slow-stats.js ] && mv fix-slow-stats.js archive/temp-fixes/
[ -f fix-standardized-templates.js ] && mv fix-standardized-templates.js archive/temp-fixes/
[ -f diagnose-issue.js ] && mv diagnose-issue.js archive/temp-fixes/
[ -f verify-and-fix.js ] && mv verify-and-fix.js archive/temp-fixes/

# Move test files
echo "🧪 Moving test files..."
[ -f test-api-complete.sh ] && mv test-api-complete.sh archive/test-files/
[ -f test-api-performance.js ] && mv test-api-performance.js archive/test-files/
[ -f test-api-with-real-ids.sh ] && mv test-api-with-real-ids.sh archive/test-files/
[ -f test-api.js ] && mv test-api.js archive/test-files/
[ -f test-dashboard-performance.js ] && mv test-dashboard-performance.js archive/test-files/
[ -f test-endpoints.js ] && mv test-endpoints.js archive/test-files/
[ -f test-enhanced-assessment-templates.js ] && mv test-enhanced-assessment-templates.js archive/test-files/
[ -f test-enhanced-metrics.js ] && mv test-enhanced-metrics.js archive/test-files/
[ -f test-enhancement-status.js ] && mv test-enhancement-status.js archive/test-files/
[ -f test-metric-definitions.js ] && mv test-metric-definitions.js archive/test-files/
[ -f test-metric-fix.js ] && mv test-metric-fix.js archive/test-files/
[ -f test-optimized-endpoints.js ] && mv test-optimized-endpoints.js archive/test-files/
[ -f test-optimized-simple.js ] && mv test-optimized-simple.js archive/test-files/
[ -f test-patients.js ] && mv test-patients.js archive/test-files/
[ -f test-standardized-templates.js ] && mv test-standardized-templates.js archive/test-files/
[ -f final-performance-test.js ] && mv final-performance-test.js archive/test-files/
[ -f performance-monitor.js ] && mv performance-monitor.js archive/test-files/
[ -f monitor-performance.sh ] && mv monitor-performance.sh archive/test-files/

# Move analysis and check files
echo "📊 Moving analysis files..."
[ -f analyze-existing-templates.js ] && mv analyze-existing-templates.js archive/test-files/
[ -f check-assessment-templates.js ] && mv check-assessment-templates.js archive/test-files/
[ -f check-condition-presets.js ] && mv check-condition-presets.js archive/test-files/
[ -f check-metrics.js ] && mv check-metrics.js archive/test-files/
[ -f check-system-status.js ] && mv check-system-status.js archive/test-files/
[ -f quick-template-check.js ] && mv quick-template-check.js archive/test-files/
[ -f validate-implementation.js ] && mv validate-implementation.js archive/test-files/
[ -f verify-standardization.js ] && mv verify-standardization.js archive/test-files/

# Move enhancement files (superseded)
echo "⚡ Moving old enhancement files..."
[ -f enhance-assessment-templates-final.js ] && mv enhance-assessment-templates-final.js archive/deprecated-setup/
[ -f enhance-assessment-templates-fixed.js ] && mv enhance-assessment-templates-fixed.js archive/deprecated-setup/
[ -f enhance-assessment-templates.js ] && mv enhance-assessment-templates.js archive/deprecated-setup/
[ -f mark-as-standardized.js ] && mv mark-as-standardized.js archive/deprecated-setup/
[ -f get-template-ids.js ] && mv get-template-ids.js archive/deprecated-setup/

# Move backup files
echo "💾 Moving backup files..."
[ -f .env.backup ] && mv .env.backup archive/backup-files/
[ -f .env.test ] && mv .env.test archive/backup-files/

# Move log files
echo "📝 Moving log files..."
mv *.log archive/backup-files/ 2>/dev/null || true

echo ""
echo "✅ Archive Structure Created!"
echo "=========================="
echo ""
echo "📁 Archive Contents:"
echo "   📦 deprecated-setup/    - Old setup scripts (superseded by enhanced RTM)"
echo "   🌱 old-seeds/          - Individual seed files (merged into enhanced setup)"
echo "   🔧 temp-fixes/         - Temporary fixes and diagnostics"
echo "   🧪 test-files/         - Test and analysis scripts"
echo "   💾 backup-files/       - Backup and log files"
echo ""
echo "🎯 Clean Project Structure Remaining:"
echo "   ✅ enhanced-rtm-comprehensive-setup.js  - Main setup script"
echo "   ✅ enhanced-rtm-deployment.sh          - Primary deployment"
echo "   ✅ update-rtm-deployment.sh            - Update deployment"
echo "   ✅ Core seed files (drugs, medications, etc.)"
echo "   ✅ Application source code (src/, frontend/)"
echo "   ✅ Documentation and guides"
echo "   ✅ Configuration files (prisma/, package.json)"
echo ""
echo "🚀 Ready for clean client deployment!"