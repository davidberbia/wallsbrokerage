CREATE TABLE public.brochure_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brochure_settings TO authenticated;
GRANT ALL ON public.brochure_settings TO service_role;
ALTER TABLE public.brochure_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers manage brochure settings" ON public.brochure_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));