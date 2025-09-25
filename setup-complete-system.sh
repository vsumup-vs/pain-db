#!/bin/bash

echo "🏥 Setting up Complete Pain Management & Medication Adherence System"
echo "=================================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the pain-db directory"
    exit 1
fi

echo "📋 Step 1: Applying database migrations..."
npx prisma migrate deploy

echo "🔧 Step 2: Generating Prisma client..."
npx prisma generate

echo "💊 Step 3: Seeding drugs..."
node seed-drugs.js

echo "📊 Step 4: Seeding medication metrics..."
node seed-medication-metrics.js

echo "📝 Step 5: Seeding medication templates..."
node seed-medication-templates.js

echo "🚨 Step 6: Seeding medication alerts..."
node seed-medication-alerts.js

echo "🏥 Step 7: Seeding condition presets..."
node seed-condition-presets.js

echo "🔗 Step 8: Linking presets to templates and alerts..."
node seed-preset-links.js

echo "👥 Step 9: Setting up enrollments..."
node setup-enrollments.js

echo "📦 Step 10: Installing frontend dependencies..."
cd frontend && npm install && cd ..

echo "✅ Setup completed successfully!"
echo ""
echo "🚀 To start the system:"
echo "   npm run start:all"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3000/api"
echo ""
echo "📋 Available routes:"
echo "   /patients - Patient management"
echo "   /clinicians - Clinician management"
echo "   /enrollments - Enrollment management"
echo "   /medications - Medication management"
echo "   /observations - Pain and medication tracking"
echo "   /alerts - Alert monitoring"