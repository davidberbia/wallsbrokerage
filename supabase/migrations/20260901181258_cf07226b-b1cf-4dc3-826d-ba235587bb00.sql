ALTER TABLE public.investors
  ADD COLUMN IF NOT EXISTS bubble_id text,
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS investor_profile text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS postal_code text;

CREATE UNIQUE INDEX IF NOT EXISTS investors_bubble_id_key ON public.investors (bubble_id) WHERE bubble_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.investor_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
  bubble_id text,
  asset_class text NOT NULL,
  investor_profile text,
  strategies text[] NOT NULL DEFAULT '{}'::text[],
  amount_bands text[] NOT NULL DEFAULT '{}'::text[],
  regions text[] NOT NULL DEFAULT '{}'::text[],
  city_scope text,
  periphery_scope text,
  city_targets text[] NOT NULL DEFAULT '{}'::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS investor_criteria_bubble_id_key ON public.investor_criteria (bubble_id) WHERE bubble_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS investor_criteria_investor_id_idx ON public.investor_criteria (investor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_criteria TO authenticated;
GRANT ALL ON public.investor_criteria TO service_role;

ALTER TABLE public.investor_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker manages criteria" ON public.investor_criteria
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker'))
  WITH CHECK (public.has_role(auth.uid(), 'broker'));

CREATE POLICY "investor manages own criteria" ON public.investor_criteria
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investors i WHERE i.id = investor_criteria.investor_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.investors i WHERE i.id = investor_criteria.investor_id AND i.user_id = auth.uid()));

CREATE TRIGGER investor_criteria_updated_at
  BEFORE UPDATE ON public.investor_criteria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();