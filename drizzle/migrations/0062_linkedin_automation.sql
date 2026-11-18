ALTER TABLE public.linkedin_posts DROP CONSTRAINT IF EXISTS linkedin_posts_status_check;
ALTER TABLE public.linkedin_posts ADD CONSTRAINT linkedin_posts_status_check CHECK (status IN ('brouillon','valide','publie','echec','ignore'));
ALTER TABLE public.linkedin_posts ADD COLUMN IF NOT EXISTS error text;
CREATE UNIQUE INDEX IF NOT EXISTS linkedin_posts_plan_uniq ON public.linkedin_posts (user_id, kind, scheduled_for) WHERE status <> 'ignore';
UPDATE public.linkedin_settings SET invites_per_day = 10 WHERE invites_per_day > 10;
ALTER TABLE public.linkedin_settings DROP CONSTRAINT IF EXISTS linkedin_settings_invites_per_day_check;
ALTER TABLE public.linkedin_settings ADD CONSTRAINT linkedin_settings_invites_per_day_check CHECK (invites_per_day BETWEEN 1 AND 10);
ALTER TABLE public.linkedin_settings ADD COLUMN IF NOT EXISTS next_invite_at timestamptz;
ALTER TABLE public.linkedin_settings ADD COLUMN IF NOT EXISTS reconnect_required boolean NOT NULL DEFAULT false;

CREATE TABLE public.app_user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connector_id text NOT NULL,
  connection_key_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, connector_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.linkedin_job_state (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  lease_until timestamptz,
  paused_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.linkedin_job_state TO service_role;
ALTER TABLE public.linkedin_job_state ENABLE ROW LEVEL SECURITY;
INSERT INTO public.linkedin_job_state (id) VALUES (true) ON CONFLICT DO NOTHING;