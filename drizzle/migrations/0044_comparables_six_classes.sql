-- 1. Normalisation des classes existantes vers les 6 classes fermées
WITH norm AS (
  SELECT id, translate(lower(asset_class), 'éèêëàâäùûüôöîïç', 'eeeeaaauuuooiic') AS c
  FROM public.comparables
  WHERE asset_class IS NOT NULL
)
UPDATE public.comparables t
SET asset_class = CASE
  WHEN n.c ~ 'logist|entrepot|warehouse' THEN 'Logistique'
  WHEN n.c ~ '^(acti|activite)|industri' THEN 'Activité'
  WHEN n.c ~ 'bureau|office|centre d.affaire' THEN 'Bureaux'
  WHEN n.c ~ 'habitat|logement|appart|coliving|chalet|villa|studio|maison|detached|residen|immeuble de rapport|copropriete|loft' THEN 'Logements'
  WHEN n.c ~ 'periph|retail|supermarche|hypermarch|supermarket|moyenne surface|grande surface|club de sport|salle de sport|borne de recharge|galerie marchande|loisir' THEN 'Commerce périphérie'
  WHEN n.c ~ 'commerce|boulangerie|cabinet|clini|medical|hotel|local|laverie|showroom|restaurant|boutique|coiffure|mixte|mixed' THEN 'Commerce centre-ville'
  ELSE NULL
END
FROM norm n
WHERE t.id = n.id;

-- 2. Recherche de proximité alignée sur les 6 classes
CREATE OR REPLACE FUNCTION public.find_comparables(_class text, _lat double precision, _lon double precision, _street text, _citycode text, _postal text, _big_city boolean, _limit int DEFAULT 30)
RETURNS SETOF public.comparables
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT c.* FROM public.comparables c
  WHERE c.asset_class = _class AND (
    CASE
      WHEN _class IN ('Commerce périphérie','Activité','Logistique','Logements') THEN c.postal_code = _postal
      WHEN _class = 'Commerce centre-ville' AND _big_city THEN lower(c.street) = lower(_street) AND c.citycode = _citycode
      ELSE _lat IS NOT NULL AND c.lat IS NOT NULL
        AND c.lat BETWEEN _lat - 0.0028 AND _lat + 0.0028
        AND 6371000 * 2 * asin(sqrt(power(sin(radians(c.lat - _lat)/2),2) + cos(radians(_lat))*cos(radians(c.lat))*power(sin(radians(c.lon - _lon)/2),2))) <= 300
    END)
  ORDER BY c.deal_date DESC NULLS LAST LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.find_comparables(text,double precision,double precision,text,text,text,boolean,int) TO authenticated;