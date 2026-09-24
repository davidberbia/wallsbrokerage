ALTER TABLE public.comparables
  ADD COLUMN IF NOT EXISTS enseigne text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS weighted_surface numeric,
  ADD COLUMN IF NOT EXISTS rent_m2 numeric,
  ADD COLUMN IF NOT EXISTS rent_m2_weighted numeric,
  ADD COLUMN IF NOT EXISTS yield_pct numeric,
  ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.comparables ALTER COLUMN excerpt SET DEFAULT '';