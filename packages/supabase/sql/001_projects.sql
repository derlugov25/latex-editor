-- Schema for LaTeX projects with row-level security tied to Supabase Auth.
-- Apply via the Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  latex_content   text not null default '',
  bibtex_content  text not null default '',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);

-- Default owner to the authenticated user when not provided.
create or replace function public.set_project_owner()
returns trigger language plpgsql as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists projects_set_owner on public.projects;
create trigger projects_set_owner
  before insert on public.projects
  for each row execute function public.set_project_owner();

-- Maintain updated_at on every UPDATE.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

drop policy if exists "owners select" on public.projects;
create policy "owners select" on public.projects
  for select using (owner_id = auth.uid());

drop policy if exists "owners insert" on public.projects;
create policy "owners insert" on public.projects
  for insert with check (owner_id = auth.uid() or owner_id is null);

drop policy if exists "owners update" on public.projects;
create policy "owners update" on public.projects
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "owners delete" on public.projects;
create policy "owners delete" on public.projects
  for delete using (owner_id = auth.uid());
