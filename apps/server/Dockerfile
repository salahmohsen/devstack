# syntax=docker/dockerfile:1
# Server (Hono / Node)
#
# Convention: official Vite+ image + `vp` CLI
# https://viteplus.dev/guide/docker
#
# Vite SSR externalises native drivers (`pg`, `ioredis`, `bullmq`, …).
# Runtime ships a **flattened** production tree via `pnpm deploy` so ESM
# can resolve those packages (monorepo symlink copies break under Docker).

FROM ghcr.io/voidzero-dev/vite-plus:latest AS build
WORKDIR /app

ENV NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5

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
COPY --chown=vp:vp packages/mcp/package.json packages/mcp/
COPY --chown=vp:vp packages/pdf/package.json packages/pdf/
COPY --chown=vp:vp packages/seo/package.json packages/seo/
COPY --chown=vp:vp packages/ui/package.json packages/ui/
COPY --chown=vp:vp tools/tsconfig/package.json tools/tsconfig/

RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    vp install --frozen-lockfile --prefer-offline --ignore-scripts -- --fetch-timeout=600000

COPY --chown=vp:vp . .

# Commit SHA: compose/CI `SOURCE_COMMIT`, future Dokploy `DOKPLOY_COMMIT_*`, or git.
ARG SOURCE_COMMIT=
ARG DOKPLOY_COMMIT_HASH=
ARG DOKPLOY_COMMIT_SHORT=
ARG VITE_SERVER_URL VITE_WEB_URL DATABASE_URL BETTER_AUTH_SECRET GITHUB_WEBHOOK_SECRET RESEND_API_KEY EMAIL_FROM OPENCODE_API_KEY OPENAI_API_KEY EMBEDDING_MODEL
RUN chmod +x docker/resolve-source-commit.sh \
  && docker/resolve-source-commit.sh > /tmp/SOURCE_COMMIT \
  && echo "build SOURCE_COMMIT=$(cat /tmp/SOURCE_COMMIT)"

ENV SOURCE_COMMIT=unknown \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    DATABASE_URL=${DATABASE_URL} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} \
    GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET} \
    RESEND_API_KEY=${RESEND_API_KEY} \
    EMAIL_FROM=${EMAIL_FROM} \
    OPENCODE_API_KEY=${OPENCODE_API_KEY} \
    OPENAI_API_KEY=${OPENAI_API_KEY} \
    EMBEDDING_MODEL=${EMBEDDING_MODEL}

# Export resolved SHA for the build (ENV above is only a default placeholder).
RUN export SOURCE_COMMIT="$(cat /tmp/SOURCE_COMMIT)" \
  && vp run --filter @tsu-stack/server build

# Flatten production deps so externalised packages (pg, ioredis, bullmq, …)
# resolve next to the entrypoint. Same pattern as apps/web Dockerfile.
ENV PNPM_FETCH_TIMEOUT=600000 \
    npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=5
RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    npm install -g corepack@latest \
  && corepack enable \
  && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate \
  && pnpm config set store-dir /home/vp/.local/share/pnpm/store \
  && pnpm config set fetch-timeout 600000 \
  && pnpm config set fetch-retries 5 \
  && pnpm --filter @tsu-stack/server deploy --prod --legacy --prefer-offline --no-optional /tmp/server-deploy \
  && mkdir -p /tmp/server-deploy/dist \
  && cp -a /app/apps/server/dist/. /tmp/server-deploy/dist/ \
  && mkdir -p /tmp/server-deploy/dist/migrations \
  && cp -a /app/packages/db/migrations/. /tmp/server-deploy/dist/migrations/ \
  && cp -a /app/docker/encode-db-url.sh /app/docker/ensure-db.js /tmp/server-deploy/ \
  && test -e /tmp/server-deploy/node_modules/pg/package.json \
  && test -e /tmp/server-deploy/node_modules/ioredis/package.json \
  && test -e /tmp/server-deploy/node_modules/bullmq/package.json \
  && echo "server deploy OK (pg/ioredis/bullmq present)"

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --gid 1001 nodejs \
  && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" server

# Local `pnpm run dev`: Typst 0.14.2 + `uv pip install 'rendercv[full]==2.8'`
# (Python 3.12+). Runtime uses a venv — uv-managed CPython is EXTERNALLY-MANAGED.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
COPY docker/install-pdf-engines.sh /tmp/install-pdf-engines.sh
ARG TARGETARCH
RUN --mount=type=cache,target=/root/.cache/uv \
  chmod +x /tmp/install-pdf-engines.sh \
  && /tmp/install-pdf-engines.sh \
  && rm -f /tmp/install-pdf-engines.sh
ENV PATH="/opt/rendercv/bin:$PATH"
ENV TYPST_FONT_PATHS=/usr/local/share/rendercv-fonts

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build /tmp/SOURCE_COMMIT /etc/tsu-source-commit
COPY --from=build --chown=server:nodejs /tmp/server-deploy /app
COPY --from=build --chown=server:nodejs --chmod=755 /tmp/server-deploy/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=build --chown=server:nodejs --chmod=755 /tmp/server-deploy/ensure-db.js /usr/local/bin/ensure-db.js

USER server

# ensure-db.js (outside /app) resolves bare `require("pg")` via NODE_PATH.
# dist/index.mjs resolves packages by walking up to /app/node_modules (deploy).
ENV NODE_PATH=/app/node_modules
ENV PORT=5100
ENV MIGRATIONS_FOLDER=/app/dist/migrations
ENV RUN_MIGRATIONS=true
# Default when runtime env does not override; entrypoint prefers /etc/tsu-source-commit.
ENV SOURCE_COMMIT=unknown

# start-period covers RUN_MIGRATIONS before the process binds the port.
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s --retries=12 \
  CMD wget -qO- http://127.0.0.1:5100/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/dist/index.mjs"]
