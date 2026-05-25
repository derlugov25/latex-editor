# Production image for the LaTeX compiler service.
# Bake TeX Live into the image and run the prebuilt Nitro output.
FROM texlive/texlive:latest AS texlive

FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/compiler/package.json ./apps/compiler/
COPY packages/compiler-client/package.json ./packages/compiler-client/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/
RUN pnpm install --frozen-lockfile --filter compiler...

FROM deps AS build
COPY packages/compiler-client ./packages/compiler-client
COPY packages/typescript-config ./packages/typescript-config
COPY apps/compiler ./apps/compiler
RUN pnpm --filter compiler build

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends curl ca-certificates perl \
 && rm -rf /var/lib/apt/lists/*

COPY --from=texlive /usr/local/texlive /usr/local/texlive
ENV PATH="/usr/local/texlive/2024/bin/x86_64-linux:${PATH}"

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/apps/compiler/.output ./
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.mjs"]
