# compiler

Nitro service that turns LaTeX source into PDF.

## Endpoints

- `POST /api/compile` — body `{ latex: string, bibtex?: string, engine?: "pdflatex" | "xelatex" | "lualatex" }`. Returns `application/pdf` on success or `422` with `{ error, log }` on failure.
- `GET /api/health` — reports whether `pdflatex` is on PATH.

## Local development

Requires a LaTeX distribution on PATH. On macOS:

```bash
brew install --cask mactex-no-gui
```

Then:

```bash
pnpm --filter compiler dev
```

The service listens on `http://localhost:3001` (override with `COMPILER_PORT`).

## Production on Google Cloud Run

The `Dockerfile` bakes a pinned TeX Live image into the runtime and includes
the libraries required by pdfLaTeX, XeLaTeX, and LuaLaTeX. Cloud Run deployment
uses Cloud Build, Artifact Registry, one compile request per instance, and a
shared bearer token known only to the web server and compiler:

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=europe-west3
export COMPILER_API_KEY="$(openssl rand -hex 32)"
./scripts/deploy-compiler-cloud-run.sh
```

Set the returned URL as the web app's server-only `COMPILER_URL`, and set the
same `COMPILER_API_KEY` there. Keep `NEXT_PUBLIC_COMPILER_URL` empty so browser
requests continue through the authenticated same-origin `/api/compile` proxy.
The deployment script stores each token revision in Google Secret Manager and
injects the exact version into the Cloud Run revision.

Each compile work directory also exposes a read-only `compiler-fonts/` link
containing TeX Gyre Termes and Cursor. XeLaTeX/LuaLaTeX sources can reference
those files with `fontspec`'s relative `Path=compiler-fonts/` option while the
service keeps `openin_any=p` enabled.
