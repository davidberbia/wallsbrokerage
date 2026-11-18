CREATE TABLE public.comparables_geo_stage (id uuid PRIMARY KEY, street text, citycode text, lat double precision, lon double precision, score double precision);
GRANT ALL ON public.comparables_geo_stage TO service_role;
ALTER TABLE public.comparables_geo_stage ENABLE ROW LEVEL SECURITY;