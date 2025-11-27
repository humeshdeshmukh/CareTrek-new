-- Fix RLS policies for home_locations to allow family access

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own home locations" ON public.home_locations;
DROP POLICY IF EXISTS "Users can insert their own home locations" ON public.home_locations;
DROP POLICY IF EXISTS "Users can update their own home locations" ON public.home_locations;

-- Create comprehensive policies

-- 1. SELECT: Users can view their own location AND locations of seniors they are connected to
CREATE POLICY "Users and family can view home locations"
  ON public.home_locations FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status = 'accepted'
    )
  );

-- 2. INSERT: Users can insert their own location AND family members can insert for their seniors
CREATE POLICY "Users and family can insert home locations"
  ON public.home_locations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status = 'accepted'
    )
  );

-- 3. UPDATE: Users can update their own location AND family members can update for their seniors
CREATE POLICY "Users and family can update home locations"
  ON public.home_locations FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status = 'accepted'
    )
  );

-- 4. DELETE: Users can delete their own location AND family members can delete for their seniors
CREATE POLICY "Users and family can delete home locations"
  ON public.home_locations FOR DELETE
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM family_connections fc 
      WHERE fc.senior_user_id = home_locations.user_id 
      AND fc.family_user_id = auth.uid() 
      AND fc.status = 'accepted'
    )
  );
