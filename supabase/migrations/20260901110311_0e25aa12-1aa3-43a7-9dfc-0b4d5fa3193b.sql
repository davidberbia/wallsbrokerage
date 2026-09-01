REVOKE ALL ON FUNCTION public.trigger_automation(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_pump_tick() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.start_email_pump() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_email_pump() TO authenticated;

CREATE POLICY "no direct access to automation config" ON public.automation_config
  FOR SELECT TO authenticated USING (false);