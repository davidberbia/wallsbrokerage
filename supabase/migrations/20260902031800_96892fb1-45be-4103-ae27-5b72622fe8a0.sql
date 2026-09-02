CREATE TABLE public.rate_limits (
  key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  count INTEGER NOT NULL DEFAULT 0
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.rate_limit_hit(_key TEXT, _limit INTEGER, _window_seconds INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cur public.rate_limits%ROWTYPE;
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '1 day';
  INSERT INTO public.rate_limits(key, window_start, count)
  VALUES (_key, now(), 1)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN public.rate_limits.window_start < now() - make_interval(secs => _window_seconds)
                     THEN 1 ELSE public.rate_limits.count + 1 END,
        window_start = CASE WHEN public.rate_limits.window_start < now() - make_interval(secs => _window_seconds)
                     THEN now() ELSE public.rate_limits.window_start END
  RETURNING * INTO cur;
  RETURN cur.count <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER) TO service_role;