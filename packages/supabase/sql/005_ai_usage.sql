-- AI assistant usage tracking + per-user daily rate limit.
-- The table is only ever touched through the service-role (admin) client and
-- the consume_ai_request() function below; no RLS policies are defined on
-- purpose so anon/authenticated roles cannot read or write it directly.

create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  requests integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;

-- Atomically count one AI request for the user today.
-- Returns allowed=false once the daily limit is exhausted; `used` is capped at
-- p_limit for display ("N of M used"). The raw counter keeps growing past the
-- limit, which is harmless and records over-limit attempts.
create or replace function public.consume_ai_request(p_user_id uuid, p_limit integer)
returns table (allowed boolean, used integer)
language sql
security definer
set search_path = public
as $$
  insert into public.ai_usage as u (user_id, day, requests)
  values (p_user_id, current_date, 1)
  on conflict (user_id, day)
  do update set requests = u.requests + 1, updated_at = now()
  returning u.requests <= p_limit as allowed, least(u.requests, p_limit) as used;
$$;

revoke all on function public.consume_ai_request(uuid, integer) from public, anon, authenticated;

-- Give back one request when the upstream model call failed before producing
-- anything (so transient API errors don't burn the user's quota).
create or replace function public.refund_ai_request(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_usage
  set requests = greatest(requests - 1, 0), updated_at = now()
  where user_id = p_user_id and day = current_date;
$$;

revoke all on function public.refund_ai_request(uuid) from public, anon, authenticated;
