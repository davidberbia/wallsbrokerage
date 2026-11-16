ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS nego1 text,
  ADD COLUMN IF NOT EXISTS nego2 text,
  ADD COLUMN IF NOT EXISTS seller text,
  ADD COLUMN IF NOT EXISTS buyer text,
  ADD COLUMN IF NOT EXISTS operation_nature text,
  ADD COLUMN IF NOT EXISTS carry_over boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.deal_year_goals (
  year integer PRIMARY KEY,
  goal numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_year_goals TO authenticated;
GRANT ALL ON public.deal_year_goals TO service_role;
ALTER TABLE public.deal_year_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage goals" ON public.deal_year_goals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'admin'));