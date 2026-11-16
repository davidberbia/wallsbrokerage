CREATE TABLE public.manual_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tab text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  question text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.manual_sections TO authenticated;
GRANT ALL ON public.manual_sections TO service_role;
ALTER TABLE public.manual_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read manual" ON public.manual_sections FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer') OR public.has_role(auth.uid(),'admin'));