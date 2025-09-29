#!/bin/bash

echo "🔄 Synchronizing database schema with Prisma definitions..."
echo "This will:"
echo "   • Create missing columns (is_standardized, dosageForm)"
echo "   • Apply all schema changes"
echo "   • Reset database if needed"
echo ""

npx prisma db push --force-reset

echo ""
echo "✅ Database schema synchronized!"
echo "Now you can run: ./enhanced-rtm-deployment.sh"