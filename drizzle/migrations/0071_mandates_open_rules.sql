CREATE OR REPLACE FUNCTION public.can_open_mandate(_agent uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.id=_agent AND c.user_id=auth.uid())
    OR (EXISTS (SELECT 1 FROM public.commercial_agents me WHERE me.user_id=auth.uid() AND me.sees_team)
        AND EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.id=_agent AND NOT c.hidden_from_team
                    AND c.user_id IS NOT NULL AND NOT public.has_role(c.user_id,'admin')))
$$;
DROP POLICY IF EXISTS "admin or originating agent mandates" ON public.mandates;
CREATE POLICY "open mandates by hierarchy" ON public.mandates FOR ALL TO authenticated
  USING (public.can_open_mandate(agent_id)) WITH CHECK (public.can_open_mandate(agent_id));
CREATE OR REPLACE FUNCTION public.list_mandate_registry()
RETURNS TABLE(id uuid, number bigint, number_suffix text, created_at timestamptz, agent_name text, can_open boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT m.id, m.number, m.number_suffix, m.created_at,
    NULLIF(trim(coalesce(c.first_name,'')||' '||coalesce(c.last_name,'')),''),
    public.can_open_mandate(m.agent_id)
  FROM public.mandates m LEFT JOIN public.commercial_agents c ON c.id=m.agent_id
  WHERE public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'broker')
  ORDER BY m.number DESC
$$;
REVOKE ALL ON FUNCTION public.list_mandate_registry() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_mandate_registry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_open_mandate(uuid) TO authenticated;