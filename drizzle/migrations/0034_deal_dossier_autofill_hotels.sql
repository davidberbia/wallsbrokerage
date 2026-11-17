ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS keys_count integer, ADD COLUMN IF NOT EXISTS revenue numeric;

CREATE OR REPLACE FUNCTION public.mail_is_digest(_from text, _subject text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT lower(coalesce(_from,'')) = 'synthese@wallsbroker.com'
  OR coalesce(_subject,'') ILIKE '%RESUME JOURNALIER%' OR coalesce(_subject,'') ILIKE 'Synthèse du jour%' $$;

CREATE OR REPLACE FUNCTION public.mail_exclude_digest()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  IF public.mail_is_digest(NEW.from_email, NEW.subject) THEN
    NEW.deal_id := NULL;
    NEW.ai_checked_at := coalesce(NEW.ai_checked_at, now());
    NEW.targets_checked_at := coalesce(NEW.targets_checked_at, now());
    NEW.attachments_listed_at := coalesce(NEW.attachments_listed_at, now());
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS mail_exclude_digest ON public.mail_messages;
CREATE TRIGGER mail_exclude_digest BEFORE INSERT OR UPDATE ON public.mail_messages
  FOR EACH ROW EXECUTE FUNCTION public.mail_exclude_digest();

CREATE OR REPLACE FUNCTION public.deals_stage_route()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE aid uuid;
BEGIN
  IF NEW.stage IN ('Avis de valeur','Disponible') AND NEW.asset_id IS NULL THEN
    INSERT INTO public.assets(owner_id,title,address,surface,rent,price,description,status)
    VALUES (NEW.owner_id, NEW.name, NEW.address, NEW.surface, NEW.rent, NEW.amount,
      nullif(concat_ws(E'\n', NEW.stage, nullif(NEW.company,''), nullif(NEW.notes,'')),''), 'disponible')
    RETURNING id INTO aid;
    NEW.asset_id := aid;
  ELSIF NEW.stage IN ('Avis de valeur','Disponible') THEN
    UPDATE public.assets SET status = 'disponible' WHERE id = NEW.asset_id AND status = 'prospection';
  END IF;
  RETURN NEW;
END $function$;