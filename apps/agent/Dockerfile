FROM node:25-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget git ca-certificates \
  && update-ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# =========================================================================== #

FROM base AS installer

ARG VITE_PLUS_VERSION=0.1.23
RUN npm pack "@voidzero-dev/vite-plus-cli-linux-x64-gnu@${VITE_PLUS_VERSION}" \
        --pack-destination /tmp && \
    mkdir -p /root/.vite-plus/bin && \
    tar xzf /tmp/voidzero-dev-vite-plus-cli-linux-x64-gnu-*.tgz -C /root/.vite-plus/bin \
        --strip-components=1 package/vp && \
    chmod +x /root/.vite-plus/bin/vp
ENV PATH="/root/.vite-plus/bin:$PATH"

# Use the system Node.js bundled with the base image instead of downloading a managed runtime.
# The network inside the build environment is too slow for the managed runtime download to succeed.
RUN vp env off

# This layer only invalidates when dependencies change, not on source changes.
# Use a find-generated tarball so we ship every package.json (preserving the
# apps/<name> and packages/<name> directory layout) without needing the
# COPY --parents flag (unsupported by Dokploy's classic builder).
RUN find apps packages -name package.json -print0 \
      | tar --null --files-from=- -cf /tmp/ws.tar \
 && tar -xf /tmp/ws.tar -C /app/ \
 && rm /tmp/ws.tar
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./

# Install dependencies. The pnpm store lives at /root/.local/share/pnpm/store
# and is reused across builds on the same host; consider switching to a
# BuildKit `--mount=type=cache` for full cross-build caching once Dokploy
# supports BuildKit for compose builds.
RUN vp install --frozen-lockfile --ignore-scripts -- --fetch-timeout=600000

# =========================================================================== #

FROM installer AS builder

COPY . .

ARG SOURCE_COMMIT DATABASE_URL NODE_ENV
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV}

RUN vp run -v --filter agent build

# =========================================================================== #

FROM node:25-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN addgroup --gid 1001 nodejs \
    && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" agent
USER agent

COPY --from=builder --chown=agent:nodejs /app/apps/agent/.mastra/output /app/.mastra/output
COPY --from=builder --chown=agent:nodejs /app/apps/agent/node_modules /app/node_modules
COPY --from=builder --chown=agent:nodejs /app/apps/agent/package.json /app/package.json

EXPOSE 4111

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4111/api/agents || exit 1

CMD ["node", "/app/.mastra/output/index.mjs", "--hostname", "0.0.0.0"]
