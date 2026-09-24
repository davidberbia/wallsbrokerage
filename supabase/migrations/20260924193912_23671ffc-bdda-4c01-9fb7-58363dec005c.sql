-- lovable-cron-fallback-reviewed: bounded historical backfill, job unschedules itself when finished or paused
CREATE TABLE public.ai_scan_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  status text NOT NULL DEFAULT 'arrêté',
  folder text NOT NULL DEFAULT 'inbox',
  next_link text,
  lease_until timestamptz,
  last_error text,
  messages_done integer NOT NULL DEFAULT 0,
  attachments_done integer NOT NULL DEFAULT 0,
  attachments_dup integer NOT NULL DEFAULT 0,
  attachments_skipped integer NOT NULL DEFAULT 0,
  contacts_found integer NOT NULL DEFAULT 0,
  comparables_found integer NOT NULL DEFAULT 0,
  news_found integer NOT NULL DEFAULT 0,
  last_mail_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ai_scan_state TO authenticated;
GRANT ALL ON public.ai_scan_state TO service_role;
ALTER TABLE public.ai_scan_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker all ai_scan_state" ON public.ai_scan_state FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewer read ai_scan_state" ON public.ai_scan_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER ai_scan_state_updated BEFORE UPDATE ON public.ai_scan_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.ai_scan_state(id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.mail_attachments_seen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hash text NOT NULL UNIQUE,
  name text,
  content_type text,
  size integer,
  first_graph_id text,
  status text NOT NULL DEFAULT 'lu',
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mail_attachments_seen TO authenticated;
GRANT ALL ON public.mail_attachments_seen TO service_role;
ALTER TABLE public.mail_attachments_seen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker read attachments_seen" ON public.mail_attachments_seen FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'broker'));
CREATE TRIGGER mail_attachments_seen_updated BEFORE UPDATE ON public.mail_attachments_seen
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.aiscan_schedule(_on boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'broker') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _on THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname='walls-aiscan-tick') THEN
      PERFORM cron.schedule('walls-aiscan-tick','* * * * *',$q$SELECT public.trigger_automation('/api/public/cron/aiscan-tick')$q$);
    END IF;
  ELSE
    PERFORM cron.unschedule('walls-aiscan-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='walls-aiscan-tick');
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.aiscan_schedule(boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.aiscan_schedule(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.aiscan_stop_internal()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions' AS $$
BEGIN
  PERFORM cron.unschedule('walls-aiscan-tick') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='walls-aiscan-tick');
END $$;
REVOKE EXECUTE ON FUNCTION public.aiscan_stop_internal() FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.aiscan_stop_internal() TO service_role;