ALTER TABLE public.commercial_agents ADD COLUMN IF NOT EXISTS sees_team boolean NOT NULL DEFAULT false;
UPDATE public.commercial_agents SET sees_team = true WHERE id = '7253e57a-6398-4628-87f6-9dcda37b458e';
UPDATE public.deals SET owner_id = '75609db9-d2c4-464a-9e77-630bcea90ce9' WHERE owner_id IS NULL;

CREATE OR REPLACE FUNCTION public.can_see_deal(_owner uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR (public.has_role(auth.uid(),'broker') AND (
      _owner = auth.uid()
      OR (EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.user_id = auth.uid() AND c.sees_team)
          AND _owner IS NOT NULL AND NOT public.has_role(_owner,'admin'))
    ))
$$;
GRANT EXECUTE ON FUNCTION public.can_see_deal(uuid) TO authenticated;

DROP POLICY IF EXISTS "broker manages own deals" ON public.deals;
CREATE POLICY "broker manages visible deals" ON public.deals FOR ALL TO authenticated
  USING (public.can_see_deal(owner_id)) WITH CHECK (public.can_see_deal(owner_id));

CREATE OR REPLACE FUNCTION public.list_deal_agents()
RETURNS TABLE(user_id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.user_id, trim(c.first_name || ' ' || c.last_name) FROM public.commercial_agents c
  WHERE c.user_id IS NOT NULL AND public.can_see_deal(c.user_id) ORDER BY c.first_name
$$;
GRANT EXECUTE ON FUNCTION public.list_deal_agents() TO authenticated;