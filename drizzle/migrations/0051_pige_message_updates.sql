CREATE FUNCTION public.update_pige_message(_id uuid, _subject text, _body text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF length(trim(_subject)) NOT BETWEEN 1 AND 500 OR length(trim(_body)) NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'Message invalide'; END IF;
IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')) THEN RAISE EXCEPTION 'Accès refusé'; END IF;
UPDATE public.lead_pige_contacts c SET subject=trim(_subject), body_text=trim(_body) FROM public.lead_piges p, public.deals d WHERE c.id=_id AND c.pige_id=p.id AND p.deal_id=d.id AND p.created_by=auth.uid() AND p.completed_at IS NULL AND (p.due_at IS NULL OR p.due_at>now()) AND c.sent_at IS NULL AND d.stage='Prospection' AND d.lead_status<>'archived' AND public.can_see_deal(d.owner_id);
IF NOT FOUND THEN RAISE EXCEPTION 'Modification non autorisée'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.update_pige_message(uuid,text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.update_pige_message(uuid,text,text) TO authenticated;
CREATE FUNCTION public.close_due_piges(_deal uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')) THEN RETURN; END IF;
UPDATE public.lead_piges p SET completed_at=now() FROM public.deals d WHERE p.deal_id=_deal AND d.id=p.deal_id AND public.can_see_deal(d.owner_id) AND p.completed_at IS NULL AND p.due_at<=now();
END $$;
REVOKE ALL ON FUNCTION public.close_due_piges(uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.close_due_piges(uuid) TO authenticated;