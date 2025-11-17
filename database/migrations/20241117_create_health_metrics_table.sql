-- Create health_metrics table
CREATE TABLE IF NOT EXISTS public.health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    device_name TEXT NOT NULL,
    device_type TEXT NOT NULL,
    heart_rate INTEGER,
    steps INTEGER,
    battery INTEGER,
    oxygen_saturation INTEGER,
    blood_pressure_systolic INTEGER,
    blood_pressure_diastolic INTEGER,
    calories INTEGER,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON public.health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_timestamp ON public.health_metrics(timestamp);

-- Create RLS policies
CREATE POLICY "Enable read access for own data" 
ON public.health_metrics
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users"
ON public.health_metrics
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW; 
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_health_metrics_updated_at
BEFORE UPDATE ON public.health_metrics
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
