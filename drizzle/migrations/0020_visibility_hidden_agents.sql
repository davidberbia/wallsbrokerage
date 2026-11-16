ALTER TABLE public.commercial_agents ADD COLUMN IF NOT EXISTS hidden_from_team boolean NOT NULL DEFAULT false;
UPDATE public.commercial_agents SET hidden_from_team = true WHERE id = '4e0dc041-6086-47c6-b637-291e8fa8e147';

UPDATE public.directory_contacts SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.prospect_contacts SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.prospect_companies SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.mailscan_candidates SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.investors SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL AND user_id IS NULL;
UPDATE public.assets SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.brochure_sends SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.campaigns SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;
UPDATE public.deals SET owner_id='75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;

CREATE OR REPLACE FUNCTION public.owner_hidden_from_team(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _owner IS NULL OR public.has_role(_owner,'admin')
    OR EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.user_id=_owner AND c.hidden_from_team)
$$;

CREATE OR REPLACE FUNCTION public.can_see_owner(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'broker') AND (
      _owner = auth.uid()
      OR (EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.user_id = auth.uid() AND c.sees_team)
          AND NOT public.owner_hidden_from_team(_owner))
    ))
$$;

CREATE OR REPLACE FUNCTION public.can_see_deal(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.can_see_owner(_owner)
$$;