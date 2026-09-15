-- lovable-cron-fallback-reviewed: 1440 runs/day; extraction lente d'un site externe, activée à la demande et désactivée automatiquement à la fin
CREATE OR REPLACE FUNCTION public.cfnews_scrape_schedule(_on boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-cfnews-tick') THEN
      PERFORM cron.schedule('walls-cfnews-tick', '* * * * *', $q$SELECT public.trigger_automation('/api/public/cron/cfnews-tick')$q$);
    END IF;
    PERFORM public.trigger_automation('/api/public/cron/cfnews-tick');
  ELSE
    PERFORM cron.unschedule('walls-cfnews-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-cfnews-tick');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.cfnews_scrape_schedule(boolean) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cfnews_scrape_schedule(boolean) TO service_role;