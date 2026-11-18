CREATE TABLE public.lead_document_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
 created_by uuid NOT NULL,
 sender_email text NOT NULL,
 to_email text NOT NULL,
 missing_items jsonb NOT NULL DEFAULT '[]',
 subject text NOT NULL,
 body_text text NOT NULL,
 status text NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared','waiting','sending','reminded','received','cancelled','error')),
 sent_at timestamptz,
 due_at timestamptz,
 reminded_at timestamptz,
 received_at timestamptz,
 conversation_id text,
 error text,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT,INSERT ON public.lead_document_requests TO authenticated;
GRANT ALL ON public.lead_document_requests TO service_role;
ALTER TABLE public.lead_document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_docs_read ON public.lead_document_requests FOR SELECT TO authenticated USING (
 EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) AND EXISTS(SELECT 1 FROM public.deals d WHERE d.id=deal_id AND public.can_see_deal(d.owner_id))
);
CREATE POLICY lead_docs_prepare ON public.lead_document_requests FOR INSERT TO authenticated WITH CHECK (
 created_by=auth.uid() AND status='prepared' AND sent_at IS NULL AND due_at IS NULL AND reminded_at IS NULL AND received_at IS NULL AND conversation_id IS NULL AND error IS NULL AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) AND EXISTS(SELECT 1 FROM public.deals d WHERE d.id=deal_id AND d.stage='Prospection' AND d.lead_status<>'archived' AND public.can_see_deal(d.owner_id))
);
CREATE UNIQUE INDEX lead_docs_one_active ON public.lead_document_requests(deal_id) WHERE status IN ('prepared','waiting','sending');
CREATE INDEX lead_docs_due ON public.lead_document_requests(due_at) WHERE status='waiting';
CREATE TABLE public.lead_followup_control (id boolean PRIMARY KEY DEFAULT true CHECK(id), enabled boolean NOT NULL DEFAULT false);
GRANT SELECT,INSERT,UPDATE ON public.lead_followup_control TO service_role;
ALTER TABLE public.lead_followup_control ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.confirm_lead_document_request(_id uuid,_due timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Accès réservé à l’équipe'; END IF;
 UPDATE public.lead_document_requests r SET status='waiting',sent_at=now(),due_at=_due
 WHERE r.id=_id AND r.created_by=auth.uid() AND r.status='prepared' AND _due >= now()+interval '71 hours'
 AND EXISTS(SELECT 1 FROM public.deals d WHERE d.id=r.deal_id AND d.stage='Prospection' AND d.lead_status<>'archived' AND public.can_see_deal(d.owner_id));
 IF NOT FOUND THEN RAISE EXCEPTION 'Demande inaccessible ou déjà confirmée'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.confirm_lead_document_request(uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_lead_document_request(uuid,timestamptz) TO authenticated;
CREATE OR REPLACE FUNCTION public.claim_lead_document_reminder(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF extract(isodow from now() AT TIME ZONE 'Europe/Paris') IN (6,7) THEN RETURN false; END IF;
 UPDATE public.lead_document_requests r SET status='sending' WHERE r.id=_id AND r.status='waiting' AND r.due_at<=now()
 AND EXISTS(SELECT 1 FROM public.lead_followup_control WHERE id AND enabled)
 AND EXISTS(SELECT 1 FROM public.deals d WHERE d.id=r.deal_id AND d.stage='Prospection' AND d.lead_status<>'archived');
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.claim_lead_document_reminder(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_lead_document_reminder(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.cancel_inactive_lead_documents() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NEW.stage<>'Prospection' OR NEW.lead_status='archived' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
 UPDATE public.lead_document_requests SET status='cancelled' WHERE deal_id=NEW.id AND status IN ('prepared','waiting');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER cancel_inactive_lead_documents AFTER UPDATE OF stage,lead_status,owner_id ON public.deals FOR EACH ROW EXECUTE FUNCTION public.cancel_inactive_lead_documents();