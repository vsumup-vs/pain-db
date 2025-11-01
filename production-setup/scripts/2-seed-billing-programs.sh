#!/bin/bash

# =====================================================
# Seed CMS 2025 Billing Programs
# =====================================================
#
# Seeds:
# - 3 billing programs (RPM, RTM, CCM)
# - 12 CPT codes with criteria
# - Eligibility rules per program
#
# =====================================================

set -e

echo "💰 Seeding CMS 2025 Billing Programs..."
echo ""

cd ../../  # Go to project root

node prisma/seed-billing-programs-cms-2025.js

echo ""
echo "✅ Billing programs seeded successfully!"
echo ""
echo "Seeded:"
echo "  - CMS_RPM_2025 (4 CPT codes)"
echo "  - CMS_RTM_2025 (5 CPT codes)"
echo "  - CMS_CCM_2025 (3 CPT codes)"
echo ""
echo "Next step: Run ./3-seed-library.sh"
echo ""
