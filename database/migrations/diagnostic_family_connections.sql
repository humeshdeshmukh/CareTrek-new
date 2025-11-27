-- Diagnostic Query: Check family_connections table and data
-- Run this in Supabase SQL Editor to see what's actually in your database

-- 1. Check the structure of family_connections table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'family_connections'
ORDER BY ordinal_position;

-- 2. Check all connections for the current user (you must be logged in)
SELECT * 
FROM family_connections 
WHERE family_user_id = auth.uid() 
OR senior_user_id = auth.uid();

-- 3. Check if there are ANY rows in family_connections
SELECT COUNT(*) as total_connections FROM family_connections;

-- 4. Show all unique status values in family_connections
SELECT DISTINCT status FROM family_connections;

-- 5. Check current user ID
SELECT auth.uid() as my_user_id;
