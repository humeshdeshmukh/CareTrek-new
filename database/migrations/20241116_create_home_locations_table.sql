-- Create home_locations table
CREATE TABLE IF NOT EXISTS public.home_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Home',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.home_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for home_locations
CREATE POLICY "Users can view their own home locations"
  ON public.home_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own home locations"
  ON public.home_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own home locations"
  ON public.home_locations FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_home_locations_updated_at
BEFORE UPDATE ON public.home_locations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
