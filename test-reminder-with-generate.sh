#!/bin/bash

echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "🔔 Running reminder test..."
node quick-reminder-test.js