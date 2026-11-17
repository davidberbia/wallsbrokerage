ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS hotel_category text,
  ADD COLUMN IF NOT EXISTS revenue_n1 numeric,
  ADD COLUMN IF NOT EXISTS revenue_n2 numeric,
  ADD COLUMN IF NOT EXISTS ebe numeric,
  ADD COLUMN IF NOT EXISTS ebe_n1 numeric,
  ADD COLUMN IF NOT EXISTS ebe_n2 numeric;
ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS owner_siren text;