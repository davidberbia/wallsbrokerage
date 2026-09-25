CREATE TABLE public.shared_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  note text,
  title text,
  summary text,
  status text NOT NULL DEFAULT 'en attente',
  error text,
  found_contacts int NOT NULL DEFAULT 0,
  found_comparables int NOT NULL DEFAULT 0,
  found_news int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_links TO authenticated;
GRANT ALL ON public.shared_links TO service_role;
ALTER TABLE public.shared_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read links" ON public.shared_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'));
CREATE POLICY "Broker manage links" ON public.shared_links FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));