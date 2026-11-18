CREATE TABLE public.linkedin_settings (
  user_id uuid PRIMARY KEY,
  specialty text NOT NULL DEFAULT '',
  market_day int NOT NULL DEFAULT 1 CHECK (market_day BETWEEN 1 AND 28),
  auto_publish boolean NOT NULL DEFAULT false,
  invites_per_day int NOT NULL DEFAULT 10 CHECK (invites_per_day BETWEEN 1 AND 20),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.linkedin_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('actifs','specialite','marche')),
  scheduled_for date NOT NULL DEFAULT current_date,
  body text NOT NULL DEFAULT '',
  chart jsonb,
  status text NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon','publie','ignore')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.linkedin_invites (
  user_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  done_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, contact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linkedin_settings, public.linkedin_sources, public.linkedin_posts, public.linkedin_invites TO authenticated;
GRANT ALL ON public.linkedin_settings, public.linkedin_sources, public.linkedin_posts, public.linkedin_invites TO service_role;
ALTER TABLE public.linkedin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.linkedin_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY own ON public.linkedin_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.linkedin_sources FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.linkedin_posts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY own ON public.linkedin_invites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());