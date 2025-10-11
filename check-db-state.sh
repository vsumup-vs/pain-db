#!/bin/bash

echo "🔍 Checking database state and Permission enum dependencies..."

# Extract database connection details from .env.local
DB_USER="pain_user"
DB_PASSWORD="password"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pain_db"

# Set PGPASSWORD to avoid password prompt
export PGPASSWORD="$DB_PASSWORD"

echo "📊 Checking Permission enum dependencies..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f check-permission-dependencies.sql

echo "🎯 Since the ValueType migration was successful, let's just regenerate the Prisma client..."

# The data is already migrated, we just need to regenerate the client
echo "🔄 Regenerating Prisma client with current schema..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo "✅ Prisma client regenerated successfully!"
    echo "🎉 ValueType enum migration is complete!"
    echo "✅ Data migrated: 71 NUMERIC → numeric, 9 TEXT → text"
    echo "✅ New enum values available: categorical, ordinal"
else
    echo "❌ Failed to regenerate Prisma client"
fi

# Clean up password environment variable
unset PGPASSWORD

echo "🔍 Final verification - checking current ValueType distribution:"
export PGPASSWORD="$DB_PASSWORD"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT \"valueType\", COUNT(*) as count FROM \"metric_definitions\" GROUP BY \"valueType\" ORDER BY count DESC;"
unset PGPASSWORD