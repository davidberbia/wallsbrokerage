ALTER TABLE public.assets
  ADD COLUMN transaction_type text,
  ADD COLUMN address text,
  ADD COLUMN postal_code text,
  ADD COLUMN rent numeric,
  ADD COLUMN owner_name text,
  ADD COLUMN owner_email text,
  ADD COLUMN owner_phone text,
  ADD COLUMN mandate_exclusive boolean,
  ADD COLUMN mandate_type text,
  ADD COLUMN mandate_start date,
  ADD COLUMN mandate_end date;
ALTER TABLE public.asset_documents ADD COLUMN category text NOT NULL DEFAULT 'document';