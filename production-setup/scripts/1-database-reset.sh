#!/bin/bash

# =====================================================
# VitalEdge Production Database Reset Script
# =====================================================
#
# WARNING: This script will DELETE ALL DATA in the database
# and recreate the schema from scratch.
#
# Use Cases:
# - Initial production deployment
# - Testing environment reset
# - Development cleanup
#
# DO NOT RUN on production database with real patient data!
# =====================================================

set -e  # Exit on error

echo "⚠️  DATABASE RESET WARNING ⚠️"
echo "================================"
echo "This script will:"
echo "1. Drop the entire 'public' schema (ALL DATA LOST)"
echo "2. Recreate the schema"
echo "3. Apply Prisma schema"
echo ""
read -p "Are you ABSOLUTELY SURE you want to continue? (type 'YES' to confirm): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🗑️  Dropping existing schema..."

# Drop and recreate schema
PGPASSWORD=password psql -h localhost -U vsumup -d pain_db << EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO vsumup;
GRANT ALL ON SCHEMA public TO public;
EOF

echo "✅ Schema dropped and recreated"

echo ""
echo "🔨 Applying Prisma schema..."

# Push Prisma schema to database
npx prisma db push --accept-data-loss

echo "✅ Prisma schema applied"

echo ""
echo "🎉 Database reset complete!"
echo ""
echo "Next steps:"
echo "  1. Run: ./2-seed-billing-programs.sh"
echo "  2. Run: ./3-seed-library.sh"
echo "  3. Run: node 4-create-platform-admin.js"
echo "  4. Run: node 5-setup-platform-org.js"
echo ""
