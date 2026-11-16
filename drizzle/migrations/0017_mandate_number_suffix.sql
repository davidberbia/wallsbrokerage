ALTER TABLE public.mandates ADD COLUMN IF NOT EXISTS number_suffix text NOT NULL DEFAULT '';
ALTER TABLE public.mandates DROP CONSTRAINT mandates_number_key;
ALTER TABLE public.mandates ADD CONSTRAINT mandates_number_suffix_key UNIQUE (number, number_suffix);