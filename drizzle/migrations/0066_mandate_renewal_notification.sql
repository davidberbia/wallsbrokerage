ALTER TABLE public.mandates DROP CONSTRAINT mandates_asset_id_key;
ALTER TABLE public.mandates ADD COLUMN notified_at timestamptz;
COMMENT ON COLUMN public.mandates.notified_at IS 'Date d''envoi de la notification « mandat signé par toutes les parties » au collaborateur affecté (une seule fois).';