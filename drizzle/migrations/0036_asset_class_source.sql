ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_class_source text;
CREATE OR REPLACE FUNCTION public.assets_class_source_manual()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.asset_class IS DISTINCT FROM OLD.asset_class AND NEW.asset_class_source IS NOT DISTINCT FROM OLD.asset_class_source THEN
    NEW.asset_class_source := 'manual';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assets_class_source_manual ON public.assets;
CREATE TRIGGER assets_class_source_manual BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.assets_class_source_manual();