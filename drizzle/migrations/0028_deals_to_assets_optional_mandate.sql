CREATE OR REPLACE FUNCTION public.assets_ensure_mandate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.mandates SET asset_title = NEW.title WHERE asset_id = NEW.id AND asset_title IS DISTINCT FROM NEW.title;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.deals_stage_route()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE aid uuid;
BEGIN
  IF NEW.stage = 'Perdu' THEN NEW.fee_amount := 0; END IF;
  IF NEW.stage IN ('Avis de valeur','Commercialisation') AND NEW.asset_id IS NULL THEN
    INSERT INTO public.assets(owner_id,title,address,surface,rent,price,description,status)
    VALUES (NEW.owner_id, NEW.name, NEW.address, NEW.surface, NEW.rent, NEW.amount,
      nullif(concat_ws(E'\n', NEW.stage, nullif(NEW.company,''), nullif(NEW.notes,'')),''), 'disponible')
    RETURNING id INTO aid;
    NEW.asset_id := aid;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS deals_stage_route ON public.deals;
CREATE TRIGGER deals_stage_route BEFORE INSERT OR UPDATE OF stage ON public.deals
FOR EACH ROW EXECUTE FUNCTION public.deals_stage_route();

UPDATE public.deals SET stage = stage WHERE stage IN ('Avis de valeur','Commercialisation','Perdu');