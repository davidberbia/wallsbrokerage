create or replace function public.is_known_investor_email(p_email text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from investors where user_id is null and lower(trim(email)) = lower(trim(p_email)));
$$;
grant execute on function public.is_known_investor_email(text) to anon, authenticated;