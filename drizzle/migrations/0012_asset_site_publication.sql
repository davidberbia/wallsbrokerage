ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS publish_on_site boolean NOT NULL DEFAULT false;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS hide_street_number boolean NOT NULL DEFAULT false;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS hide_street_name boolean NOT NULL DEFAULT false;