#!/bin/bash

echo "🔧 Running Safe Value Type Migration"
echo "=================================="

# Run the migration script
echo "📝 Step 1: Running data migration..."
node safe-value-type-migration.js

# Check if migration was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "📤 Step 2: Pushing schema changes..."
    npx prisma db push --accept-data-loss
    
    echo ""
    echo "🔄 Step 3: Regenerating Prisma client..."
    npx prisma generate
    
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   ✅ Data migrated from uppercase to lowercase"
    echo "   ✅ Schema updated with new enum values"
    echo "   ✅ Added categorical and ordinal types"
    echo "   ✅ Prisma client regenerated"
else
    echo "❌ Migration failed. Please check the logs above."
    exit 1
fi