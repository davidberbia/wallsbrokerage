CREATE OR REPLACE FUNCTION public.assets_ensure_mandate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mandate_start IS NOT NULL OR NEW.mandate_type IS NOT NULL OR NEW.mandate_exclusive IS NOT NULL OR NULLIF(trim(NEW.owner_name),'') IS NOT NULL THEN
    INSERT INTO public.mandates(asset_id) VALUES (NEW.id) ON CONFLICT (asset_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS assets_mandate ON public.assets;
CREATE TRIGGER assets_mandate AFTER INSERT OR UPDATE OF mandate_start, mandate_type, mandate_exclusive, owner_name ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.assets_ensure_mandate();