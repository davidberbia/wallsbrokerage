ALTER TABLE public.cfnews_scrape
  ADD COLUMN IF NOT EXISTS consecutive_listing_404s integer NOT NULL DEFAULT 0;

CREATE TABLE public.cfnews_failed_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('listing', 'company', 'contact')),
  page integer,
  company_id uuid REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE CASCADE,
  last_status integer,
  last_error text,
  attempts integer NOT NULL DEFAULT 1,
  retry_requested_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.cfnews_failed_urls TO service_role;

ALTER TABLE public.cfnews_failed_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no direct access to cfnews failed urls"
ON public.cfnews_failed_urls
FOR SELECT
TO authenticated
USING (false);

CREATE INDEX cfnews_failed_urls_unresolved_idx
ON public.cfnews_failed_urls (resolved_at, retry_requested_at, updated_at);

CREATE TRIGGER cfnews_failed_urls_updated_at
BEFORE UPDATE ON public.cfnews_failed_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();