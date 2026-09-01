-- lovable-cron-fallback-reviewed: 1440 runs/day; the broker requires exactly 1 email per minute from his Outlook mailbox to avoid spam filtering, and the pump is only scheduled while emails are pending and self-unschedules when the queue drains.
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT auth.uid(),
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  brochure_path text,
  brochure_name text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '2 months'),
  status text NOT NULL DEFAULT 'active',
  recap_sent_at timestamptz,
  report_j7_sent_at timestamptz,
  last_weekly_report_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.brochure_sends
  ADD COLUMN campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE TABLE public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  send_id uuid REFERENCES public.brochure_sends(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'brochure',
  to_email text NOT NULL,
  to_name text,
  subject text NOT NULL,
  body_html text NOT NULL,
  attachment_path text,
  attachment_name text,
  status text NOT NULL DEFAULT 'en attente',
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_queue_pending_idx ON public.email_queue (status, scheduled_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_queue TO authenticated;
GRANT ALL ON public.email_queue TO service_role;
ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "broker manages queue" ON public.email_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));

CREATE TABLE public.automation_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  recap_email text NOT NULL DEFAULT 'd.berbia@wallsbroker.com',
  cron_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.automation_config TO service_role;
ALTER TABLE public.automation_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.automation_config (id) VALUES (true);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_automation(path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE tok uuid;
BEGIN
  SELECT cron_token INTO tok FROM public.automation_config WHERE id;
  PERFORM net.http_post(
    url := 'https://project--b477caa1-d3f8-4736-97d0-bb610961a75f.lovable.app' || path,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-token', tok::text),
    body := '{}'::jsonb
  );
END;
$$;

-- Pompe d'envoi : ne tourne que tant qu'il reste des mails en attente.
CREATE OR REPLACE FUNCTION public.email_pump_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.email_queue WHERE status = 'en attente') THEN
    PERFORM public.trigger_automation('/api/public/cron/email-tick');
  ELSE
    PERFORM cron.unschedule('walls-email-tick')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-email-tick');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_email_pump()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'broker') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'walls-email-tick') THEN
    PERFORM cron.schedule('walls-email-tick', '* * * * *', $q$SELECT public.email_pump_tick()$q$);
  END IF;
  PERFORM public.trigger_automation('/api/public/cron/email-tick');
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_email_pump() TO authenticated;

SELECT cron.schedule('walls-email-daily', '30 5 * * *', $$SELECT public.trigger_automation('/api/public/cron/daily')$$);