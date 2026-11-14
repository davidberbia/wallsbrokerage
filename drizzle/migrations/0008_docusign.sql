CREATE TABLE public.docusign_auth (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  env text NOT NULL DEFAULT 'prod',
  pending_state text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  base_uri text,
  account_id text,
  account_email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.docusign_auth TO service_role;
ALTER TABLE public.docusign_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mandates
  ADD COLUMN IF NOT EXISTS envelope_id text,
  ADD COLUMN IF NOT EXISTS signature_status text,
  ADD COLUMN IF NOT EXISTS signer_email text;