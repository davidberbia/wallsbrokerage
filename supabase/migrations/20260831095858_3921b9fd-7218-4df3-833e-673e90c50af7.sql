CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.investors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  full_name text NOT NULL,
  company text,
  email text,
  phone text,
  city text,
  country text,
  budget_min numeric,
  budget_max numeric,
  asset_classes text[] NOT NULL DEFAULT '{}',
  strategies text[] NOT NULL DEFAULT '{}',
  regions text[] NOT NULL DEFAULT '{}',
  min_yield numeric,
  holding_horizon text,
  financing text,
  status text NOT NULL DEFAULT 'actif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investors TO authenticated;
GRANT ALL ON public.investors TO service_role;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own investors" ON public.investors FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER investors_updated_at BEFORE UPDATE ON public.investors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX investors_owner_idx ON public.investors(owner_id);

CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  reference text,
  asset_class text,
  strategy text,
  region text,
  city text,
  price numeric,
  yield_pct numeric,
  surface numeric,
  brochure_url text,
  description text,
  status text NOT NULL DEFAULT 'disponible',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT ALL ON public.assets TO service_role;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.assets FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE TRIGGER assets_updated_at BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX assets_owner_idx ON public.assets(owner_id);

CREATE TABLE public.brochure_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email',
  notes text,
  sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brochure_sends TO authenticated;
GRANT ALL ON public.brochure_sends TO service_role;
ALTER TABLE public.brochure_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sends" ON public.brochure_sends FOR ALL TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE INDEX brochure_sends_asset_idx ON public.brochure_sends(asset_id);