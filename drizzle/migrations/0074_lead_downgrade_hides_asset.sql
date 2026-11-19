CREATE OR REPLACE FUNCTION public.assets_status_to_deal_dummy() RETURNS void LANGUAGE sql AS $$ select 1 $$;
DROP FUNCTION public.assets_status_to_deal_dummy();
CREATE OR REPLACE FUNCTION public.deals_stage_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  ELSIF NEW.stage = 'Prospection' AND NEW.asset_id IS NOT NULL THEN
    UPDATE public.assets SET status = 'prospection' WHERE id = NEW.asset_id AND status = 'disponible';
  END IF;
  RETURN NEW;
END $$;
UPDATE public.assets a SET status = 'prospection'
WHERE a.status = 'disponible'
  AND EXISTS (SELECT 1 FROM public.deals d WHERE d.asset_id = a.id AND d.stage = 'Prospection')
  AND NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.asset_id = a.id AND d.stage <> 'Prospection');