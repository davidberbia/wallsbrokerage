ALTER TABLE public.comparables ADD COLUMN IF NOT EXISTS street text, ADD COLUMN IF NOT EXISTS citycode text, ADD COLUMN IF NOT EXISTS lat double precision, ADD COLUMN IF NOT EXISTS lon double precision;
CREATE INDEX IF NOT EXISTS comparables_class_city_street_idx ON public.comparables (asset_class, city, street);
CREATE INDEX IF NOT EXISTS comparables_postal_idx ON public.comparables (postal_code);
CREATE INDEX IF NOT EXISTS comparables_latlon_idx ON public.comparables (lat, lon);

CREATE OR REPLACE FUNCTION public.comparable_facets()
RETURNS TABLE(asset_class text, city text, street text, n bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT asset_class, city, street, count(*) FROM public.comparables GROUP BY 1,2,3
$$;
GRANT EXECUTE ON FUNCTION public.comparable_facets() TO authenticated;

CREATE OR REPLACE FUNCTION public.find_comparables(_class text, _lat double precision, _lon double precision, _street text, _citycode text, _postal text, _big_city boolean, _limit int DEFAULT 30)
RETURNS SETOF public.comparables
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT c.* FROM public.comparables c
  WHERE c.asset_class = _class AND (
    CASE
      WHEN _class IN ('Commerce périphérie','Activité / Logistique') THEN c.postal_code = _postal
      WHEN _class = 'Commerce centre-ville' AND _big_city THEN lower(c.street) = lower(_street) AND c.citycode = _citycode
      ELSE _lat IS NOT NULL AND c.lat IS NOT NULL
        AND c.lat BETWEEN _lat - 0.0028 AND _lat + 0.0028
        AND 6371000 * 2 * asin(sqrt(power(sin(radians(c.lat - _lat)/2),2) + cos(radians(_lat))*cos(radians(c.lat))*power(sin(radians(c.lon - _lon)/2),2))) <= 300
    END)
  ORDER BY c.deal_date DESC NULLS LAST LIMIT _limit
$$;
GRANT EXECUTE ON FUNCTION public.find_comparables(text,double precision,double precision,text,text,text,boolean,int) TO authenticated;