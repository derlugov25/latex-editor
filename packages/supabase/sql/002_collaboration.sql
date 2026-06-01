-- Collaboration: project members + invite links.
-- Apply via the Supabase SQL editor or `supabase db push`.
-- If you see error 42P17 (infinite recursion), run 003_fix_rls_recursion.sql.

-- ============================================================
-- 0. RLS helpers (security definer — avoids projects ↔ members recursion)
-- ============================================================
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

-- ============================================================
-- 1. project_members — stores who has access to which project
-- ============================================================
create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at  timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_members_user_idx
  on public.project_members (user_id);

alter table public.project_members enable row level security;

-- Owner can see all members of their projects
drop policy if exists "owner manages members" on public.project_members;
create policy "owner manages members" on public.project_members
  for all
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- Members can see fellow members and remove themselves
drop policy if exists "member sees peers" on public.project_members;
create policy "member sees peers" on public.project_members
  for select
  using (public.is_project_member(project_id));

drop policy if exists "member removes self" on public.project_members;
create policy "member removes self" on public.project_members
  for delete
  using (user_id = auth.uid());

-- ============================================================
-- 2. project_invites — shareable invite tokens
-- ============================================================
create table if not exists public.project_invites (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'editor' check (role in ('editor', 'viewer')),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.project_invites enable row level security;

-- Owner manages invites
drop policy if exists "owner manages invites" on public.project_invites;
create policy "owner manages invites" on public.project_invites
  for all
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));

-- Any authenticated user can read an invite (the token UUID is the secret)
drop policy if exists "anyone reads invite" on public.project_invites;
create policy "anyone reads invite" on public.project_invites
  for select
  using (auth.uid() is not null);

-- ============================================================
-- 3. Update projects RLS — allow members to select and update
-- ============================================================

-- Replace the owner-only select policy
drop policy if exists "owners select" on public.projects;
create policy "owners or members select" on public.projects
  for select
  using (
    owner_id = auth.uid()
    or public.is_project_member(id)
  );

-- Replace the owner-only update policy
drop policy if exists "owners update" on public.projects;
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

-- insert and delete remain owner-only (unchanged)
