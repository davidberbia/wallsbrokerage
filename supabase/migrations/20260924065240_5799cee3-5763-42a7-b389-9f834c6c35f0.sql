ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS fee_amount numeric,
  ADD COLUMN IF NOT EXISTS fee_pct numeric,
  ADD COLUMN IF NOT EXISTS probability integer,
  ADD COLUMN IF NOT EXISTS expected_payment_at date,
  ADD COLUMN IF NOT EXISTS paid_at date;

CREATE TABLE public.news_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  title text NOT NULL,
  excerpt text,
  source text,
  mail_graph_id text,
  published_at timestamptz NOT NULL DEFAULT now(),
  investor_id uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  prospect_company_id uuid REFERENCES public.prospect_companies(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company, mail_graph_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_items TO authenticated;
GRANT ALL ON public.news_items TO service_role;
ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage news" ON public.news_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewers read news" ON public.news_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER news_items_updated BEFORE UPDATE ON public.news_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.comparables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'vente',
  address text,
  city text,
  surface numeric,
  price numeric,
  rent numeric,
  price_m2 numeric,
  asset_class text,
  excerpt text NOT NULL,
  source text,
  mail_graph_id text,
  deal_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mail_graph_id, excerpt)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comparables TO authenticated;
GRANT ALL ON public.comparables TO service_role;
ALTER TABLE public.comparables ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brokers manage comparables" ON public.comparables FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker')) WITH CHECK (public.has_role(auth.uid(),'broker'));
CREATE POLICY "viewers read comparables" ON public.comparables FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'viewer'));
CREATE TRIGGER comparables_updated BEFORE UPDATE ON public.comparables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sourcing_scanned (
  graph_id text PRIMARY KEY,
  subject text,
  pdf_count integer NOT NULL DEFAULT 0,
  found integer NOT NULL DEFAULT 0,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sourcing_scanned TO service_role;
ALTER TABLE public.sourcing_scanned ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.followup_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_id uuid NOT NULL REFERENCES public.mail_messages(id) ON DELETE CASCADE,
  tier integer NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mail_id, tier)
);
GRANT ALL ON public.followup_reminders TO service_role;
ALTER TABLE public.followup_reminders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.digest_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  html text NOT NULL,
  speech text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.digest_reports TO service_role;
GRANT SELECT ON public.digest_reports TO authenticated;
ALTER TABLE public.digest_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read digests" ON public.digest_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'broker') OR public.has_role(auth.uid(),'viewer'));

CREATE INDEX IF NOT EXISTS mail_messages_from_idx ON public.mail_messages (from_email);
CREATE INDEX IF NOT EXISTS mail_messages_received_idx ON public.mail_messages (received_at DESC);