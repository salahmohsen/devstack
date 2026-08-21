# syntax=docker/dockerfile:1
# Web (TanStack Start / Nitro SSR)
#
# Conventions:
# - Build with official Vite+ image + `vp` (https://viteplus.dev/guide/docker)
# - Activate package manager via corepack + package.json "packageManager"
# - Ship SSR externals with `pnpm deploy` (pnpm monorepo deploy standard)
#   so bare imports like `import "drizzle-orm"` resolve from
#   apps/web/.output/server/_ssr/ → apps/web/.output/node_modules/

FROM ghcr.io/voidzero-dev/vite-plus:latest AS build
WORKDIR /app

ENV NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5

# Manifests first for layer caching (every workspace package.json).
COPY --chown=vp:vp package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version* .npmrc* ./
COPY --chown=vp:vp apps/agent/package.json apps/agent/
COPY --chown=vp:vp apps/server/package.json apps/server/
COPY --chown=vp:vp apps/web/package.json apps/web/
COPY --chown=vp:vp packages/api/package.json packages/api/
COPY --chown=vp:vp packages/auth/package.json packages/auth/
COPY --chown=vp:vp packages/core/package.json packages/core/
COPY --chown=vp:vp packages/db/package.json packages/db/
COPY --chown=vp:vp packages/email/package.json packages/email/
COPY --chown=vp:vp packages/env/package.json packages/env/
COPY --chown=vp:vp packages/github/package.json packages/github/
COPY --chown=vp:vp packages/logger/package.json packages/logger/
COPY --chown=vp:vp packages/seo/package.json packages/seo/
COPY --chown=vp:vp packages/ui/package.json packages/ui/
COPY --chown=vp:vp tools/tsconfig/package.json tools/tsconfig/

RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    vp install --frozen-lockfile --prefer-offline --ignore-scripts -- --fetch-timeout=600000

COPY --chown=vp:vp . .

# Commit SHA: compose/CI, future Dokploy DOKPLOY_COMMIT_*, or git (see .dockerignore).
ARG SOURCE_COMMIT=
ARG DOKPLOY_COMMIT_HASH=
ARG DOKPLOY_COMMIT_SHORT=
ARG VITE_SERVER_URL VITE_WEB_URL VITE_IMGPROXY_URL DATABASE_URL BETTER_AUTH_SECRET
RUN chmod +x docker/resolve-source-commit.sh \
  && docker/resolve-source-commit.sh > /tmp/SOURCE_COMMIT \
  && echo "build SOURCE_COMMIT=$(cat /tmp/SOURCE_COMMIT)"

ENV SOURCE_COMMIT=unknown \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    VITE_IMGPROXY_URL=${VITE_IMGPROXY_URL} \
    DATABASE_URL=${DATABASE_URL} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# Vite bakes SOURCE_COMMIT into the client bundle at build time.
RUN export SOURCE_COMMIT="$(cat /tmp/SOURCE_COMMIT)" \
  && vp run --filter @tsu-stack/web build

# Flatten web's production dependency tree next to Nitro output. SSR chunks
# externalise native/driver packages (`pg`, `drizzle-orm/node-postgres`);
# Node resolves those by walking up from `.output/server/_ssr/`.
#
# `pnpm deploy` is the package-manager standard for extracting a workspace
# package + its runtime deps. Activated via corepack from package.json.
# `--legacy`: this monorepo uses normal workspace:* links (not
# inject-workspace-packages); pnpm v10+ requires legacy mode for that.
#
# Reuse the same BuildKit pnpm store as `vp install` and force long fetch
# timeouts + prefer-offline. Without the store mount, deploy re-downloads
# large tarballs (optional next peers) and hits pnpm's default ~60s
# timeout → curl error 23 / TimeoutError on slow hosts.
# `--no-optional`: skip optional peers like `next` (TanStack Start, not Next).
ENV PNPM_FETCH_TIMEOUT=600000 \
    npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=5
RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    corepack enable \
  && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate \
  && pnpm config set store-dir /home/vp/.local/share/pnpm/store \
  && pnpm config set fetch-timeout 600000 \
  && pnpm config set fetch-retries 5 \
  && pnpm --filter @tsu-stack/web deploy --prod --legacy --prefer-offline --no-optional /tmp/web-deploy \
  && cp -a /tmp/web-deploy/node_modules /app/apps/web/.output/node_modules \
  && rm -rf /app/apps/web/.output/server/node_modules/tslib \
  && if [ -e /tmp/web-deploy/node_modules/tslib ]; then \
       mkdir -p /app/apps/web/.output/server/node_modules \
       && cp -a /tmp/web-deploy/node_modules/tslib /app/apps/web/.output/server/node_modules/tslib; \
     fi \
  && rm -rf /tmp/web-deploy

# Exact Node matching .node-version (official Vite+ runtime pattern).
RUN cp "$(vp env which node | head -1)" /tmp/node

# --- runtime: glibc, no toolchain ---
FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --gid 1001 nodejs \
  && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" web

# Only ship Nitro output (includes flattened node_modules from deploy).
COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build /tmp/SOURCE_COMMIT /etc/tsu-source-commit
COPY --from=build --chown=web:nodejs /app/apps/web/.output /app/.output
COPY --from=build --chmod=755 /app/docker/run-with-source-commit.sh /usr/local/bin/run-with-source-commit.sh

USER web
ENV PORT=3000
ENV SOURCE_COMMIT=unknown

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/_api/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/run-with-source-commit.sh"]
CMD ["node", "/app/.output/server/index.mjs"]
