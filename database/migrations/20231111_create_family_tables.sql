-- Create user_profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  family_key TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create family_relationships table
CREATE TABLE IF NOT EXISTS public.family_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_member_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(senior_user_id, family_member_id)
);

-- Enable RLS on family_relationships
ALTER TABLE public.family_relationships ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Create policies for family_relationships
CREATE POLICY "Users can view their family relationships"
  ON public.family_relationships
  FOR SELECT
  USING (auth.uid() = senior_user_id OR auth.uid() = family_member_id);

CREATE POLICY "Users can add family members"
  ON public.family_relationships
  FOR INSERT
  WITH CHECK (auth.uid() = senior_user_id);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_relationships_updated_at
BEFORE UPDATE ON public.family_relationships
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
