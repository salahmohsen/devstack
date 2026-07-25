# syntax=docker/dockerfile:1
# Agent (Mastra)
#
# Convention: official Vite+ image + `vp` CLI
# https://viteplus.dev/guide/docker
#
# Runtime keeps monorepo paths so pnpm app-level symlinks stay valid.
# No manual symlink rewriting.

FROM ghcr.io/voidzero-dev/vite-plus:latest AS build
WORKDIR /app

ENV NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_PREFER_OFFLINE=true

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

ARG SOURCE_COMMIT DATABASE_URL NODE_ENV
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV}

# Mastra's nested install can hang on flaky registries — hard cap the step.
RUN timeout 600 vp run --filter @tsu-stack/agent build

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --gid 1001 nodejs \
  && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" agent

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build --chown=agent:nodejs /app/apps/agent/.mastra/output /app/apps/agent/.mastra/output
COPY --from=build --chown=agent:nodejs /app/apps/agent/package.json /app/apps/agent/package.json
COPY --from=build --chown=agent:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=agent:nodejs /app/apps/agent/node_modules /app/apps/agent/node_modules
COPY --from=build --chown=agent:nodejs /app/packages /app/packages
COPY --from=build --chown=agent:nodejs /app/package.json /app/package.json
COPY --from=build --chown=agent:nodejs --chmod=755 /app/docker/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=build --chown=agent:nodejs --chmod=755 /app/docker/ensure-db.js /usr/local/bin/ensure-db.js

USER agent

# App-level node_modules holds non-hoisted deps (e.g. pg) for ensure-db.js.
ENV NODE_PATH=/app/node_modules:/app/apps/agent/node_modules

EXPOSE 4111

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4111/api/agents || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/apps/agent/.mastra/output/index.mjs", "--hostname", "0.0.0.0"]
