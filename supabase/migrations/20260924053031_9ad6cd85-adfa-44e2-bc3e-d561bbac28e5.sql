ALTER TABLE public.mail_messages ADD COLUMN IF NOT EXISTS extracted jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.deals ADD COLUMN IF NOT EXISTS address text;