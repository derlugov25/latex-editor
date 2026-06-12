-- Multi-file projects: per-file rows + main-file/engine settings on projects.
-- Apply via the Supabase SQL editor or the management API.
--
-- File ids are TEXT, not uuid: they double as the Yjs Y.Text key inside the
-- project's collaboration room. Newly created files get a uuid string; projects
-- migrated from the legacy two-column layout reuse the historical Yjs keys
-- 'latex' (main.tex) and 'bibtex' (references.bib) so existing room content
-- keeps working without copying.

create table if not exists public.project_files (
  project_id  uuid not null references public.projects(id) on delete cascade,
  id          text not null,
  path        text not null,
  is_binary   boolean not null default false,
  -- Latest snapshot for text files (live copy is in Liveblocks/Yjs).
  -- NULL for binary files, whose payload lives in the 'project-files'
  -- storage bucket under the key '{project_id}/{id}'.
  content     text,
  size_bytes  integer,
  mime_type   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (project_id, id)
);

create index if not exists project_files_project_idx
  on public.project_files (project_id);

drop trigger if exists project_files_touch_updated_at on public.project_files;
create trigger project_files_touch_updated_at
  before update on public.project_files
  for each row execute function public.touch_updated_at();

alter table public.project_files enable row level security;

drop policy if exists "members read files" on public.project_files;
create policy "members read files" on public.project_files
  for select using (
    public.is_project_owner(project_id) or public.is_project_member(project_id)
  );

drop policy if exists "editors write files" on public.project_files;
create policy "editors write files" on public.project_files
  for all using (
    public.is_project_owner(project_id) or public.is_project_editor(project_id)
  ) with check (
    public.is_project_owner(project_id) or public.is_project_editor(project_id)
  );

-- Project-level compile settings, persisted from the room's meta map.
alter table public.projects
  add column if not exists main_file_id text,
  add column if not exists engine text not null default 'pdflatex';

do $$ begin
  alter table public.projects
    add constraint projects_engine_check
    check (engine in ('pdflatex', 'xelatex', 'lualatex'));
exception when duplicate_object then null;
end $$;
