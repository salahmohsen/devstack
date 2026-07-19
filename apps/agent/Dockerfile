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

COPY --parents **/package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN vp install --frozen-lockfile --ignore-scripts --network-timeout=600000

# =========================================================================== #

FROM installer AS builder

COPY . .

ARG SOURCE_COMMIT DATABASE_URL NODE_ENV
ENV SOURCE_COMMIT=${SOURCE_COMMIT} \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV}

RUN pnpm --filter @tsu-stack/agent build

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
