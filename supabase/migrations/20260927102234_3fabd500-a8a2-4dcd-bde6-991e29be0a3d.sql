ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS surface numeric,
  ADD COLUMN IF NOT EXISTS rent numeric,
  ADD COLUMN IF NOT EXISTS vintage integer NOT NULL DEFAULT extract(year from now())::int,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS name_key text,
  ADD COLUMN IF NOT EXISTS suggestion text,
  ADD COLUMN IF NOT EXISTS enrichment text,
  ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
UPDATE public.deals SET stage = 'LOI acceptée' WHERE stage = 'LOI';
UPDATE public.deals SET stage = 'Acte' WHERE stage = 'Signé';
CREATE INDEX IF NOT EXISTS deals_name_key_idx ON public.deals(name_key);
CREATE INDEX IF NOT EXISTS deals_vintage_idx ON public.deals(vintage);

CREATE TABLE public.directory_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'contact' CHECK (kind IN ('contact','broker')),
  full_name text,
  company text,
  email text,
  phone text,
  job_title text,
  notes text,
  candidate_id uuid REFERENCES public.mailscan_candidates(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.directory_contacts TO authenticated;
GRANT ALL ON public.directory_contacts TO service_role;
ALTER TABLE public.directory_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage directory" ON public.directory_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "viewers read directory" ON public.directory_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));
CREATE UNIQUE INDEX directory_contacts_email_idx ON public.directory_contacts(lower(email)) WHERE email IS NOT NULL;
CREATE TRIGGER update_directory_contacts_updated_at BEFORE UPDATE ON public.directory_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.mail_messages ADD COLUMN IF NOT EXISTS targets_checked_at timestamptz;

CREATE TABLE public.target_catchup_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'en cours',
  mails_done integer NOT NULL DEFAULT 0,
  targets_found integer NOT NULL DEFAULT 0,
  fees_found integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.target_catchup_state TO authenticated;
GRANT ALL ON public.target_catchup_state TO service_role;
ALTER TABLE public.target_catchup_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers read catchup" ON public.target_catchup_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'broker'));
INSERT INTO public.target_catchup_state (id) VALUES (true) ON CONFLICT DO NOTHING;

DELETE FROM public.comparables WHERE mail_graph_id LIKE 'call:%';

CREATE OR REPLACE FUNCTION public.targets_catchup_unschedule() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
BEGIN
  PERFORM cron.unschedule('walls-targets-catchup');
EXCEPTION WHEN others THEN NULL;
END $f$;
REVOKE EXECUTE ON FUNCTION public.targets_catchup_unschedule() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.targets_catchup_unschedule() TO service_role;

SELECT cron.schedule('walls-targets-catchup', '0 * * * *', $q$SELECT public.trigger_automation('/api/public/cron/targets-catchup')$q$);