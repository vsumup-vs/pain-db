-- Migration script to update ValueType enum values from uppercase to lowercase
-- This bypasses Prisma's type checking by using raw SQL

-- Check current data distribution
SELECT "valueType", COUNT(*) as count 
FROM "metric_definitions" 
GROUP BY "valueType" 
ORDER BY count DESC;

-- Update enum values from uppercase to lowercase
UPDATE "metric_definitions" SET "valueType" = 'numeric' WHERE "valueType" = 'NUMERIC';
UPDATE "metric_definitions" SET "valueType" = 'text' WHERE "valueType" = 'TEXT';
UPDATE "metric_definitions" SET "valueType" = 'boolean' WHERE "valueType" = 'BOOLEAN';
UPDATE "metric_definitions" SET "valueType" = 'date' WHERE "valueType" = 'DATE';
UPDATE "metric_definitions" SET "valueType" = 'time' WHERE "valueType" = 'TIME';
UPDATE "metric_definitions" SET "valueType" = 'datetime' WHERE "valueType" = 'DATETIME';
UPDATE "metric_definitions" SET "valueType" = 'json' WHERE "valueType" = 'JSON';

-- Verify the migration
SELECT "valueType", COUNT(*) as count 
FROM "metric_definitions" 
GROUP BY "valueType" 
ORDER BY count DESC;