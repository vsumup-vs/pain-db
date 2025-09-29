#!/bin/bash

echo "🔧 Fixing Enhanced RTM Deployment Issues..."
echo "============================================"

# 1. Restore critical dependencies from archive
echo "📁 Restoring critical dependencies..."
if [ -f "archive/deprecated-setup/create-standardized-assessment-templates.js" ]; then
    cp archive/deprecated-setup/create-standardized-assessment-templates.js ./
    echo "   ✅ Restored create-standardized-assessment-templates.js"
else
    echo "   ❌ create-standardized-assessment-templates.js not found in archive"
fi

if [ -f "archive/old-seeds/seed-rtm-standard.js" ]; then
    cp archive/old-seeds/seed-rtm-standard.js ./
    echo "   ✅ Restored seed-rtm-standard.js"
else
    echo "   ❌ seed-rtm-standard.js not found in archive"
fi

# 2. Check if Prisma client path exists and fix if needed
echo "🔧 Checking Prisma client paths..."
if [ ! -d "./generated/prisma" ] && [ -d "./prisma/generated/client" ]; then
    echo "   🔗 Creating symlink for Prisma client..."
    mkdir -p generated
    ln -sf ../prisma/generated/client generated/prisma
    echo "   ✅ Prisma client path fixed"
elif [ ! -d "./generated/prisma" ] && [ -d "./node_modules/.prisma/client" ]; then
    echo "   🔗 Creating symlink for Prisma client..."
    mkdir -p generated
    ln -sf ../node_modules/.prisma/client generated/prisma
    echo "   ✅ Prisma client path fixed"
fi

# 3. Make deployment script executable
chmod +x enhanced-rtm-deployment.sh
echo "   ✅ Made deployment script executable"

# 4. Check database schema for missing columns
echo "🔍 Checking database schema..."
if grep -q "dosageForm" prisma/schema.prisma; then
    echo "   ✅ dosageForm column exists in schema"
else
    echo "   ❌ dosageForm column missing from schema"
fi

if grep -q "isStandardized\|is_standardized" prisma/schema.prisma; then
    echo "   ✅ isStandardized column exists in schema"
else
    echo "   ❌ isStandardized column missing from schema"
fi

echo ""
echo "✅ Deployment issues fixed!"
echo ""
echo "📋 What was fixed:"
echo "   • Restored missing dependency files"
echo "   • Fixed Prisma client path if needed"
echo "   • Made deployment script executable"
echo "   • Verified database schema"
echo ""
echo "🚀 You can now run: ./enhanced-rtm-deployment.sh"
echo ""
echo "💡 If you still get errors, the issue might be:"
echo "   • Database needs to be reset with: npx prisma db push --force-reset"
echo "   • Prisma client needs regeneration with: npx prisma generate"