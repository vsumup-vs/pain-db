-- Check what tables are using the Permission enum
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.udt_name
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE c.udt_name LIKE '%Permission%' OR c.udt_name LIKE '%permission%'
ORDER BY t.table_name, c.column_name;

-- Check existing enum types
SELECT typname, typtype FROM pg_type WHERE typtype = 'e' ORDER BY typname;

-- Check the current Permission enum values
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Permission') ORDER BY enumsortorder;