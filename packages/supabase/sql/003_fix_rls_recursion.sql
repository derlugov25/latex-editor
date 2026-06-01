-- Fix infinite recursion (42P17) between projects ↔ project_members RLS policies.
-- Run this in the Supabase SQL editor after 002_collaboration.sql.

-- Security-definer helpers bypass RLS when checking membership/ownership.
create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.projects
    where id = p_project_id and owner_id = auth.uid()
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_project_editor(p_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = auth.uid()
      and role = 'editor'
  );
$$;

revoke all on function public.is_project_owner(uuid) from public;
revoke all on function public.is_project_member(uuid) from public;
revoke all on function public.is_project_editor(uuid) from public;
grant execute on function public.is_project_owner(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_editor(uuid) to authenticated;

-- project_members
drop policy if exists "owner manages members" on public.project_members;
create policy "owner manages members" on public.project_members
  for all
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

drop policy if exists "member sees peers" on public.project_members;
create policy "member sees peers" on public.project_members
  for select
  using (public.is_project_member(project_id));

-- project_invites
drop policy if exists "owner manages invites" on public.project_invites;
create policy "owner manages invites" on public.project_invites
  for all
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- projects
drop policy if exists "owners or members select" on public.projects;
create policy "owners or members select" on public.projects
  for select
  using (
    owner_id = auth.uid()
    or public.is_project_member(id)
  );

drop policy if exists "owners or editors update" on public.projects;
create policy "owners or editors update" on public.projects
  for update
  using (
    owner_id = auth.uid()
    or public.is_project_editor(id)
  )
  with check (
    owner_id = auth.uid()
    or public.is_project_editor(id)
  );
