alter table public.commercial_agents add column if not exists brought_by_ladislas boolean not null default false;
update public.commercial_agents set brought_by_ladislas = true where last_name in ('Carini','de Bono');
update public.commercial_agents set contract_fields = jsonb_set(coalesce(contract_fields,'{}'::jsonb),'{quote_agent}','"90"') where last_name='Carini';
create or replace function public.is_team_manager() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.commercial_agents a where a.sees_team and (a.user_id = auth.uid() or lower(a.email) = lower(auth.jwt()->>'email')))
$$;
grant execute on function public.is_team_manager() to authenticated;