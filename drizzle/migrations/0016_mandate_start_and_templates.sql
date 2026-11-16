ALTER TABLE public.mandates ADD COLUMN IF NOT EXISTS start_date date, ADD COLUMN IF NOT EXISTS template_id uuid;
CREATE TABLE public.mandate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  exclusive boolean NOT NULL DEFAULT false,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  file_path text,
  file_name text,
  compliance_notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandate_templates TO authenticated;
GRANT ALL ON public.mandate_templates TO service_role;
ALTER TABLE public.mandate_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read templates" ON public.mandate_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker'));
CREATE POLICY "admin write templates" ON public.mandate_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER mandate_templates_updated BEFORE UPDATE ON public.mandate_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE POLICY "staff read mandate template files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mandate-templates' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')));
CREATE POLICY "admin write mandate template files" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'mandate-templates' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id = 'mandate-templates' AND public.has_role(auth.uid(),'admin'));