-- Add timestamp column to health_metrics if it doesn't exist
ALTER TABLE IF EXISTS public.health_metrics 
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update existing rows to have a default timestamp if null
UPDATE public.health_metrics 
SET timestamp = COALESCE(timestamp, created_at, NOW())
WHERE timestamp IS NULL;
