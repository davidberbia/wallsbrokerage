ALTER TABLE public.directory_contacts DROP CONSTRAINT IF EXISTS directory_contacts_kind_check;
ALTER TABLE public.directory_contacts ADD CONSTRAINT directory_contacts_kind_check CHECK (kind IN ('contact','broker','notary'));

CREATE OR REPLACE FUNCTION public.person_key_norm(t text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT nullif(lower(regexp_replace(trim(coalesce(t,'')), '\s+', ' ', 'g')), '')
$$;

CREATE OR REPLACE FUNCTION public.person_is_investor(_email text, _name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM investors i
    WHERE public.person_key_norm(i.email) = public.person_key_norm(_email)
      AND public.person_key_norm(i.full_name) = public.person_key_norm(_name))
$$;

CREATE OR REPLACE FUNCTION public.person_is_prospect(_email text, _name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM prospect_contacts p
    WHERE public.person_key_norm(p.email) = public.person_key_norm(_email)
      AND public.person_key_norm(p.full_name) = public.person_key_norm(_name))
$$;

CREATE OR REPLACE FUNCTION public.block_dup_candidate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.person_key_norm(NEW.full_name) IS NOT NULL
     AND (public.person_is_investor(NEW.email, NEW.full_name) OR public.person_is_prospect(NEW.email, NEW.full_name)) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER block_dup_candidate BEFORE INSERT ON public.mailscan_candidates
FOR EACH ROW EXECUTE FUNCTION public.block_dup_candidate();

CREATE OR REPLACE FUNCTION public.block_dup_prospect() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.person_is_investor(NEW.email, NEW.full_name) THEN RETURN NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER block_dup_prospect BEFORE INSERT ON public.prospect_contacts
FOR EACH ROW EXECUTE FUNCTION public.block_dup_prospect();

CREATE OR REPLACE FUNCTION public.block_dup_directory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.person_is_investor(NEW.email, NEW.full_name) THEN
    RAISE EXCEPTION 'Cette personne est déjà dans Investisseurs.' USING ERRCODE = 'P0001';
  ELSIF public.person_is_prospect(NEW.email, NEW.full_name) THEN
    RAISE EXCEPTION 'Cette personne est déjà dans Prospects.' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER block_dup_directory BEFORE INSERT ON public.directory_contacts
FOR EACH ROW EXECUTE FUNCTION public.block_dup_directory();

REVOKE EXECUTE ON FUNCTION public.person_is_investor(text,text), public.person_is_prospect(text,text) FROM anon;