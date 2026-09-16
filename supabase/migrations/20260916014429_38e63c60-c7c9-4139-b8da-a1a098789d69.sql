ALTER TABLE public.cfnews_scrape
  ADD COLUMN IF NOT EXISTS retry_only boolean NOT NULL DEFAULT false;