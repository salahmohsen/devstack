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

# Long timeouts for both the monorepo install and Mastra's nested output install.
# Mastra DepsService picks package manager from the nearest lockfile under apps/agent
# (walks up to root). Prefer monorepo pnpm-lock so nested install reuses this store.
ENV NPM_CONFIG_FETCH_TIMEOUT=600000 \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_PREFER_OFFLINE=true \
    PNPM_FETCH_TIMEOUT=600000 \
    npm_config_fetch_timeout=600000 \
    npm_config_fetch_retries=5 \
    npm_config_prefer_offline=true

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
COPY --chown=vp:vp packages/pdf/package.json packages/pdf/
COPY --chown=vp:vp packages/seo/package.json packages/seo/
COPY --chown=vp:vp packages/ui/package.json packages/ui/
COPY --chown=vp:vp tools/tsconfig/package.json tools/tsconfig/

RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    vp install --frozen-lockfile --prefer-offline --ignore-scripts -- --fetch-timeout=600000

COPY --chown=vp:vp . .

ARG SOURCE_COMMIT=
ARG DOKPLOY_COMMIT_HASH=
ARG DOKPLOY_COMMIT_SHORT=
ARG DATABASE_URL NODE_ENV
RUN chmod +x docker/resolve-source-commit.sh \
  && docker/resolve-source-commit.sh > /tmp/SOURCE_COMMIT \
  && echo "build SOURCE_COMMIT=$(cat /tmp/SOURCE_COMMIT)"

ENV SOURCE_COMMIT=unknown \
    DATABASE_URL=${DATABASE_URL} \
    NODE_ENV=${NODE_ENV}

# Mastra `mastra build` always runs a nested install in `.mastra/output`.
# Reuse the same BuildKit pnpm store + npm cache so flaky registry reads
# (ETIMEDOUT) do not fail the bundle stage. Hard-cap the step as a last resort.
RUN --mount=type=cache,id=pnpm-store,target=/home/vp/.local/share/pnpm/store,uid=1000,gid=1000 \
    --mount=type=cache,id=npm-cache,target=/home/vp/.npm,uid=1000,gid=1000 \
    export SOURCE_COMMIT="$(cat /tmp/SOURCE_COMMIT)" \
  && corepack enable \
  && corepack prepare "$(node -p "require('./package.json').packageManager")" --activate \
  && pnpm config set store-dir /home/vp/.local/share/pnpm/store \
  && pnpm config set fetch-timeout 600000 \
  && pnpm config set fetch-retries 5 \
  && npm config set fetch-timeout 600000 \
  && npm config set fetch-retries 5 \
  && npm config set prefer-offline true \
  && timeout 600 vp run --filter @tsu-stack/agent build

RUN cp "$(vp env which node | head -1)" /tmp/node

