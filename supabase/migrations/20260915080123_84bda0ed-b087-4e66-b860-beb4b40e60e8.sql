DROP INDEX IF EXISTS public.prospect_companies_source_url_key;
DROP INDEX IF EXISTS public.prospect_contacts_source_url_key;
CREATE UNIQUE INDEX prospect_companies_source_url_key ON public.prospect_companies (source_url);
CREATE UNIQUE INDEX prospect_contacts_source_url_key ON public.prospect_contacts (source_url);