CREATE OR REPLACE FUNCTION public.deal_contacts_link_mail()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE dname text; ref text;
BEGIN
  NEW.email := lower(trim(NEW.email));
  SELECT trim(name) INTO dname FROM public.deals WHERE id = NEW.deal_id;
  ref := substring(coalesce(dname,'') from '\d{2}_\d{4}');
  -- Un expéditeur peut envoyer plusieurs dossiers : on ne rattache que les mails dont l'objet cite ce lead.
  IF length(coalesce(dname,'')) >= 4 THEN
    UPDATE public.mail_messages SET deal_id = NEW.deal_id
     WHERE deal_id IS NULL AND folder = 'inbox' AND lower(from_email) = NEW.email
       AND (subject ILIKE '%' || replace(replace(dname,'%','\%'),'_','\_') || '%'
            OR (ref IS NOT NULL AND subject LIKE '%' || ref || '%'));
  END IF;
  PERFORM public.deal_touch_activity(NEW.deal_id);
  RETURN NEW;
END $function$;