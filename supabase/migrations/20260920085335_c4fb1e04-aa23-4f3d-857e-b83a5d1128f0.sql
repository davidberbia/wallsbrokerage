-- lovable-cron-fallback-reviewed: avancement par tranches d'un scan Microsoft Graph de 15 700 emails, actif uniquement pendant le scan puis désinscrit automatiquement (utilisateur informé : 1440 passages/jour tant qu'il tourne)
CREATE TABLE public.mailscan_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'arrêté',
  folder text NOT NULL DEFAULT 'inbox',
  next_link text,
  lease_until timestamptz,
  last_error text,
  messages_done integer NOT NULL DEFAULT 0,
  candidates_found integer NOT NULL DEFAULT 0,
  domains_checked integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailscan_state TO authenticated;
GRANT ALL ON public.mailscan_state TO service_role;
ALTER TABLE public.mailscan_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mailscan_state broker" ON public.mailscan_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "mailscan_state viewer read" ON public.mailscan_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

INSERT INTO public.mailscan_state (id) VALUES (true);

CREATE TABLE public.mailscan_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL UNIQUE,
  company_name text,
  verdict text NOT NULL DEFAULT 'inconnu',
  reason text,
  site_url text,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailscan_domains TO authenticated;
GRANT ALL ON public.mailscan_domains TO service_role;
ALTER TABLE public.mailscan_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mailscan_domains broker" ON public.mailscan_domains FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "mailscan_domains viewer read" ON public.mailscan_domains FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE TABLE public.mailscan_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  domain text NOT NULL,
  full_name text,
  first_name text,
  job_title text,
  phone text,
  company_name text,
  address text,
  occurrences integer NOT NULL DEFAULT 1,
  last_seen_at timestamptz,
  status text NOT NULL DEFAULT 'à valider',
  created_investor_id uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  created_contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mailscan_candidates_domain_idx ON public.mailscan_candidates(domain);
CREATE INDEX mailscan_candidates_status_idx ON public.mailscan_candidates(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mailscan_candidates TO authenticated;
GRANT ALL ON public.mailscan_candidates TO service_role;
ALTER TABLE public.mailscan_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mailscan_candidates broker" ON public.mailscan_candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "mailscan_candidates viewer read" ON public.mailscan_candidates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'viewer'));

CREATE TRIGGER mailscan_state_updated_at BEFORE UPDATE ON public.mailscan_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mailscan_domains_updated_at BEFORE UPDATE ON public.mailscan_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mailscan_candidates_updated_at BEFORE UPDATE ON public.mailscan_candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.mailscan_schedule(_on boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'broker') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-mailscan-tick') THEN
      PERFORM cron.schedule('walls-mailscan-tick', '* * * * *', $q$SELECT public.trigger_automation('/api/public/cron/mailscan-tick')$q$);
    END IF;
    PERFORM public.trigger_automation('/api/public/cron/mailscan-tick');
  ELSE
    PERFORM cron.unschedule('walls-mailscan-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-mailscan-tick');
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mailscan_stop_internal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  PERFORM cron.unschedule('walls-mailscan-tick')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-mailscan-tick');
END;
$function$;