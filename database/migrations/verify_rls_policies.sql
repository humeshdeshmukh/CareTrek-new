-- Verification Query: Check if RLS policies are set up correctly
-- Run this in Supabase SQL Editor to debug the issue

-- 1. Check if the policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'home_locations';

-- 2. Check your family connections (replace 'YOUR_FAMILY_USER_ID' with your actual family member user ID)
SELECT * FROM family_connections 
WHERE family_user_id = 'YOUR_FAMILY_USER_ID';
-- Look for: senior_user_id, status should be 'accepted'

-- 3. Check existing home locations
SELECT id, user_id, address, latitude, longitude 
FROM home_locations 
ORDER BY updated_at DESC 
LIMIT 10;

-- 4. Test if you can insert (replace with actual IDs)
-- This should work if you're logged in as family member and connected to senior
-- INSERT INTO home_locations (user_id, latitude, longitude, address)
-- VALUES ('SENIOR_USER_ID', 40.7128, -74.0060, 'Test Address');
