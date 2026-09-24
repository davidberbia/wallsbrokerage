-- lovable-cron-fallback-reviewed: Outlook mailbox delta sync via connector gateway has no push available; 15-minute delay accepted by plan
CREATE TABLE public.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  stage text NOT NULL DEFAULT 'Cible',
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  company text,
  contact_name text,
  amount numeric,
  notes text,
  last_activity_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO authenticated;
GRANT ALL ON public.deals TO service_role;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage deals" ON public.deals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewers read deals" ON public.deals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER deals_updated BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.deal_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  investor_id uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  prospect_contact_id uuid REFERENCES public.prospect_contacts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_contacts TO authenticated;
GRANT ALL ON public.deal_contacts TO service_role;
ALTER TABLE public.deal_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage deal contacts" ON public.deal_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewers read deal contacts" ON public.deal_contacts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER deal_contacts_updated BEFORE UPDATE ON public.deal_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX deal_contacts_deal_idx ON public.deal_contacts(deal_id);

CREATE TABLE public.mail_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id text NOT NULL UNIQUE,
  folder text NOT NULL,
  received_at timestamptz,
  subject text,
  from_email text,
  from_name text,
  participants text[] NOT NULL DEFAULT '{}',
  to_display text,
  preview text,
  web_link text,
  deal_id uuid REFERENCES public.deals(id) ON DELETE SET NULL,
  linked_manually boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mail_messages TO authenticated;
GRANT ALL ON public.mail_messages TO service_role;
ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage mail" ON public.mail_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewers read mail" ON public.mail_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER mail_messages_updated BEFORE UPDATE ON public.mail_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX mail_messages_deal_idx ON public.mail_messages(deal_id, received_at DESC);
CREATE INDEX mail_messages_participants_idx ON public.mail_messages USING gin(participants);
CREATE INDEX mail_messages_received_idx ON public.mail_messages(received_at DESC);

CREATE TABLE public.mail_sync_state (
  folder text PRIMARY KEY,
  next_link text,
  delta_link text,
  lease_until timestamptz,
  last_error text,
  last_sync_at timestamptz,
  messages_synced integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mail_sync_state TO authenticated;
GRANT ALL ON public.mail_sync_state TO service_role;
ALTER TABLE public.mail_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read mail sync" ON public.mail_sync_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'));
INSERT INTO public.mail_sync_state(folder) VALUES ('inbox'),('sentitems');

-- Rattachement automatique
CREATE OR REPLACE FUNCTION public.deal_touch_activity(_deal uuid) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.deals d SET last_activity_at = GREATEST(COALESCE(d.last_activity_at,'epoch'),
    COALESCE((SELECT max(received_at) FROM public.mail_messages WHERE deal_id = _deal),'epoch'))
  WHERE d.id = _deal;
$$;

CREATE OR REPLACE FUNCTION public.deal_contacts_link_mail() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.email := lower(trim(NEW.email));
  UPDATE public.mail_messages SET deal_id = NEW.deal_id
   WHERE deal_id IS NULL AND participants @> ARRAY[NEW.email];
  PERFORM public.deal_touch_activity(NEW.deal_id);
  RETURN NEW;
END $$;
CREATE TRIGGER deal_contacts_link BEFORE INSERT ON public.deal_contacts
  FOR EACH ROW EXECUTE FUNCTION public.deal_contacts_link_mail();

CREATE OR REPLACE FUNCTION public.deals_link_mail() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(trim(NEW.name)) >= 4 THEN
    UPDATE public.mail_messages SET deal_id = NEW.id
     WHERE deal_id IS NULL AND subject ILIKE '%' || replace(replace(trim(NEW.name),'%','\%'),'_','\_') || '%';
    PERFORM public.deal_touch_activity(NEW.id);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER deals_link AFTER INSERT ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_link_mail();

REVOKE EXECUTE ON FUNCTION public.deal_touch_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deal_contacts_link_mail() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deals_link_mail() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('walls-mailsync-tick', '*/15 * * * *',
  $q$SELECT public.trigger_automation('/api/public/cron/mailsync-tick')$q$);