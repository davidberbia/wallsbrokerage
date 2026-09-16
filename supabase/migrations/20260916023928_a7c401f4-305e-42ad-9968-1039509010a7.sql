ALTER TABLE public.prospect_companies
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS asset_classes text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS regions text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS bands jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strategies_by_asset jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS converted_investor_id uuid REFERENCES public.investors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;

CREATE INDEX IF NOT EXISTS prospect_companies_converted_idx
  ON public.prospect_companies (converted_investor_id);