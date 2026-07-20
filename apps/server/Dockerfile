FROM node:25-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =========================================================================== #

FROM base AS installer

# Install pnpm using npm
RUN npm install -g pnpm

# Copy lockfiles and package.json files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY apps/agent/package.json apps/agent/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/email/package.json packages/email/
COPY packages/env/package.json packages/env/
COPY packages/github/package.json packages/github/
COPY packages/logger/package.json packages/logger/
COPY packages/seo/package.json packages/seo/
COPY packages/ui/package.json packages/ui/
COPY tools/tsconfig/package.json tools/tsconfig/

# Install dependencies
RUN pnpm install --prefer-offline --ignore-scripts --fetch-timeout=600000

# =========================================================================== #

FROM installer AS builder

COPY . .

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL DATABASE_URL BETTER_AUTH_SECRET GITHUB_WEBHOOK_SECRET RESEND_API_KEY EMAIL_FROM OPENCODE_API_KEY OPENAI_API_KEY EMBEDDING_MODEL
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    DATABASE_URL=${DATABASE_URL} \
    GITHUB_WEBHOOK_SECRET=${GITHUB_WEBHOOK_SECRET} \
    RESEND_API_KEY=${RESEND_API_KEY} \
    EMAIL_FROM=${EMAIL_FROM} \
    OPENCODE_API_KEY=${OPENCODE_API_KEY} \
    OPENAI_API_KEY=${OPENAI_API_KEY} \
    EMBEDDING_MODEL=${EMBEDDING_MODEL}

# TODO: Uncomment when you have `test:unit` or `test:e2e` scripts defined in your apps/*/package.json or packages/*/package.json files.
# RUN pnpm run test:unit:run
# RUN pnpm run test:e2e:run

WORKDIR /app/apps/server
RUN pnpm --filter @tsu-stack/server run build

WORKDIR /app

# =========================================================================== #

FROM base AS production

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" server

COPY --from=builder --chown=server:nodejs /app/apps/server/dist /app/dist
COPY --from=builder --chown=server:nodejs /app/packages/db/migrations /app/dist/migrations
# Bring along node_modules so CJS deps externalized by rolldown
# (e.g. @hono/node-server) resolve at runtime. Copying the full
# /app/node_modules tree preserves pnpm's symlink layout (.pnpm/...).
# The server workspace's own node_modules (where pnpm places @hono/node-server)
# must be merged into the root node_modules so that dist/index.mjs can find it.
COPY --from=builder --chown=server:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=server:nodejs /app/apps/server/node_modules /app/node_modules

USER server

# Allow scripts outside /app (e.g. /usr/local/bin/ensure-db.js) to resolve
# bare requires like `require("pg")` from /app/node_modules.
ENV NODE_PATH=/app/node_modules

COPY --from=builder --chown=server:nodejs --chmod=755 /app/docker/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=builder --chown=server:nodejs --chmod=755 /app/docker/ensure-db.js /usr/local/bin/ensure-db.js

ENV NODE_ENV=production
ENV PORT=5100

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/server/health/live || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/dist/index.mjs"]