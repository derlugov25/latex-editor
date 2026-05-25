# @workspace/supabase

Supabase clients and project CRUD helpers, plus the SQL needed to provision the database.

## Subpath exports

- `@workspace/supabase/browser` — `createClient()` for Client Components / hooks. Uses the **publishable** key.
- `@workspace/supabase/server` — `createClient()` for Server Components, Server Actions, and Route Handlers (cookie-aware via `next/headers`). Uses the **publishable** key — RLS still applies; user identity comes from the session cookie.
- `@workspace/supabase/middleware` — `updateSession(req)` for `apps/web/proxy.ts`.
- `@workspace/supabase/projects` — typed CRUD over `public.projects`.
- `@workspace/supabase/types` — `Database` and row types.
- `@workspace/supabase/env` — `publicEnv()` (URL + publishable key) and `secretEnv()` (URL + secret key, server-only).

## Required env

This project uses Supabase's **new API keys** (`sb_publishable_…` and `sb_secret_…`), not the legacy `anon` / `service_role` JWTs.

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...   # server-only; only needed if you call secretEnv()
```

When to use which:

| Use case | Function | Key |
|---|---|---|
| Client Components, browser-side hooks | `createClient` from `./browser` | publishable |
| Server Components, Server Actions, Route Handlers (operating as the signed-in user) | `createClient` from `./server` | publishable |
| Edge proxy / session refresh | `updateSession` from `./middleware` | publishable |
| Admin tasks that must bypass RLS (cron jobs, webhooks, internal-only endpoints) | `createClient` from `@supabase/supabase-js` with `secretEnv()` | secret |

Keys can be created and rotated under **Settings → API Keys** in the Supabase dashboard. Never commit secret keys; never reference `SUPABASE_SECRET_KEY` from a `"use client"` module.

## Schema

Apply `sql/001_projects.sql` in the Supabase SQL editor (or via `supabase db push`). It creates `public.projects` with RLS scoped to the authenticated owner, and triggers for `owner_id` defaulting and `updated_at` bumping.
