UPDATE public.investors SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.prospect_companies SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.prospect_contacts SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.directory_contacts SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.mailscan_candidates SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_see_owner(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'broker') AND (
      _owner IS NULL OR _owner = auth.uid()
      OR (EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.user_id = auth.uid() AND c.sees_team)
          AND NOT public.has_role(_owner,'admin'))
    ))
$$;

DROP POLICY IF EXISTS "broker manages sends" ON public.brochure_sends;
CREATE POLICY "broker manages visible sends" ON public.brochure_sends FOR ALL TO authenticated
  USING (public.can_see_owner(owner_id)) WITH CHECK (public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "broker manages campaigns" ON public.campaigns;
CREATE POLICY "broker manages visible campaigns" ON public.campaigns FOR ALL TO authenticated
  USING (public.can_see_owner(owner_id)) WITH CHECK (public.can_see_owner(owner_id));

ALTER TABLE public.investors ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.prospect_companies ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.prospect_contacts ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.directory_contacts ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.brochure_sends ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.campaigns ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.assets ALTER COLUMN owner_id SET DEFAULT auth.uid();