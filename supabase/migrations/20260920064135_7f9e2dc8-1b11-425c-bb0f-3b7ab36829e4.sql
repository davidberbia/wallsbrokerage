CREATE TABLE public.asset_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_documents TO authenticated;
GRANT ALL ON public.asset_documents TO service_role;

ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker manages asset documents" ON public.asset_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker'))
  WITH CHECK (public.has_role(auth.uid(), 'broker'));

CREATE POLICY "viewer reads asset documents" ON public.asset_documents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE TRIGGER asset_documents_updated_at
  BEFORE UPDATE ON public.asset_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX asset_documents_asset_id_idx ON public.asset_documents(asset_id);

INSERT INTO public.asset_documents (asset_id, path, name, sort_order)
SELECT a.id, a.brochure_url,
       COALESCE(NULLIF(regexp_replace(a.brochure_url, '^.*/', ''), ''), 'brochure.pdf'),
       0
FROM public.assets a
WHERE a.brochure_url IS NOT NULL
  AND a.brochure_url NOT LIKE 'http%';

ALTER TABLE public.campaigns ADD COLUMN documents jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.email_queue ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;