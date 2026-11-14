ALTER TABLE public.mandates ADD COLUMN IF NOT EXISTS asset_title text;
UPDATE public.mandates m SET asset_title = a.title FROM public.assets a WHERE a.id = m.asset_id;
ALTER TABLE public.mandates ALTER COLUMN asset_id DROP NOT NULL;
ALTER TABLE public.mandates DROP CONSTRAINT IF EXISTS mandates_asset_id_fkey;
ALTER TABLE public.mandates ADD CONSTRAINT mandates_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.assets_ensure_mandate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.mandate_start IS NOT NULL OR NEW.mandate_type IS NOT NULL OR NEW.mandate_exclusive IS NOT NULL OR NULLIF(trim(NEW.owner_name),'') IS NOT NULL THEN
    INSERT INTO public.mandates(asset_id, asset_title) VALUES (NEW.id, NEW.title)
    ON CONFLICT (asset_id) DO UPDATE SET asset_title = EXCLUDED.asset_title;
  END IF;
  RETURN NEW;
END $$;
DROP POLICY IF EXISTS "broker manages own mandates" ON public.mandates;
CREATE POLICY "broker manages own mandates" ON public.mandates FOR ALL TO authenticated
  USING ((asset_id IS NULL AND public.has_role(auth.uid(),'admin')) OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)))
  WITH CHECK ((asset_id IS NULL AND public.has_role(auth.uid(),'admin')) OR EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_id AND public.can_see_owner(a.owner_id)));