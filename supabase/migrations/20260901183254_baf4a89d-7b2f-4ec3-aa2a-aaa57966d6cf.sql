CREATE TABLE public.arbitrage_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_class text,
  occupancy text,
  price_meur numeric,
  region text,
  surface numeric,
  address text,
  rent_annual numeric,
  first_name text,
  last_name text,
  email text,
  phone text,
  comment text,
  match_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.arbitrage_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.arbitrage_requests TO authenticated;
GRANT ALL ON public.arbitrage_requests TO service_role;

ALTER TABLE public.arbitrage_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an arbitrage request"
  ON public.arbitrage_requests FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Brokers can read arbitrage requests"
  ON public.arbitrage_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'broker'));