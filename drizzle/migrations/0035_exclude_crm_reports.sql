CREATE OR REPLACE FUNCTION public.mail_is_digest(_from text, _subject text)
 RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public'
AS $$ SELECT lower(coalesce(_from,'')) = 'synthese@wallsbroker.com'
  OR coalesce(_subject,'') ILIKE '%RESUME JOURNALIER%' OR coalesce(_subject,'') ILIKE 'Synthèse du jour%'
  OR coalesce(_subject,'') ILIKE 'Récap hebdomadaire%' OR coalesce(_subject,'') ILIKE 'Récapitulatif d''envoi%' $$;