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

## Production

The `Dockerfile` bakes TeX Live into the image. Build and deploy to any container host (Fly.io, Render, Railway, etc.):

```bash
docker build -t kursach-compiler -f apps/compiler/Dockerfile .
```

Point the web app at the deployed URL via `NEXT_PUBLIC_COMPILER_URL`.
