-- Check the actual structure of metric_definitions table
\d metric_definitions

-- List all columns in metric_definitions
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'metric_definitions' 
ORDER BY ordinal_position;

-- Check a sample of the data
SELECT * FROM metric_definitions LIMIT 3;