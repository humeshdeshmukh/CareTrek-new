-- Check the structure of family_connections table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default,
    character_maximum_length,
    udt_name
FROM 
    information_schema.columns 
WHERE 
    table_name = 'family_connections';

-- Check constraints on the family_connections table
SELECT 
    tc.constraint_name, 
    tc.constraint_type, 
    ccu.column_name, 
    pg_get_constraintdef(con.oid) as constraint_definition
FROM 
    information_schema.table_constraints tc
    JOIN pg_constraint con ON con.conname = tc.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.table_name = 'family_connections';

-- Check for any check constraints specifically
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM 
    pg_constraint 
WHERE 
    conrelid = 'public.family_connections'::regclass
    AND contype = 'c';  -- 'c' = check constraint

-- Check the current values in the family_connections table (first 5 rows)
SELECT * FROM family_connections LIMIT 5;
