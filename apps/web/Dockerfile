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

ARG SOURCE_COMMIT VITE_SERVER_URL VITE_WEB_URL VITE_IMGPROXY_URL DATABASE_URL BETTER_AUTH_SECRET
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    VITE_SERVER_URL=${VITE_SERVER_URL} \
    VITE_WEB_URL=${VITE_WEB_URL} \
    VITE_IMGPROXY_URL=${VITE_IMGPROXY_URL} \
    DATABASE_URL=${DATABASE_URL} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}

# TODO: Uncomment when you have `test:unit` or `test:e2e` scripts defined in your apps/*/package.json or packages/*/package.json files.
# RUN pnpm run test:unit:run
# RUN pnpm run test:e2e:run

# Prerender queries the database during the production build, so apply pending
# migrations before the web build spins up its preview server.
# dotenvx (used by the db:migrate script) only passes vars found in the specified
# .env file, so we create a temporary one from the build-time ENVs.
# RUN printf 'DATABASE_URL=%s\nBETTER_AUTH_SECRET=%s\nIS_BUILD=true\n' \
#         "$DATABASE_URL" "$BETTER_AUTH_SECRET" \
#     > packages/env/.env \
#     && pnpm run db:migrate \
#     && rm packages/env/.env

RUN pnpm --filter @tsu-stack/web run build

# =========================================================================== #

FROM base AS production

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" web

COPY --from=builder --chown=web:nodejs /app/apps/web/.output /app/.output

USER web

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/_api/health/live || exit 1

CMD ["node", "/app/.output/server/index.mjs"]