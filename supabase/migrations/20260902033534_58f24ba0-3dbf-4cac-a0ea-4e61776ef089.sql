CREATE TABLE public.taxonomy_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('asset_class','investor_profile','country','amount_band','region','strategy')),
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, label)
);

GRANT SELECT ON public.taxonomy_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_items TO authenticated;
GRANT ALL ON public.taxonomy_items TO service_role;
ALTER TABLE public.taxonomy_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy readable by everyone" ON public.taxonomy_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "broker manages taxonomy" ON public.taxonomy_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));

CREATE TRIGGER taxonomy_items_updated_at BEFORE UPDATE ON public.taxonomy_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Lecteurs : consultation seule
CREATE POLICY "viewer reads investors" ON public.investors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "viewer reads criteria" ON public.investor_criteria FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "viewer reads assets" ON public.assets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "viewer reads sends" ON public.brochure_sends FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));
CREATE POLICY "viewer reads campaigns" ON public.campaigns FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'viewer'));