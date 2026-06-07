# kursach-editor-two

Collaborative LaTeX editor — Monaco + Supabase + Liveblocks, with server-side compilation via a containerized Nitro service.

## Layout

```
apps/
  web/         Next.js 16 frontend (App Router, React 19, Tailwind v4 + shadcn)
  compiler/    Nitro service that runs pdflatex/xelatex/lualatex
packages/
  ui/                 shadcn/ui design system (shared components, globals.css)
  latex-editor/       Monaco wrapper + LaTeX/BibTeX languages + completion provider
  compiler-client/    Typed fetch client and shared request/response types
  supabase/           Supabase clients (browser/server/middleware) + project CRUD + SQL
  collab/             Liveblocks room context + Yjs provider + Monaco binding
  eslint-config/      Shared ESLint configs
  typescript-config/  Shared tsconfig presets
```

## Setup

1. Copy `.env.example` to `apps/web/.env.local` and fill in:
   - **Supabase** (project URL + publishable key `sb_publishable_…`, plus optional secret key `sb_secret_…` for admin paths) — create at [supabase.com](https://supabase.com), in **Settings → API Keys**.
   - **Liveblocks** (secret key) — create at [liveblocks.io](https://liveblocks.io).
2. In the Supabase SQL editor, run `packages/supabase/sql/001_projects.sql` to provision the `projects` table with RLS.
3. Install LaTeX locally (only needed when running `apps/compiler` outside Docker):
   ```bash
   brew install --cask mactex-no-gui
   ```
4. Install deps and run dev:
   ```bash
   pnpm install
   pnpm dev
   ```
   This starts `apps/web` on `:3000` and `apps/compiler` on `:3001` in parallel. By default the web app proxies compile requests through `/api/compile` so the browser does not need cross-origin access to `:3001`.

## Adding shadcn components

```bash
pnpm dlx shadcn@latest add <name> -c apps/web
```

Components land in `packages/ui/src/components`. Import as:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Deployment

- **apps/web → Vercel.** Import the repository as a Turborepo project with
  `apps/web` as the Root Directory. Configure the Supabase and Liveblocks
  variables, plus the server-only `COMPILER_URL` and `COMPILER_API_KEY`. Leave
  `NEXT_PUBLIC_COMPILER_URL` empty so compilation is proxied through the
  authenticated Next.js route.
- **apps/compiler → Google Cloud Run.** TeX Live is baked into
  `apps/compiler/Dockerfile`. Deploy through Cloud Build and Artifact Registry:
  ```bash
  export GOOGLE_CLOUD_PROJECT=your-project-id
  export COMPILER_API_KEY="$(openssl rand -hex 32)"
  ./scripts/deploy-compiler-cloud-run.sh
  ```
  The script deploys in `europe-west3` by default with 1 vCPU, 2 GiB RAM,
  concurrency 1, a 300-second request timeout, and scale-to-zero. It versions
  the bearer token in Google Secret Manager and grants the Cloud Run runtime
  service account access to that secret.
