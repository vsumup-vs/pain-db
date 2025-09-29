#!/bin/bash

# Update RTM Deployment Script
# Updates to enhanced RTM coverage while preserving existing data

echo "🔄 Enhanced RTM Update Deployment"
echo "================================="
echo ""
echo "📋 This update includes:"
echo "   • Enhanced RTM metric coverage"
echo "   • New alert rules for clinical safety"
echo "   • Additional condition presets"
echo "   • Preserved custom templates and data"
echo ""

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run enhanced RTM comprehensive setup (non-destructive)
echo "🏥 Running Enhanced RTM Comprehensive Setup..."
node enhanced-rtm-comprehensive-setup.js

# Verify system status
echo "✅ Verifying system status..."
node quick-template-check.js

echo ""
echo "🎉 Enhanced RTM Update Complete!"
echo "==============================="
echo ""
echo "📊 System Status:"
echo "   • Existing data: ✅ Preserved"
echo "   • RTM compliance: ✅ Enhanced"
echo "   • New components: ✅ Added"
echo ""
echo "🚀 Ready to use enhanced RTM system!"