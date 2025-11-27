-- FINAL FIX: Two options to resolve the RLS issue

-- ===========================================
-- OPTION 1 (RECOMMENDED): Update your connection status to 'active'
-- ===========================================
-- This changes existing connections from 'pending' to 'active'
-- Run this while logged in as the family member

UPDATE family_connections 
SET status = 'active' 
WHERE family_user_id = auth.uid();

-- ===========================================
-- OPTION 2: Update policies to accept both 'pending' and 'active'
-- ===========================================
-- If you want to allow both statuses, run this instead:

-- Drop existing policies
DROP POLICY IF EXISTS "Users and family can view home locations" ON public.home_locations;
DROP POLICY IF EXISTS "Users and family can insert home locations" ON public.home_locations;
DROP POLICY IF EXISTS "Users and family can update home locations" ON public.home_locations;
DROP POLICY IF EXISTS "Users and family can delete home locations" ON public.home_locations;

-- Create policies that accept BOTH 'pending' and 'active'

CREATE POLICY "Users and family can view home locations"
  ON public.home_locations FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status IN ('active', 'pending')
    )
  );

CREATE POLICY "Users and family can insert home locations"
  ON public.home_locations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status IN ('active', 'pending')
    )
  );

CREATE POLICY "Users and family can update home locations"
  ON public.home_locations FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status IN ('active', 'pending')
    )
  );

CREATE POLICY "Users and family can delete home locations"
  ON public.home_locations FOR DELETE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status IN ('active', 'pending')
    )
  );
