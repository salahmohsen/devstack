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

ARG SOURCE_COMMIT DATABASE_URL NODE_ENV
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV} \
    # Mastra's internal `npm install` for the bundled output can hang on
    # slow/flaky registry connections inside the Dokploy build env. Cap any
    # single fetch to 5 minutes and prefer the cache, so a transient
    # network blip fails fast instead of stalling the build indefinitely.
    NPM_CONFIG_FETCH_TIMEOUT=300000 \
    NPM_CONFIG_PREFER_OFFLINE=true

RUN timeout 600 pnpm --filter @tsu-stack/agent run build

WORKDIR /app

# pnpm places non-hoisted packages (e.g. pg) in apps/agent/node_modules as
# symlinks whose targets are depth-relative to apps/agent/node_modules
# (e.g. '../../../node_modules/.pnpm/.../node_modules/pg' — three '..'s
# because the symlink sits 3 dirs below the workspace root). The
# Dockerfile overlay-COPYs apps/agent/node_modules onto /app/node_modules,
# which moves those symlinks to depth 2 and breaks the relative targets.
# Rewrite each symlink to target the same .pnpm package via a path that
# is valid from the destination depth (i.e. just '.pnpm/...'), so that
# once overlaid onto /app/node_modules the symlink resolves to the real
# package in /app/node_modules/.pnpm/ (which the preceding COPY of the
# root node_modules already provides). Without this rewrite, ensure-db.js
# fails with 'Cannot find module pg' (and any other symlinked package
# would fail the same way).
RUN find /app/apps/agent/node_modules -type l | while IFS= read -r link; do \
      abs_target=$(cd "$(dirname "$link")" && readlink -f "$(basename "$link")") && \
      case "$abs_target" in \
        /app/node_modules/.pnpm/*) \
          rest=${abs_target#/app/node_modules/.pnpm/} && \
          rel=${link#/app/apps/agent/node_modules/} && \
          parent_sub=$(dirname "$rel") && \
          if [ "$parent_sub" = "." ]; then \
            depth=0; \
          else \
            depth=$(echo "$parent_sub" | awk -F'/' '{print NF}'); \
          fi && \
          if [ "$depth" -eq 0 ]; then \
            prefix=""; \
          else \
            prefix=$(printf '../%.0s' $(seq 1 $depth)); \
          fi && \
          ln -sfn "${prefix}.pnpm/$rest" "$link" ;; \
      esac; \
    done

# =========================================================================== #

FROM node:25-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" agent
USER agent

# Allow scripts outside /app (e.g. /usr/local/bin/ensure-db.js) to resolve
# bare requires like `require("pg")` from /app/node_modules.
ENV NODE_PATH=/app/node_modules

COPY --from=builder --chown=agent:nodejs /app/apps/agent/.mastra/output /app/.mastra/output
COPY --from=builder --chown=agent:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=agent:nodejs /app/apps/agent/node_modules /app/node_modules
COPY --from=builder --chown=agent:nodejs /app/apps/agent/package.json /app/package.json

COPY --from=builder --chown=agent:nodejs --chmod=755 /app/docker/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=builder --chown=agent:nodejs --chmod=755 /app/docker/ensure-db.js /usr/local/bin/ensure-db.js

EXPOSE 4111

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4111/api/agents || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/.mastra/output/index.mjs", "--hostname", "0.0.0.0"]