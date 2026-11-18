ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lead_status text NOT NULL DEFAULT 'new';
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS lead_research jsonb;
ALTER TABLE public.deals ADD CONSTRAINT deals_lead_status_check CHECK (lead_status IN ('new','qualified','archived'));

CREATE TABLE public.lead_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deal_id uuid REFERENCES public.deals(id) ON DELETE CASCADE,
 from_owner uuid,
 to_owner uuid NOT NULL,
 transferred_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lead_transfers TO authenticated;
GRANT ALL ON public.lead_transfers TO service_role;
ALTER TABLE public.lead_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_transfer_read ON public.lead_transfers FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR transferred_by=auth.uid() OR to_owner=auth.uid() OR from_owner=auth.uid());

CREATE OR REPLACE FUNCTION public.list_lead_recipients() RETURNS TABLE(user_id uuid,name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT c.user_id,trim(c.first_name || ' ' || c.last_name) FROM public.commercial_agents c
 WHERE c.user_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=auth.uid() AND r.role IN ('admin','broker','viewer'))
 AND EXISTS(SELECT 1 FROM public.user_roles r WHERE r.user_id=c.user_id AND r.role IN ('admin','broker','viewer')) ORDER BY 2
$$;
REVOKE ALL ON FUNCTION public.list_lead_recipients() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_lead_recipients() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.transfer_lead(_deal_id uuid,_recipient uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals; old_owner uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Accès réservé à l’équipe'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=_deal_id FOR UPDATE;
 IF d.id IS NULL OR NOT public.can_see_deal(d.owner_id) OR d.stage<>'Prospection' THEN RAISE EXCEPTION 'Lead inaccessible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commercial_agents c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=_recipient AND r.role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Collègue indisponible'; END IF;
 IF d.owner_id=_recipient THEN RAISE EXCEPTION 'Ce lead appartient déjà à ce collègue'; END IF;
 IF d.asset_id IS NOT NULL THEN
  PERFORM 1 FROM public.assets WHERE id=d.asset_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.deals WHERE asset_id=d.asset_id AND id<>d.id) OR EXISTS(SELECT 1 FROM public.mandates WHERE asset_id=d.asset_id) THEN RAISE EXCEPTION 'Cet actif est lié à une autre affaire ou à un mandat : transfert impossible'; END IF;
  UPDATE public.assets SET owner_id=_recipient WHERE id=d.asset_id;
 END IF;
 old_owner:=d.owner_id;
 UPDATE public.deals SET owner_id=_recipient,last_activity_at=now() WHERE id=d.id;
 UPDATE public.extraction_jobs SET owner_id=_recipient WHERE target_id=d.id AND kind='research';
 INSERT INTO public.lead_transfers(deal_id,from_owner,to_owner,transferred_by) VALUES(d.id,old_owner,_recipient,auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.transfer_lead(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.transfer_lead(uuid,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.require_lead_class() RETURNS trigger
LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF OLD.stage='Prospection' AND NEW.stage IS DISTINCT FROM OLD.stage AND NOT EXISTS(SELECT 1 FROM public.assets WHERE id=NEW.asset_id AND nullif(trim(asset_class),'') IS NOT NULL) THEN
  RAISE EXCEPTION 'Choisissez une classe d’actif avant de changer le statut';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER aa_require_lead_class BEFORE UPDATE OF stage ON public.deals FOR EACH ROW EXECUTE FUNCTION public.require_lead_class();

CREATE OR REPLACE FUNCTION public.enqueue_target_research() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.stage='Prospection' AND NEW.owner_id IS NOT NULL THEN
  INSERT INTO public.extraction_jobs(owner_id,kind,target_id,next_run_at) VALUES(NEW.owner_id,'research',NEW.id,now()+interval '2 minutes') ON CONFLICT DO NOTHING;
  IF EXISTS(SELECT 1 FROM public.extraction_control WHERE id AND deployment_ready AND paused_reason IS NULL) THEN PERFORM cron.alter_job(34,active:=true); END IF;
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.claim_attachment_lease() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE public.attachment_control SET lease_until=now()+interval '10 minutes' WHERE id AND paused_reason IS NULL AND (lease_until IS NULL OR lease_until<now());
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_attachment_lease() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_attachment_lease() TO service_role;