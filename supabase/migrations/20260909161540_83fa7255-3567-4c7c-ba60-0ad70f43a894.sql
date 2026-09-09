CREATE TABLE public.prospect_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text,
  sector text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX prospect_companies_name_key ON public.prospect_companies (lower(name));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_companies TO authenticated;
GRANT ALL ON public.prospect_companies TO service_role;
ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages prospect companies" ON public.prospect_companies FOR ALL TO authenticated USING (has_role(auth.uid(), 'broker'::app_role)) WITH CHECK (has_role(auth.uid(), 'broker'::app_role));
CREATE POLICY "viewer reads prospect companies" ON public.prospect_companies FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER prospect_companies_updated_at BEFORE UPDATE ON public.prospect_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prospect_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  first_name text,
  job_title text,
  email text,
  phone text,
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX prospect_contacts_company_name_key ON public.prospect_contacts (company_id, lower(full_name));
CREATE INDEX prospect_contacts_company_idx ON public.prospect_contacts (company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prospect_contacts TO authenticated;
GRANT ALL ON public.prospect_contacts TO service_role;
ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages prospect contacts" ON public.prospect_contacts FOR ALL TO authenticated USING (has_role(auth.uid(), 'broker'::app_role)) WITH CHECK (has_role(auth.uid(), 'broker'::app_role));
CREATE POLICY "viewer reads prospect contacts" ON public.prospect_contacts FOR SELECT TO authenticated USING (has_role(auth.uid(), 'viewer'::app_role));
CREATE TRIGGER prospect_contacts_updated_at BEFORE UPDATE ON public.prospect_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.brochure_sends ALTER COLUMN investor_id DROP NOT NULL;
ALTER TABLE public.brochure_sends ADD COLUMN IF NOT EXISTS prospect_contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL;