CREATE OR REPLACE FUNCTION public.transfer_asset(_asset_id uuid, _recipient uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE a public.assets; d record;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Accès réservé à l’équipe'; END IF;
 SELECT * INTO a FROM public.assets WHERE id=_asset_id FOR UPDATE;
 IF a.id IS NULL OR NOT public.can_see_owner(a.owner_id) THEN RAISE EXCEPTION 'Actif inaccessible'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commercial_agents c JOIN public.user_roles r ON r.user_id=c.user_id WHERE c.user_id=_recipient AND r.role IN ('admin','broker','viewer')) THEN RAISE EXCEPTION 'Collègue indisponible'; END IF;
 IF a.owner_id=_recipient THEN RAISE EXCEPTION 'Cet actif appartient déjà à ce collègue'; END IF;
 UPDATE public.assets SET owner_id=_recipient WHERE id=a.id;
 FOR d IN SELECT id, owner_id FROM public.deals WHERE asset_id=a.id LOOP
  UPDATE public.deals SET owner_id=_recipient, last_activity_at=now() WHERE id=d.id;
  INSERT INTO public.lead_transfers(deal_id,from_owner,to_owner,transferred_by) VALUES(d.id,d.owner_id,_recipient,auth.uid());
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.transfer_asset(uuid,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.transfer_asset(uuid,uuid) TO authenticated;