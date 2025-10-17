#!/bin/bash

echo "🔧 Applying Value Type Schema Fix..."

# Step 1: Update the schema file
echo "📝 Step 1: Updating schema file..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Update ValueType enum
sed -i '/enum ValueType {/,/}/c\
enum ValueType {\
  numeric\
  text\
  boolean\
  categorical\
  ordinal\
  date\
  time\
  datetime\
  json\
}' prisma/schema.prisma

# Update MetricDefinition model
sed -i '/model MetricDefinition {/,/^}/c\
model MetricDefinition {\
  id                String        @id @default(cuid())\
  key               String        @unique\
  name              String\
  description       String?\
  unit              String?\
  valueType         ValueType\
  \
  // Numeric type fields\
  scaleMin          Decimal?      // Minimum value for numeric types\
  scaleMax          Decimal?      // Maximum value for numeric types\
  decimalPrecision  Int?          // Decimal precision for numeric types\
  \
  // Categorical/Ordinal type fields\
  options           Json?         // Options for categorical/ordinal types\
  \
  // Existing fields\
  normalRange       Json?\
  isStandardized    Boolean       @default(false)\
  category          String?\
  standardCoding    Json?         // LOINC, SNOMED, ICD-10 codes\
  validationInfo    Json?         // Clinical validation details\
  createdAt         DateTime      @default(now())\
  updatedAt         DateTime      @updatedAt\
  \
  // Relationships\
  observations      Observation[]\
  templateItems     AssessmentTemplateItem[]\
  \
  @@map("metric_definitions")\
}' prisma/schema.prisma

echo "✅ Schema file updated"

# Step 2: Push schema changes
echo "📤 Step 2: Pushing schema changes to database..."
npx prisma db push --accept-data-loss

# Step 3: Generate Prisma client
echo "🔄 Step 3: Regenerating Prisma client..."
npx prisma generate

echo "✅ Value Type schema fix applied successfully!"
echo ""
echo "⚠️  Note: You may need to run a data migration script to update existing records"
echo "   from uppercase (NUMERIC, TEXT) to lowercase (numeric, text) value types."