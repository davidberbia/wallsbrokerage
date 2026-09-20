REVOKE ALL ON FUNCTION public.mailscan_schedule(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mailscan_schedule(boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mailscan_stop_internal() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mailscan_stop_internal() TO service_role;