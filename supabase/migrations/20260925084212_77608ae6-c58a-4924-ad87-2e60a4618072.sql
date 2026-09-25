-- lovable-cron-fallback-reviewed: Outlook Graph has no push webhook configured; user explicitly chose a 15-minute sync.
DO $$ BEGIN
  PERFORM cron.unschedule('walls-mailsync-tick-midi');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  PERFORM cron.unschedule('walls-mailsync-tick');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule('walls-mailsync-tick', '*/15 * * * *', $$SELECT public.trigger_automation('/api/public/cron/mailsync-tick')$$);