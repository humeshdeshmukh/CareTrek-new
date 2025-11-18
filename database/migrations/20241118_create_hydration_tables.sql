-- Create hydration_records table
CREATE TABLE IF NOT EXISTS public.hydration_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  water_intake INTEGER DEFAULT 0,
  goal INTEGER DEFAULT 2000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Create hydration_entries table
CREATE TABLE IF NOT EXISTS public.hydration_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hydration_record_id UUID NOT NULL REFERENCES public.hydration_records(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  time TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('water', 'juice', 'tea', 'coffee', 'milk', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hydration_records_user_id ON public.hydration_records(user_id);
CREATE INDEX IF NOT EXISTS idx_hydration_records_date ON public.hydration_records(date);
CREATE INDEX IF NOT EXISTS idx_hydration_records_user_date ON public.hydration_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_hydration_entries_record_id ON public.hydration_entries(hydration_record_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.hydration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hydration_records
CREATE POLICY "Users can view their own hydration records"
  ON public.hydration_records
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own hydration records"
  ON public.hydration_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own hydration records"
  ON public.hydration_records
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own hydration records"
  ON public.hydration_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS policies for hydration_entries
CREATE POLICY "Users can view their own hydration entries"
  ON public.hydration_entries
  FOR SELECT
  USING (
    hydration_record_id IN (
      SELECT id FROM public.hydration_records WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own hydration entries"
  ON public.hydration_entries
  FOR INSERT
  WITH CHECK (
    hydration_record_id IN (
      SELECT id FROM public.hydration_records WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own hydration entries"
  ON public.hydration_entries
  FOR DELETE
  USING (
    hydration_record_id IN (
      SELECT id FROM public.hydration_records WHERE user_id = auth.uid()
    )
  );
