#!/bin/bash

echo "🔍 Checking actual database table structure..."

# Extract database connection details from .env.local
DB_USER="pain_user"
DB_PASSWORD="password"
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="pain_db"

# Set PGPASSWORD to avoid password prompt
export PGPASSWORD="$DB_PASSWORD"

echo "📊 Checking metric_definitions table structure..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f check-table-structure.sql

# Clean up password environment variable
unset PGPASSWORD