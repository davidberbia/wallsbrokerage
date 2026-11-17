CREATE OR REPLACE FUNCTION public.deal_contacts_link_mail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  UPDATE public.mail_messages SET deal_id = NEW.deal_id
   WHERE deal_id IS NULL AND folder = 'inbox' AND lower(from_email) = NEW.email;
  PERFORM public.deal_touch_activity(NEW.deal_id);
  RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.deals_link_mail() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(trim(NEW.name)) >= 4 THEN
    UPDATE public.mail_messages SET deal_id = NEW.id
     WHERE deal_id IS NULL AND folder = 'inbox' AND subject ILIKE '%' || replace(replace(trim(NEW.name),'%','\%'),'_','\_') || '%';
    PERFORM public.deal_touch_activity(NEW.id);
  END IF;
  RETURN NULL;
END $$;