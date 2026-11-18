ALTER TABLE public.investors ADD COLUMN IF NOT EXISTS email_bounced_at timestamptz;
CREATE OR REPLACE FUNCTION public.investors_clear_bounce() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF lower(coalesce(NEW.email,'')) IS DISTINCT FROM lower(coalesce(OLD.email,'')) THEN NEW.email_bounced_at := NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS investors_clear_bounce ON public.investors;
CREATE TRIGGER investors_clear_bounce BEFORE UPDATE OF email ON public.investors FOR EACH ROW EXECUTE FUNCTION public.investors_clear_bounce();
UPDATE public.investors i SET email_bounced_at = b.at FROM (
  SELECT lower(email_to) e, max(bounced_at) at FROM public.brochure_sends WHERE provider_status IN ('hard_bounce','invalid','blocked') AND bounced_at IS NOT NULL GROUP BY 1
  UNION ALL
  SELECT lower(email), max(bounced_at) FROM public.lead_pige_contacts WHERE bounced_at IS NOT NULL GROUP BY 1
) b WHERE lower(i.email) = b.e AND i.email_bounced_at IS NULL;