DROP FUNCTION IF EXISTS public.cfnews_scrape_status();
DROP FUNCTION IF EXISTS public.cfnews_scrape_set(text);

REVOKE EXECUTE ON FUNCTION public.email_pump_tick() FROM authenticated, anon, public;
REVOKE EXECUTE ON FUNCTION public.trigger_automation(text) FROM authenticated, anon, public;

DROP POLICY IF EXISTS "no direct access to rate limits" ON public.rate_limits;
CREATE POLICY "no direct access to rate limits" ON public.rate_limits FOR SELECT TO authenticated USING (false);