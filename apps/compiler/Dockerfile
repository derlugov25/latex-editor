# Production image for the LaTeX compiler service.
# Bake TeX Live into the image and run the prebuilt Nitro output.
FROM texlive/texlive@sha256:c289d6c8b3392d49e9a031ba87092819d8706c63a5d0ba081069b589f10fd903 AS texlive

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

FROM texlive AS runtime
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && useradd --system --create-home --uid 10001 app \
 && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/compiler-fonts \
 && find /usr/local/texlive -type f \
      \( -name 'texgyretermes-*.otf' -o -name 'texgyrecursor-*.otf' \) \
      -exec cp {} /opt/compiler-fonts/ \; \
 && test "$(find /opt/compiler-fonts -type f | wc -l)" -ge 8 \
 && chmod -R a+rX /opt/compiler-fonts

WORKDIR /app
COPY --from=build /app/apps/compiler/.output ./
RUN chown -R app:app /app
USER app
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
CMD ["node", "server/index.mjs"]
