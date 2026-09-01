ALTER TABLE public.arbitrage_requests
  ADD COLUMN IF NOT EXISTS strategy text,
  ADD COLUMN IF NOT EXISTS city_scope text,
  ADD COLUMN IF NOT EXISTS periphery_scope text;