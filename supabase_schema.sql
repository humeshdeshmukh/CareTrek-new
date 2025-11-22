-- Run this script in your Supabase SQL Editor to fix the missing tables and columns

-- 1. Add 'email' column to user_profiles if it doesn't exist
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Create senior_data table
CREATE TABLE IF NOT EXISTS public.senior_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    senior_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Family member who created this data
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for senior_data
ALTER TABLE public.senior_data ENABLE ROW LEVEL SECURITY;

-- Allow seniors to view/edit their own data
DROP POLICY IF EXISTS "Seniors can view their own data" ON public.senior_data;
CREATE POLICY "Seniors can view their own data" ON public.senior_data
    FOR SELECT USING (auth.uid() = senior_id);

DROP POLICY IF EXISTS "Seniors can insert their own data" ON public.senior_data;
CREATE POLICY "Seniors can insert their own data" ON public.senior_data
    FOR INSERT WITH CHECK (auth.uid() = senior_id);

DROP POLICY IF EXISTS "Seniors can update their own data" ON public.senior_data;
CREATE POLICY "Seniors can update their own data" ON public.senior_data
    FOR UPDATE USING (auth.uid() = senior_id);

-- Allow family members to view/edit data for seniors they are connected to
DROP POLICY IF EXISTS "Family can view connected senior data" ON public.senior_data;
CREATE POLICY "Family can view connected senior data" ON public.senior_data
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.senior_user_id = senior_data.senior_id
            AND fc.family_user_id = auth.uid()
            AND fc.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Family can insert data for connected seniors" ON public.senior_data;
CREATE POLICY "Family can insert data for connected seniors" ON public.senior_data
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.senior_user_id = senior_data.senior_id
            AND fc.family_user_id = auth.uid()
            AND fc.status = 'active'
        )
    );

DROP POLICY IF EXISTS "Family can update data for connected seniors" ON public.senior_data;
CREATE POLICY "Family can update data for connected seniors" ON public.senior_data
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.senior_user_id = senior_data.senior_id
            AND fc.family_user_id = auth.uid()
            AND fc.status = 'active'
        )
    );
    
DROP POLICY IF EXISTS "Family can delete data for connected seniors" ON public.senior_data;
CREATE POLICY "Family can delete data for connected seniors" ON public.senior_data
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.senior_user_id = senior_data.senior_id
            AND fc.family_user_id = auth.uid()
            AND fc.status = 'active'
        )
    );

-- 3. Create senior_locations table for live tracking
CREATE TABLE IF NOT EXISTS public.senior_locations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    senior_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Realtime for senior_locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'senior_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.senior_locations;
    END IF;
END $$;

-- Add RLS policies for senior_locations
ALTER TABLE public.senior_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Seniors can insert their own location" ON public.senior_locations;
CREATE POLICY "Seniors can insert their own location" ON public.senior_locations
    FOR INSERT WITH CHECK (auth.uid() = senior_id);

DROP POLICY IF EXISTS "Family can view connected senior locations" ON public.senior_locations;
CREATE POLICY "Family can view connected senior locations" ON public.senior_locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.family_connections fc
            WHERE fc.senior_user_id = senior_locations.senior_id
            AND fc.family_user_id = auth.uid()
            AND fc.status = 'active'
        )
    );
