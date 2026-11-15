ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS residential_details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.investors ADD COLUMN IF NOT EXISTS residential_criteria jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.comparables ADD COLUMN IF NOT EXISTS acquisition_details jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE TABLE public.commercial_agents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL UNIQUE, phone text, address text, siren text, birth_date date, contract_fields jsonb NOT NULL DEFAULT '{}'::jsonb, contract_path text, signed_contract_path text, envelope_id text, signature_status text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_agents TO authenticated;
GRANT ALL ON public.commercial_agents TO service_role;
ALTER TABLE public.commercial_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY agents_admin ON public.commercial_agents FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TABLE public.extraction_jobs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL, kind text NOT NULL, target_id uuid, url text, status text NOT NULL DEFAULT 'pending', next_run_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, result jsonb, error text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id,kind,target_id), UNIQUE(owner_id,url));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.extraction_jobs TO authenticated;
GRANT ALL ON public.extraction_jobs TO service_role;
ALTER TABLE public.extraction_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_staff ON public.extraction_jobs FOR ALL TO authenticated USING (public.can_see_owner(owner_id)) WITH CHECK (public.can_see_owner(owner_id));
CREATE TABLE public.extraction_control (id boolean PRIMARY KEY DEFAULT true, lease_until timestamptz, next_fetch_at timestamptz, paused_reason text);
GRANT ALL ON public.extraction_control TO service_role;
ALTER TABLE public.extraction_control ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.claim_extraction_job() RETURNS SETOF public.extraction_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.extraction_jobs;
BEGIN
INSERT INTO public.extraction_control(id) VALUES(true) ON CONFLICT DO NOTHING;
UPDATE public.extraction_control SET lease_until=now()+interval '10 minutes' WHERE id AND paused_reason IS NULL AND (lease_until IS NULL OR lease_until<now()) AND (next_fetch_at IS NULL OR next_fetch_at<=now());
IF NOT FOUND THEN RETURN; END IF;
SELECT * INTO j FROM public.extraction_jobs WHERE status='pending' AND next_run_at<=now() ORDER BY next_run_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1;
IF j.id IS NULL THEN UPDATE public.extraction_control SET lease_until=NULL WHERE id; RETURN; END IF;
UPDATE public.extraction_jobs SET status='running', lease_until=now()+interval '10 minutes' WHERE id=j.id RETURNING * INTO j;
RETURN NEXT j;
END $$;
REVOKE ALL ON FUNCTION public.claim_extraction_job() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_extraction_job() TO service_role;
CREATE OR REPLACE FUNCTION public.directory_to_prospect(_id uuid, _company text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE d public.directory_contacts; cid uuid; pid uuid;
BEGIN
IF NOT (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Accès interdit'; END IF;
SELECT * INTO d FROM public.directory_contacts WHERE id=_id FOR UPDATE;
IF d.id IS NULL OR nullif(trim(_company),'') IS NULL THEN RAISE EXCEPTION 'Contact ou société manquant'; END IF;
IF public.person_is_investor(d.email,d.full_name) THEN RAISE EXCEPTION 'Déjà dans Acquéreurs'; END IF;
SELECT id INTO pid FROM public.prospect_contacts WHERE public.person_key_norm(email)=public.person_key_norm(d.email) AND public.person_key_norm(full_name)=public.person_key_norm(d.full_name) LIMIT 1;
IF pid IS NOT NULL THEN RAISE EXCEPTION 'Déjà dans Prospects'; END IF;
SELECT id INTO cid FROM public.prospect_companies WHERE lower(trim(name))=lower(trim(_company)) LIMIT 1;
IF cid IS NULL THEN INSERT INTO public.prospect_companies(name) VALUES(trim(_company)) RETURNING id INTO cid; END IF;
INSERT INTO public.prospect_contacts(company_id,full_name,email,phone,job_title) VALUES(cid,coalesce(nullif(d.full_name,''),d.email,_company),d.email,d.phone,d.job_title) RETURNING id INTO pid;
IF pid IS NULL THEN RAISE EXCEPTION 'Contact déjà classé'; END IF;
IF nullif(d.notes,'') IS NOT NULL THEN UPDATE public.prospect_contacts SET job_title=concat_ws(' — ',job_title,d.notes) WHERE id=pid; END IF;
DELETE FROM public.directory_contacts WHERE id=_id;
RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.directory_to_prospect(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.directory_to_prospect(uuid,text) TO authenticated;