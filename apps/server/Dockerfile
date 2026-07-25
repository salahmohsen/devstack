# syntax=docker/dockerfile:1
# Server (Hono / Node)
#
# Convention: official Vite+ image + `vp` CLI
# https://viteplus.dev/guide/docker
#
# Runtime keeps monorepo paths so pnpm app-level symlinks
# (`apps/server/node_modules` → `../../node_modules/.pnpm/...`) stay valid.
# No manual symlink rewriting.

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
COPY --chown=vp:vp packages/seo/package.json packages/seo/
COPY --chown=vp:vp packages/ui/package.json packages/ui/
COPY --chown=vp:vp tools/tsconfig/package.json tools/tsconfig/

RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    vp install --frozen-lockfile --prefer-offline --ignore-scripts -- --fetch-timeout=600000

COPY --chown=vp:vp . .

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL DATABASE_URL BETTER_AUTH_SECRET GITHUB_WEBHOOK_SECRET RESEND_API_KEY EMAIL_FROM OPENCODE_API_KEY OPENAI_API_KEY EMBEDDING_MODEL
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
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

RUN vp run --filter @tsu-stack/server build

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --gid 1001 nodejs \
  && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" server

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build --chown=server:nodejs /app/apps/server/dist /app/apps/server/dist
COPY --from=build --chown=server:nodejs /app/packages/db/migrations /app/apps/server/dist/migrations
COPY --from=build --chown=server:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=server:nodejs /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=build --chown=server:nodejs /app/packages /app/packages
COPY --from=build --chown=server:nodejs /app/package.json /app/package.json
COPY --from=build --chown=server:nodejs --chmod=755 /app/docker/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=build --chown=server:nodejs --chmod=755 /app/docker/ensure-db.js /usr/local/bin/ensure-db.js

USER server

# ensure-db.js (outside /app) resolves bare `require("pg")` via NODE_PATH.
ENV NODE_PATH=/app/node_modules:/app/apps/server/node_modules
ENV PORT=5100
ENV MIGRATIONS_FOLDER=/app/apps/server/dist/migrations
ENV RUN_MIGRATIONS=true

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/server/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/apps/server/dist/index.mjs"]
