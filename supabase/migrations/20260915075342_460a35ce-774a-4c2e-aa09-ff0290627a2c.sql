-- lovable-cron-fallback-reviewed: 1440 runs/day; extraction lente et discrète d'un site externe (1 page/minute), auto-désactivée à la fin ou en pause
ALTER TABLE public.prospect_companies ADD COLUMN IF NOT EXISTS contacts_scraped_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS prospect_companies_source_url_key ON public.prospect_companies (source_url) WHERE source_url IS NOT NULL;
ALTER TABLE public.prospect_contacts ADD COLUMN IF NOT EXISTS email_checked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS prospect_contacts_source_url_key ON public.prospect_contacts (source_url) WHERE source_url IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.cfnews_scrape (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'idle',
  phase text NOT NULL DEFAULT 'listing',
  page integer NOT NULL DEFAULT 1,
  cookie text,
  cookie_at timestamptz,
  lease_until timestamptz,
  last_error text,
  pages_done integer NOT NULL DEFAULT 0,
  requests_done integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cfnews_scrape (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
GRANT ALL ON public.cfnews_scrape TO service_role;
ALTER TABLE public.cfnews_scrape ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no direct access to cfnews scrape" ON public.cfnews_scrape;
CREATE POLICY "no direct access to cfnews scrape" ON public.cfnews_scrape FOR SELECT TO authenticated USING (false);

CREATE OR REPLACE FUNCTION public.cfnews_scrape_status()
RETURNS TABLE (status text, phase text, page integer, pages_done integer, requests_done integer, last_error text, updated_at timestamptz, companies bigint, contacts bigint, emails bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.status, s.phase, s.page, s.pages_done, s.requests_done, s.last_error, s.updated_at,
    (SELECT count(*) FROM public.prospect_companies),
    (SELECT count(*) FROM public.prospect_contacts),
    (SELECT count(*) FROM public.prospect_contacts WHERE email IS NOT NULL)
  FROM public.cfnews_scrape s
  WHERE s.id AND public.has_role(auth.uid(), 'broker');
$$;

CREATE OR REPLACE FUNCTION public.cfnews_scrape_set(_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'broker') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('idle','running') THEN RAISE EXCEPTION 'invalid status'; END IF;
  UPDATE public.cfnews_scrape SET status = _status, last_error = NULL, updated_at = now() WHERE id;
  IF _status = 'running' THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-cfnews-tick') THEN
      PERFORM cron.schedule('walls-cfnews-tick', '* * * * *', $q$SELECT public.trigger_automation('/api/public/cron/cfnews-tick')$q$);
    END IF;
    PERFORM public.trigger_automation('/api/public/cron/cfnews-tick');
  ELSE
    PERFORM cron.unschedule('walls-cfnews-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-cfnews-tick');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cfnews_scrape_status() FROM public, anon;
REVOKE ALL ON FUNCTION public.cfnews_scrape_set(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cfnews_scrape_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cfnews_scrape_set(text) TO authenticated;