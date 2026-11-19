ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS nas_year_manual boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.sync_asset_nas_year()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE target uuid; targets uuid[];
BEGIN
 IF TG_OP = 'INSERT' THEN targets := ARRAY[NEW.asset_id];
 ELSIF TG_OP = 'DELETE' THEN targets := ARRAY[OLD.asset_id];
 ELSE targets := ARRAY[OLD.asset_id, NEW.asset_id]; END IF;
 FOREACH target IN ARRAY targets LOOP
  IF target IS NOT NULL THEN
   UPDATE public.assets SET nas_year = (SELECT CASE WHEN count(DISTINCT year::integer) = 1 THEN min(year::integer) ELSE NULL END FROM public.nas_folders WHERE asset_id = target AND year ~ '^[12][0-9]{3}$') WHERE id = target AND NOT nas_year_manual;
  END IF;
 END LOOP;
 RETURN NULL;
END $function$;