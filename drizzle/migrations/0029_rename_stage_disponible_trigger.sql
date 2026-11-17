CREATE OR REPLACE FUNCTION public.deals_stage_route()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE aid uuid;
BEGIN
  IF NEW.stage = 'Perdu' THEN NEW.fee_amount := 0; END IF;
  IF NEW.stage IN ('Avis de valeur','Disponible') AND NEW.asset_id IS NULL THEN
    INSERT INTO public.assets(owner_id,title,address,surface,rent,price,description,status)
    VALUES (NEW.owner_id, NEW.name, NEW.address, NEW.surface, NEW.rent, NEW.amount,
      nullif(concat_ws(E'\n', NEW.stage, nullif(NEW.company,''), nullif(NEW.notes,'')),''), 'disponible')
    RETURNING id INTO aid;
    NEW.asset_id := aid;
  END IF;
  RETURN NEW;
END $function$;