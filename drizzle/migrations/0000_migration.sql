create or replace function public.claim_investor_profile()
returns uuid language plpgsql security definer set search_path=public as $$
declare v_email text; v_id uuid;
begin
  if auth.uid() is null then return null; end if;
  select id into v_id from investors where user_id = auth.uid() limit 1;
  if v_id is not null then return v_id; end if;
  select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then return null; end if;
  update investors set user_id = auth.uid()
   where id = (select id from investors where user_id is null and lower(trim(email)) = v_email order by created_at limit 1)
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.claim_investor_profile() from public, anon;
grant execute on function public.claim_investor_profile() to authenticated;