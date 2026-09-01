CREATE TYPE public.app_role AS ENUM ('broker', 'investor');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Attribue un rôle au compte courant : courtier si aucun courtier n'existe, sinon investisseur.
CREATE OR REPLACE FUNCTION public.claim_role()
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  uid uuid := auth.uid();
  existing public.app_role;
  assigned public.app_role;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT role INTO existing FROM public.user_roles WHERE user_id = uid LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'broker') THEN
    assigned := 'investor';
  ELSE
    assigned := 'broker';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (uid, assigned);
  RETURN assigned;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_role() TO authenticated;

ALTER TABLE public.investors
  ADD COLUMN first_name text,
  ADD COLUMN user_id uuid UNIQUE,
  ADD COLUMN profile_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN next_review_at timestamptz NOT NULL DEFAULT (now() + interval '6 months'),
  ALTER COLUMN owner_id DROP NOT NULL;

DROP POLICY "own investors" ON public.investors;
CREATE POLICY "broker manages investors" ON public.investors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "investor reads own profile" ON public.investors FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "investor creates own profile" ON public.investors FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "investor updates own profile" ON public.investors FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY "own assets" ON public.assets;
CREATE POLICY "broker manages assets" ON public.assets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
ALTER TABLE public.assets ALTER COLUMN owner_id DROP NOT NULL;

ALTER TABLE public.brochure_sends
  ADD COLUMN email_to text,
  ADD COLUMN subject text,
  ADD COLUMN tracking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN opened_at timestamptz,
  ADD COLUMN delivered_at timestamptz,
  ADD COLUMN status text NOT NULL DEFAULT 'envoyé',
  ADD COLUMN error text,
  ALTER COLUMN owner_id DROP NOT NULL;
CREATE UNIQUE INDEX brochure_sends_tracking_idx ON public.brochure_sends(tracking_id);

DROP POLICY "own sends" ON public.brochure_sends;
CREATE POLICY "broker manages sends" ON public.brochure_sends FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'broker')) WITH CHECK (public.has_role(auth.uid(), 'broker'));
CREATE POLICY "investor reads own sends" ON public.brochure_sends FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.investors i WHERE i.id = investor_id AND i.user_id = auth.uid()));