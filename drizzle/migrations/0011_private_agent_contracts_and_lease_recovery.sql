CREATE POLICY agent_contracts_admin ON storage.objects FOR ALL TO authenticated USING (bucket_id='agent-contracts' AND public.has_role(auth.uid(),'admin')) WITH CHECK (bucket_id='agent-contracts' AND public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.claim_extraction_job() RETURNS SETOF public.extraction_jobs LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.extraction_jobs;
BEGIN
INSERT INTO public.extraction_control(id) VALUES(true) ON CONFLICT DO NOTHING;
UPDATE public.extraction_control SET lease_until=now()+interval '10 minutes' WHERE id AND paused_reason IS NULL AND (lease_until IS NULL OR lease_until<now()) AND (next_fetch_at IS NULL OR next_fetch_at<=now());
IF NOT FOUND THEN RETURN; END IF;
UPDATE public.extraction_jobs SET status='pending',lease_until=NULL WHERE status='running' AND lease_until<now();
SELECT * INTO j FROM public.extraction_jobs WHERE status='pending' AND next_run_at<=now() ORDER BY next_run_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1;
IF j.id IS NULL THEN UPDATE public.extraction_control SET lease_until=NULL WHERE id; RETURN; END IF;
UPDATE public.extraction_jobs SET status='running',lease_until=now()+interval '10 minutes' WHERE id=j.id RETURNING * INTO j;
RETURN NEXT j;
END $$;
REVOKE ALL ON FUNCTION public.claim_extraction_job() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_extraction_job() TO service_role;