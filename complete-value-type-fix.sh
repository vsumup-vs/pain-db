#!/bin/bash

echo "🔧 Complete Value Type Fix Process"
echo "=================================="

# Step 1: Backup current schema
echo "📋 Step 1: Creating backup..."
cp prisma/schema.prisma prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Schema backed up"

# Step 2: Apply schema changes
echo ""
echo "📝 Step 2: Applying schema changes..."
echo "⚠️  This will update the database schema to:"
echo "   - Change ValueType enum to lowercase (numeric, text, boolean, etc.)"
echo "   - Add missing types (categorical, ordinal)"
echo "   - Add missing fields (scaleMin, scaleMax, decimalPrecision, options)"

read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Aborted"
    exit 1
fi

# Push schema changes
echo "📤 Pushing schema changes..."
npx prisma db push --accept-data-loss

if [ $? -ne 0 ]; then
    echo "❌ Schema push failed!"
    exit 1
fi

# Step 3: Generate new Prisma client
echo ""
echo "🔄 Step 3: Regenerating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Prisma client generation failed!"
    exit 1
fi

# Step 4: Migrate existing data
echo ""
echo "📊 Step 4: Migrating existing data..."
node migrate-value-types-data.js

if [ $? -ne 0 ]; then
    echo "❌ Data migration failed!"
    exit 1
fi

echo ""
echo "✅ Complete Value Type Fix Applied Successfully!"
echo ""
echo "📋 Summary of changes:"
echo "   ✅ ValueType enum updated to lowercase"
echo "   ✅ Added categorical and ordinal types"
echo "   ✅ Added scaleMin, scaleMax, decimalPrecision fields"
echo "   ✅ Added options field for categorical/ordinal types"
echo "   ✅ Existing data migrated to new format"
echo ""
echo "🎯 Next steps:"
echo "   1. Test the frontend to verify Value Type display"
echo "   2. Update any hardcoded value type references in code"
echo "   3. Test metric creation with new fields"