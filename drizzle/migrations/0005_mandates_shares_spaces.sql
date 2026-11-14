-- Espaces par commercial
ALTER TABLE public.assets ALTER COLUMN owner_id SET DEFAULT auth.uid();
UPDATE public.assets SET owner_id = (SELECT user_id FROM public.user_roles WHERE role='broker' ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
UPDATE public.deals SET owner_id = (SELECT user_id FROM public.user_roles WHERE role='broker' ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_see_owner(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'broker') AND (_owner IS NULL OR _owner = auth.uid()))
$$;

DROP POLICY IF EXISTS "broker manages assets" ON public.assets;
CREATE POLICY "broker manages own assets" ON public.assets FOR ALL TO authenticated
  USING (public.can_see_owner(owner_id)) WITH CHECK (public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "brokers manage deals" ON public.deals;
CREATE POLICY "broker manages own deals" ON public.deals FOR ALL TO authenticated
  USING (public.can_see_owner(owner_id)) WITH CHECK (public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "broker manages asset documents" ON public.asset_documents;
CREATE POLICY "broker manages own asset documents" ON public.asset_documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)));

-- Registre des mandats
CREATE SEQUENCE IF NOT EXISTS public.mandate_number_seq START 202193;
CREATE TABLE public.mandates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number bigint NOT NULL UNIQUE DEFAULT nextval('public.mandate_number_seq'),
  asset_id uuid NOT NULL UNIQUE REFERENCES public.assets(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'brouillon',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mandates TO authenticated;
GRANT ALL ON public.mandates TO service_role;
GRANT USAGE ON SEQUENCE public.mandate_number_seq TO authenticated, service_role;
ALTER TABLE public.mandates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages own mandates" ON public.mandates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)));
CREATE POLICY "viewer reads mandates" ON public.mandates FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER mandates_updated BEFORE UPDATE ON public.mandates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.assets_ensure_mandate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mandate_start IS NOT NULL OR NEW.mandate_type IS NOT NULL OR NEW.mandate_exclusive IS NOT NULL THEN
    INSERT INTO public.mandates(asset_id) VALUES (NEW.id) ON CONFLICT (asset_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assets_mandate AFTER INSERT OR UPDATE OF mandate_start, mandate_type, mandate_exclusive ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_ensure_mandate();
INSERT INTO public.mandates(asset_id)
  SELECT id FROM public.assets WHERE mandate_start IS NOT NULL OR mandate_type IS NOT NULL OR mandate_exclusive IS NOT NULL
  ORDER BY created_at ON CONFLICT DO NOTHING;

-- Partage de documents 15 jours
CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  document_ids uuid[] NOT NULL DEFAULT '{}',
  recipient text,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 days',
  revoked_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages own shares" ON public.document_shares FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)));

CREATE TABLE public.document_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.document_shares(id) ON DELETE CASCADE,
  kind text NOT NULL,
  document_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.document_share_events TO authenticated;
GRANT ALL ON public.document_share_events TO service_role;
ALTER TABLE public.document_share_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker reads own share events" ON public.document_share_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_shares s JOIN public.assets a ON a.id = s.asset_id WHERE s.id = share_id AND public.can_see_owner(a.owner_id)));