FROM debian:bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends wget ca-certificates libatomic1 xz-utils \
  && rm -rf /var/lib/apt/lists/* \
  && addgroup --gid 1001 nodejs \
  && adduser --uid 1001 --ingroup nodejs --disabled-password --gecos "" agent

# Local `pnpm run dev`: install Typst 0.14.2 on PATH and
#   uv pip install 'rendercv[full]==2.8'
# (Python 3.12+). spawn.ts discovers fonts via python3 + rendercv_fonts.
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
ARG TARGETARCH
RUN set -eux; \
  case "$TARGETARCH" in \
    amd64) \
      TYPST_TRIPLE=x86_64-unknown-linux-musl; \
      TYPST_SHA256=a6044cbad2a954deb921167e257e120ac0a16b20339ec01121194ff9d394996d ;; \
    arm64) \
      TYPST_TRIPLE=aarch64-unknown-linux-musl; \
      TYPST_SHA256=491b101aa40a3a7ea82a3f8a6232cabb4e6a7e233810082e5ac812d43fdcd47a ;; \
    *) \
      echo "unsupported TARGETARCH: ${TARGETARCH:-empty}" >&2; \
      exit 1 ;; \
  esac; \
  wget -qO /tmp/typst.tar.xz \
    "https://github.com/typst/typst/releases/download/v0.14.2/typst-${TYPST_TRIPLE}.tar.xz"; \
  echo "${TYPST_SHA256}  /tmp/typst.tar.xz" | sha256sum -c; \
  tar -xJf /tmp/typst.tar.xz -C /tmp; \
  install -m755 "/tmp/typst-${TYPST_TRIPLE}/typst" /usr/local/bin/typst; \
  rm -rf /tmp/typst.tar.xz "/tmp/typst-${TYPST_TRIPLE}"; \
  export UV_PYTHON_INSTALL_DIR=/usr/local/share/uv/python; \
  uv python install 3.12; \
  PYTHON="$(readlink -f "$(uv python find 3.12)")"; \
  PY_BIN="$(dirname "$PYTHON")"; \
  ln -sfn "$PYTHON" /usr/local/bin/python3; \
  ln -sfn "$PYTHON" /usr/local/bin/python3.12; \
  uv pip install --python 3.12 --system 'rendercv[full]==2.8'; \
  if [ -x "$PY_BIN/rendercv" ]; then \
    ln -sfn "$PY_BIN/rendercv" /usr/local/bin/rendercv; \
  elif command -v rendercv >/dev/null; then \
    ln -sfn "$(command -v rendercv)" /usr/local/bin/rendercv; \
  else \
    echo "rendercv not found after install" >&2; \
    exit 1; \
  fi; \
  FONT_DIR="$(python3 -c "import rendercv_fonts; print(rendercv_fonts.package_folder_path)")"; \
  test -n "$FONT_DIR"; \
  ln -sfn "$FONT_DIR" /usr/local/share/rendercv-fonts; \
  chmod -R a+rX "$UV_PYTHON_INSTALL_DIR" /usr/local/share/rendercv-fonts; \
  test -x /usr/local/bin/python3; \
  test -x /usr/local/bin/python3.12; \
  test -x /usr/local/bin/rendercv; \
  test -x /usr/local/bin/typst; \
  python3 -c "import rendercv_fonts"; \
  rm -f /usr/local/bin/uv
ENV TYPST_FONT_PATHS=/usr/local/share/rendercv-fonts

COPY --from=build /tmp/node /usr/local/bin/node
COPY --from=build /tmp/SOURCE_COMMIT /etc/tsu-source-commit
COPY --from=build --chown=agent:nodejs /app/apps/agent/.mastra/output /app/apps/agent/.mastra/output
COPY --from=build --chown=agent:nodejs /app/apps/agent/package.json /app/apps/agent/package.json
COPY --from=build --chown=agent:nodejs /app/node_modules /app/node_modules
COPY --from=build --chown=agent:nodejs /app/apps/agent/node_modules /app/apps/agent/node_modules
COPY --from=build --chown=agent:nodejs /app/packages /app/packages
COPY --from=build --chown=agent:nodejs /app/package.json /app/package.json
# Bake resolved SHA into the runtime image env (file is source of truth if empty).
ENV SOURCE_COMMIT=unknown
COPY --from=build --chown=agent:nodejs --chmod=755 /app/docker/encode-db-url.sh /usr/local/bin/encode-db-url.sh
COPY --from=build --chown=agent:nodejs --chmod=755 /app/docker/ensure-db.js /usr/local/bin/ensure-db.js

USER agent

# App-level node_modules holds non-hoisted deps (e.g. pg) for ensure-db.js.
ENV NODE_PATH=/app/node_modules:/app/apps/agent/node_modules

EXPOSE 4111

# Prefer auth-exempt health paths (/api/* uses MastraAuthBetterAuth sessions)
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4111/api/health || wget -qO- http://127.0.0.1:4111/health || exit 1

ENTRYPOINT ["/usr/local/bin/encode-db-url.sh"]
CMD ["node", "/app/apps/agent/.mastra/output/index.mjs", "--hostname", "0.0.0.0"]
