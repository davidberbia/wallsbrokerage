ALTER TABLE public.brochure_sends
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_message_id text,
  ADD COLUMN IF NOT EXISTS provider_status text,
  ADD COLUMN IF NOT EXISTS clicked_at timestamptz,
  ADD COLUMN IF NOT EXISTS bounced_at timestamptz;

CREATE INDEX IF NOT EXISTS brochure_sends_provider_message_id_idx
  ON public.brochure_sends (provider_message_id);