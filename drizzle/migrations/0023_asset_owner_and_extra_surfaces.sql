ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS parking_count integer,
  ADD COLUMN IF NOT EXISTS outdoor_surface numeric,
  ADD COLUMN IF NOT EXISTS weighted_surface numeric,
  ADD COLUMN IF NOT EXISTS owner_kind text,
  ADD COLUMN IF NOT EXISTS owner_details jsonb NOT NULL DEFAULT '{}'::jsonb;