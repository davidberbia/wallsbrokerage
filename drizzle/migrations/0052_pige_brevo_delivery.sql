ALTER TABLE public.lead_pige_contacts ADD COLUMN send_state text NOT NULL DEFAULT 'prepared' CHECK(send_state IN ('prepared','sending','accepted','rejected','uncertain')), ADD COLUMN provider_message_id text, ADD COLUMN send_error text, ADD COLUMN attempt_at timestamptz, ADD COLUMN bounced_at timestamptz;
CREATE UNIQUE INDEX pige_provider_message ON public.lead_pige_contacts(provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE FUNCTION public.claim_pige_brevo(_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT(public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
UPDATE public.lead_pige_contacts c SET send_state='sending',attempt_at=now() FROM public.lead_piges p, public.deals d WHERE c.id=_id AND c.pige_id=p.id AND p.deal_id=d.id AND p.created_by=auth.uid() AND public.can_see_deal(d.owner_id) AND d.stage='Prospection' AND d.lead_status<>'archived' AND p.completed_at IS NULL AND (p.due_at IS NULL OR p.due_at>now()) AND c.sent_at IS NULL AND c.send_state='prepared'; RETURN FOUND; END $$;
REVOKE ALL ON FUNCTION public.claim_pige_brevo(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.claim_pige_brevo(uuid) TO authenticated;
CREATE FUNCTION public.finish_pige_brevo(_id uuid,_state text,_message text,_error text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE pid uuid; BEGIN
IF _state NOT IN ('accepted','rejected','uncertain') THEN RAISE EXCEPTION 'État invalide'; END IF;
UPDATE public.lead_pige_contacts SET send_state=_state,provider_message_id=_message,send_error=_error,sent_at=CASE WHEN _state='accepted' THEN now() ELSE sent_at END WHERE id=_id AND send_state='sending' RETURNING pige_id INTO pid;
IF pid IS NOT NULL AND _state='accepted' THEN UPDATE public.lead_piges SET started_at=coalesce(started_at,now()),due_at=coalesce(due_at,now()+interval '7 days') WHERE id=pid; END IF;
END $$;
REVOKE ALL ON FUNCTION public.finish_pige_brevo(uuid,text,text,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.finish_pige_brevo(uuid,text,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.confirm_pige_contact(uuid) FROM authenticated;
CREATE OR REPLACE FUNCTION public.update_pige_message(_id uuid,_subject text,_body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF length(trim(_subject)) NOT BETWEEN 1 AND 500 OR length(trim(_body)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Message invalide'; END IF;
IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
UPDATE public.lead_pige_contacts c SET subject=trim(_subject),body_text=trim(_body) FROM public.lead_piges p,public.deals d WHERE c.id=_id AND c.pige_id=p.id AND p.deal_id=d.id AND p.created_by=auth.uid() AND p.completed_at IS NULL AND (p.due_at IS NULL OR p.due_at>now()) AND c.sent_at IS NULL AND c.send_state='prepared' AND d.stage='Prospection' AND d.lead_status<>'archived' AND public.can_see_deal(d.owner_id);
IF NOT FOUND THEN RAISE EXCEPTION 'Modification non autorisée'; END IF; END $$;