ALTER TABLE public.mandates
  ADD COLUMN IF NOT EXISTS agent_id uuid REFERENCES public.commercial_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS source text;

ALTER TABLE public.investors ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.prospect_companies ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.prospect_contacts ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.directory_contacts ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.mailscan_candidates ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "broker manages investors" ON public.investors;
CREATE POLICY "broker manages investors" ON public.investors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id))
  WITH CHECK (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "broker manages prospect companies" ON public.prospect_companies;
CREATE POLICY "broker manages prospect companies" ON public.prospect_companies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id))
  WITH CHECK (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "broker manages prospect contacts" ON public.prospect_contacts;
CREATE POLICY "broker manages prospect contacts" ON public.prospect_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id))
  WITH CHECK (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "brokers manage directory" ON public.directory_contacts;
CREATE POLICY "brokers manage directory" ON public.directory_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id))
  WITH CHECK (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id));
DROP POLICY IF EXISTS "mailscan_candidates broker" ON public.mailscan_candidates;
CREATE POLICY "mailscan_candidates broker" ON public.mailscan_candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id))
  WITH CHECK (public.has_role(auth.uid(),'broker') AND public.can_see_owner(owner_id));

DROP POLICY IF EXISTS "broker manages own mandates" ON public.mandates;
CREATE POLICY "admin or originating agent mandates" ON public.mandates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.id = agent_id AND c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.commercial_agents c WHERE c.id = agent_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.list_mandate_agents()
RETURNS TABLE(id uuid, name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, trim(first_name || ' ' || last_name) FROM public.commercial_agents
  WHERE public.has_role(auth.uid(),'broker') ORDER BY first_name
$$;
GRANT EXECUTE ON FUNCTION public.list_mandate_agents() TO authenticated;