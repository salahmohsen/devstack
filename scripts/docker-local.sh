#!/usr/bin/env bash
set -euo pipefail

# ─── Source secrets from packages/env/.env ────────────────────────────────────
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/packages/env/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "✘ $ENV_FILE not found" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

# ─── Derive the compose-only vars from the ones we already have ──────────────
# postgres: parse DATABASE_URL (postgresql://user:pass@host:port/db)
if [[ -z "${POSTGRES_USER:-}" && -n "${DATABASE_URL:-}" ]]; then
  _pg_creds="${DATABASE_URL#postgresql://}"
  export POSTGRES_USER="${_pg_creds%%:*}"
  _pg_rest="${_pg_creds#*:}"
  export POSTGRES_PASSWORD="${_pg_rest%%@*}"
  _pg_host_db="${_pg_rest#*@}"
  _pg_host_db="${_pg_host_db##*/}"
  export POSTGRES_DB="${_pg_host_db%%\?*}"
fi

# redis: REDIS_URL is redis://:password@host:port
if [[ -z "${REDIS_PASSWORD:-}" && -n "${REDIS_URL:-}" ]]; then
  _redis_creds="${REDIS_URL#redis://}"
  _redis_creds="${_redis_creds#:}"
  export REDIS_PASSWORD="${_redis_creds%%@*}"
fi

# minio: reuse S3 creds
export MINIO_ROOT_USER="${MINIO_ROOT_USER:-${S3_ACCESS_KEY:-minio}}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-${S3_SECRET_KEY:-minio_dev_password}}"

# files gateway secret (only set in packages/env/.env for the web)
export FILES_API_SECRET="${FILES_API_SECRET:-dev-only-secret-do-not-use-in-production}"

# ─── Override URLs to localhost for the in-browser origin ────────────────────
# SERVER_URL_INTERNAL (set in the base compose) still routes to the
# in-container server address, so SSR oRPC calls stay on the Docker network.
export VITE_SERVER_URL="http://localhost:${SERVER_PORT:-5100}/server"
export VITE_WEB_URL="http://localhost:${WEB_PORT:-3000}"

# ─── Run compose with the local override ─────────────────────────────────────
cd "$(dirname "$0")/.."
if [[ $# -eq 0 ]]; then
  set -- up --build
fi
exec docker compose \
  -f docker-compose.yml \
  -f docker-compose.local.yml \
  "$@"
