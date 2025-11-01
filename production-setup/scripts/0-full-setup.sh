#!/bin/bash

# =====================================================
# VitalEdge Full Production Setup - Automated
# =====================================================
#
# This script automates the complete production setup:
# 1. Database reset (drops all data)
# 2. Seed CMS 2025 billing programs
# 3. Seed standardized clinical library
# 4. Create Platform Admin user
# 5. Setup PLATFORM organization
#
# ⚠️  WARNING: This will DELETE ALL DATA in the database!
# Only run on fresh deployments or test environments.
# =====================================================

set -e  # Exit on error

echo "╔═══════════════════════════════════════════════════╗"
echo "║   VitalEdge Platform - Full Production Setup     ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# Confirmation prompt
echo "⚠️  WARNING: This will DELETE ALL DATA in the database!"
echo ""
read -p "Are you ABSOLUTELY SURE you want to continue? (type 'YES' to confirm): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "Starting full production setup..."
echo ""

# Step 1: Database Reset
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1/5: Database Reset"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./1-database-reset.sh
echo ""

# Step 2: Seed Billing Programs
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2/5: Seed CMS 2025 Billing Programs"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./2-seed-billing-programs.sh
echo ""

# Step 3: Seed Standardized Library
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3/5: Seed Standardized Clinical Library"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
./3-seed-library.sh
echo ""

# Step 4: Create Platform Admin User
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4/5: Create Platform Admin User"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node 4-create-platform-admin.js
echo ""

# Step 5: Setup PLATFORM Organization
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5/5: Setup PLATFORM Organization"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
node 5-setup-platform-org.js
echo ""

# Final Summary
echo "╔═══════════════════════════════════════════════════╗"
echo "║         🎉 Full Setup Complete! 🎉                ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""
echo "✅ Setup Summary:"
echo "   1. Database reset: Complete"
echo "   2. Billing programs: 3 programs (RPM, RTM, CCM), 12 CPT codes"
echo "   3. Standardized library: 6 presets, 27 metrics, 9 templates, 10 alert rules"
echo "   4. Platform Admin user: admin@vitaledge.com"
echo "   5. PLATFORM organization: VitalEdge Platform Administration"
echo ""
echo "🔐 Platform Admin Credentials:"
echo "   Email: admin@vitaledge.com"
echo "   Password: Admin123!"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - Change Platform Admin password after first login!"
echo "   - Platform Admin has platform-level permissions only"
echo "   - Platform Admin CANNOT create patients/clinicians"
echo "   - Use Platform Admin to create client organizations"
echo ""
echo "📖 Next Steps:"
echo "   1. Start backend: npm run dev"
echo "   2. Start frontend: cd frontend && npm run dev"
echo "   3. Login: http://localhost:5173"
echo "   4. Create first client organization via UI"
echo ""
echo "📚 Documentation:"
echo "   - Production Setup: production-setup/README.md"
echo "   - Platform Architecture: docs/PLATFORM-ORGANIZATION-ARCHITECTURE.md"
echo "   - Platform SaaS Refactor: docs/PLATFORM-SAAS-REFACTOR-COMPLETE.md"
echo ""
