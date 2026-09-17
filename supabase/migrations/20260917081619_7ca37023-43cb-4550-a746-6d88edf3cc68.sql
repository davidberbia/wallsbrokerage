DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-email-tick') THEN
    PERFORM cron.unschedule('walls-email-tick');
  END IF;
END
$$;