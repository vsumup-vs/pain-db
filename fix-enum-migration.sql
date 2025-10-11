-- Step 1: Add new lowercase values to the existing ValueType enum
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'numeric';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'text';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'boolean';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'categorical';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'ordinal';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'date';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'time';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'datetime';
ALTER TYPE "ValueType" ADD VALUE IF NOT EXISTS 'json';

-- Step 2: Update data to use lowercase values
UPDATE "metric_definitions" SET "valueType" = 'numeric' WHERE "valueType" = 'NUMERIC';
UPDATE "metric_definitions" SET "valueType" = 'text' WHERE "valueType" = 'TEXT';
UPDATE "metric_definitions" SET "valueType" = 'boolean' WHERE "valueType" = 'BOOLEAN';
UPDATE "metric_definitions" SET "valueType" = 'date' WHERE "valueType" = 'DATE';
UPDATE "metric_definitions" SET "valueType" = 'time' WHERE "valueType" = 'TIME';
UPDATE "metric_definitions" SET "valueType" = 'datetime' WHERE "valueType" = 'DATETIME';
UPDATE "metric_definitions" SET "valueType" = 'json' WHERE "valueType" = 'JSON';

-- Step 3: Verify the migration
SELECT "valueType", COUNT(*) as count 
FROM "metric_definitions" 
GROUP BY "valueType" 
ORDER BY count DESC;