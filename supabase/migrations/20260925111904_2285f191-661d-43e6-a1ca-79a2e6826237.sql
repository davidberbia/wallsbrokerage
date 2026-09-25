-- lovable-cron-fallback-reviewed: David exige une synchro Cube ACR toutes les 30 min de 8h à 22h ; Google Drive n'offre pas de webhook simple sur ce dossier.
CREATE TABLE public.call_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text NOT NULL UNIQUE,
  file_name text NOT NULL,
  contact_name text,
  phone text,
  channel text,
  direction text,
  called_at timestamptz,
  size integer,
  status text NOT NULL DEFAULT 'en attente',
  transcript text,
  summary text,
  actions text,
  found_contacts integer NOT NULL DEFAULT 0,
  found_comparables integer NOT NULL DEFAULT 0,
  found_news integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.call_recordings TO authenticated;
GRANT ALL ON public.call_recordings TO service_role;
ALTER TABLE public.call_recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brokers read calls" ON public.call_recordings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'broker'));
CREATE POLICY "Brokers delete calls" ON public.call_recordings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'broker'));
CREATE TRIGGER call_recordings_updated BEFORE UPDATE ON public.call_recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

SELECT cron.schedule('walls-calls-tick', '*/30 6-20 * * *', $q$SELECT public.trigger_automation('/api/public/cron/calls-tick')$q$);