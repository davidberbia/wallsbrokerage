CREATE OR REPLACE FUNCTION public.claim_lead_research(_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.deals;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Accès interdit'; END IF;
 SELECT * INTO d FROM public.deals WHERE id=_id FOR UPDATE;
 IF d.id IS NULL OR NOT public.can_see_deal(d.owner_id) OR d.stage<>'Prospection' OR d.lead_status='archived' THEN RAISE EXCEPTION 'Lead inaccessible'; END IF;
 IF EXISTS(SELECT 1 FROM public.mail_messages WHERE deal_id=_id AND folder='inbox' AND attachments_listed_at IS NULL) OR EXISTS(SELECT 1 FROM public.mail_attachment_jobs WHERE asset_id=d.asset_id AND status='pending') THEN RAISE EXCEPTION 'Les pièces jointes sont encore en cours de lecture'; END IF;
 UPDATE public.extraction_control SET lease_until=now()+interval '10 minutes' WHERE id AND paused_reason IS NULL AND (lease_until IS NULL OR lease_until<now());
 IF NOT FOUND THEN RAISE EXCEPTION 'Une enquête est en cours ou en pause'; END IF;
 INSERT INTO public.extraction_jobs(owner_id,kind,target_id,status,lease_until) VALUES(coalesce(d.owner_id,auth.uid()),'research',d.id,'running',now()+interval '10 minutes')
 ON CONFLICT(owner_id,kind,target_id) DO UPDATE SET status='running',lease_until=now()+interval '10 minutes',error=NULL;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.claim_lead_research(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_lead_research(uuid) TO authenticated;