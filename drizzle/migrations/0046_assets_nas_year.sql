ALTER TABLE public.assets ADD COLUMN nas_year integer CHECK (nas_year BETWEEN 1900 AND 9999);
COMMENT ON COLUMN public.assets.nas_year IS 'Year explicitly recorded in linked NAS folders; NULL when absent or ambiguous. Never derived from file timestamps.';
WITH known AS (SELECT asset_id, CASE WHEN count(DISTINCT year::integer) = 1 THEN min(year::integer) ELSE NULL END AS y FROM public.nas_folders WHERE asset_id IS NOT NULL AND year ~ '^[12][0-9]{3}$' GROUP BY asset_id) UPDATE public.assets a SET nas_year = known.y FROM known WHERE a.id = known.asset_id;
CREATE FUNCTION public.sync_asset_nas_year() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target uuid; targets uuid[];
BEGIN
 IF TG_OP = 'INSERT' THEN targets := ARRAY[NEW.asset_id];
 ELSIF TG_OP = 'DELETE' THEN targets := ARRAY[OLD.asset_id];
 ELSE targets := ARRAY[OLD.asset_id, NEW.asset_id]; END IF;
 FOREACH target IN ARRAY targets LOOP
  IF target IS NOT NULL THEN
   UPDATE public.assets SET nas_year = (SELECT CASE WHEN count(DISTINCT year::integer) = 1 THEN min(year::integer) ELSE NULL END FROM public.nas_folders WHERE asset_id = target AND year ~ '^[12][0-9]{3}$') WHERE id = target;
  END IF;
 END LOOP;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.sync_asset_nas_year() FROM PUBLIC;
CREATE TRIGGER nas_folders_sync_asset_year AFTER INSERT OR DELETE OR UPDATE OF asset_id, year ON public.nas_folders FOR EACH ROW EXECUTE FUNCTION public.sync_asset_nas_year();