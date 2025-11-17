-- Remove foreign key constraint on device_id
-- The health_metrics table already stores device_name, device_type, etc.
-- so we don't need to reference a separate devices table

ALTER TABLE public.health_metrics 
DROP CONSTRAINT IF EXISTS health_metrics_device_id_fkey;
