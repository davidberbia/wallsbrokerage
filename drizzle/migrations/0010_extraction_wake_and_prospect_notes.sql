ALTER TABLE public.prospect_contacts ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.extraction_control ADD COLUMN IF NOT EXISTS deployment_ready boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.wake_extractions() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Accès interdit'; END IF;
IF EXISTS(SELECT 1 FROM public.extraction_control WHERE id AND deployment_ready AND paused_reason IS NULL) THEN PERFORM cron.alter_job(34,active:=true); END IF;
END $$;
REVOKE ALL ON FUNCTION public.wake_extractions() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.wake_extractions() TO authenticated;
CREATE OR REPLACE FUNCTION public.sleep_extractions_if_empty() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT EXISTS(SELECT 1 FROM public.extraction_jobs WHERE status='pending') OR EXISTS(SELECT 1 FROM public.extraction_control WHERE id AND (paused_reason IS NOT NULL OR NOT deployment_ready)) THEN PERFORM cron.alter_job(34,active:=false); END IF;
END $$;
REVOKE ALL ON FUNCTION public.sleep_extractions_if_empty() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.sleep_extractions_if_empty() TO service_role;
CREATE OR REPLACE FUNCTION public.enqueue_target_research() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NEW.stage='Cible' AND NEW.owner_id IS NOT NULL THEN
INSERT INTO public.extraction_jobs(owner_id,kind,target_id) VALUES(NEW.owner_id,'research',NEW.id) ON CONFLICT DO NOTHING;
IF EXISTS(SELECT 1 FROM public.extraction_control WHERE id AND deployment_ready AND paused_reason IS NULL) THEN PERFORM cron.alter_job(34,active:=true); END IF;
END IF;
RETURN NEW;
END $$;
CREATE TRIGGER new_target_research AFTER INSERT ON public.deals FOR EACH ROW EXECUTE FUNCTION public.enqueue_target_research();
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
INSERT INTO public.prospect_contacts(company_id,full_name,email,phone,job_title,notes) VALUES(cid,coalesce(nullif(d.full_name,''),d.email,_company),d.email,d.phone,d.job_title,d.notes) RETURNING id INTO pid;
IF pid IS NULL THEN RAISE EXCEPTION 'Contact déjà classé'; END IF;
DELETE FROM public.directory_contacts WHERE id=_id;
RETURN pid;
END $$;