#!/bin/bash

# =====================================================
# Seed Standardized Clinical Library
# =====================================================
#
# Seeds:
# - 6 condition presets
# - 27 standardized metrics
# - 9 assessment templates
# - 10 alert rules
#
# =====================================================

set -e

echo "📚 Seeding Standardized Clinical Library..."
echo ""

cd ../../  # Go to project root

npm run seed:production

echo ""
echo "✅ Standardized library seeded successfully!"
echo ""
echo "Seeded:"
echo "  - 6 condition presets (Pain, Diabetes, HTN, HF, COPD, Wellness)"
echo "  - 27 standardized metrics"
echo "  - 9 assessment templates"
echo "  - 10 alert rules"
echo ""
echo "Next step: Run node 4-create-platform-admin.js"
echo ""
