DROP POLICY "Anyone can submit an arbitrage request" ON public.arbitrage_requests;
CREATE POLICY "Anyone can submit a valid arbitrage request" ON public.arbitrage_requests
FOR INSERT TO anon, authenticated
WITH CHECK (
  email IS NOT NULL AND length(email) BETWEEN 3 AND 255 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND coalesce(length(first_name),0) <= 100 AND coalesce(length(last_name),0) <= 100
  AND coalesce(length(phone),0) <= 40 AND coalesce(length(comment),0) <= 5000
  AND coalesce(length(address),0) <= 500 AND coalesce(length(asset_class),0) <= 100
  AND coalesce(length(region),0) <= 100 AND coalesce(length(strategy),0) <= 100
  AND coalesce(length(occupancy),0) <= 100 AND coalesce(length(city_scope),0) <= 200
  AND coalesce(length(periphery_scope),0) <= 200
  AND (price_meur IS NULL OR price_meur BETWEEN 0 AND 100000)
  AND (surface IS NULL OR surface BETWEEN 0 AND 10000000)
  AND (rent_annual IS NULL OR rent_annual BETWEEN 0 AND 1000000000)
  AND (match_count IS NULL OR match_count BETWEEN 0 AND 100000)
);