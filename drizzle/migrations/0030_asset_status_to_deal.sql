CREATE OR REPLACE FUNCTION public.assets_status_to_deal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE target text; n int;
BEGIN
  IF NEW.status = 'sous offre' THEN target := 'Offre';
  ELSIF NEW.status = 'vendu' THEN target := 'Vendu';
  ELSE RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF target = 'Vendu' THEN
    UPDATE public.deals SET stage = 'Vendu' WHERE asset_id = NEW.id AND stage <> 'Vendu';
  ELSE
    UPDATE public.deals SET stage = 'Offre' WHERE asset_id = NEW.id AND stage IN ('Prospection','Avis de valeur','Disponible');
  END IF;
  SELECT count(*) INTO n FROM public.deals WHERE asset_id = NEW.id;
  IF n = 0 THEN
    INSERT INTO public.deals(name, stage, asset_id, address, surface, rent, amount, owner_id, vintage)
    VALUES (NEW.title, target, NEW.id, NEW.address, NEW.surface, NEW.rent, NEW.price, NEW.owner_id, extract(year from now())::int);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER assets_status_to_deal AFTER INSERT OR UPDATE OF status ON public.assets FOR EACH ROW EXECUTE FUNCTION public.assets_status_to_deal();