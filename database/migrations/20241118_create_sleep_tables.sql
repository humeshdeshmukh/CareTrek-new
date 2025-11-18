-- Create sleep_records table
CREATE TABLE IF NOT EXISTS public.sleep_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  duration INTEGER DEFAULT 0, -- in minutes
  quality TEXT DEFAULT 'good' CHECK (quality IN ('excellent', 'good', 'fair', 'poor')),
  deep_sleep INTEGER DEFAULT 0, -- in minutes
  light_sleep INTEGER DEFAULT 0, -- in minutes
  rem_sleep INTEGER DEFAULT 0, -- in minutes
  awake_time INTEGER DEFAULT 0, -- in minutes
  start_time TIMESTAMP WITH TIME ZONE,
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_id ON public.sleep_records(user_id);
CREATE INDEX IF NOT EXISTS idx_sleep_records_date ON public.sleep_records(date);
CREATE INDEX IF NOT EXISTS idx_sleep_records_user_date ON public.sleep_records(user_id, date);

-- Enable RLS (Row Level Security)
ALTER TABLE public.sleep_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sleep_records
CREATE POLICY "Users can view their own sleep records"
  ON public.sleep_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sleep records"
  ON public.sleep_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep records"
  ON public.sleep_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep records"
  ON public.sleep_records
  FOR DELETE
  USING (auth.uid() = user_id);
