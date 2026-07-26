#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RESET='\033[0m'

info()  { echo -e "${CYAN}▸${RESET} $*"; }
ok()    { echo -e "${GREEN}✔${RESET} $*"; }
warn()  { echo -e "${YELLOW}⚠${RESET} $*"; }
fail()  { echo -e "${RED}✘${RESET} $*"; exit 1; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INFRA_COMPOSE="$ROOT/docker-compose.infra.yml"
ENV_FILE="$ROOT/packages/env/.env"

# ─── File descriptors (macOS monorepo Vite EMFILE) ────────────────
# Vite/chokidar + tsx watch + parallel apps exhaust low soft limits.
# Always try to raise; always log so failures are obvious in the log stream.
_current_nofile="$(ulimit -n 2>/dev/null || echo 0)"
info "Open-file limit (before): ${_current_nofile}"
# Prefer hard max available; fall through smaller values if the OS rejects.
for _nofile_try in 1048576 65536 10240 4096; do
  if [ "${_current_nofile}" = "unlimited" ]; then
    break
  fi
  if [ "${_current_nofile}" -ge "${_nofile_try}" ] 2>/dev/null; then
    break
  fi
  if ulimit -n "${_nofile_try}" 2>/dev/null; then
    ok "Raised open-file limit: ${_current_nofile} → $(ulimit -n)"
    break
  fi
done
info "Open-file limit (after):  $(ulimit -n 2>/dev/null || echo unknown)"
# Prefer native FSEvents. Polling (VITE_USE_POLLING=1) was observed to leave
# Vite listening on :3000 but never answering HTTP (connection hang / timeout),
# while server/agent still start — so `vp run dev` looks healthy and
# localhost:3000 "doesn't work". apps/web/vite-emfile-guard.ts swallows
# watch EMFILE when it occurs. Opt into polling only if native breaks:
#   VITE_USE_POLLING=1 vp run dev
export VITE_USE_POLLING="${VITE_USE_POLLING:-0}"
if [ "${VITE_USE_POLLING}" = "0" ]; then
  info "Vite file watching: native FSEvents (set VITE_USE_POLLING=1 if EMFILE)"
  unset CHOKIDAR_USEPOLLING CHOKIDAR_INTERVAL WATCHPACK_POLLING 2>/dev/null || true
else
  warn "Vite file watching: polling (may hang HTTP on :3000 — prefer native)"
  export CHOKIDAR_USEPOLLING=true
  export CHOKIDAR_INTERVAL="${CHOKIDAR_INTERVAL:-400}"
  export WATCHPACK_POLLING=true
fi

# ─── Preflight ────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
docker info >/dev/null 2>&1 || fail "Docker daemon is not running"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is not installed"

# ─── Step 1: Start infrastructure ─────────────────────────────────
info "Starting infrastructure (postgres, redis, minio)..."
docker compose -f "$INFRA_COMPOSE" up -d

# ─── Step 2: Wait for health checks ───────────────────────────────
info "Waiting for services to be healthy..."

wait_for_healthy() {
  local service=$1
  local max_wait=${2:-30}
  local elapsed=0

  while [ $elapsed -lt "$max_wait" ]; do
    status=$(docker inspect --format='{{.State.Health.Status}}' "tsu-stack-infra-${service}-1" 2>/dev/null || echo "missing")
    if [ "$status" = "healthy" ]; then
      ok "$service is healthy"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
    printf "."
  done
  echo ""
  fail "$service did not become healthy within ${max_wait}s"
}

wait_for_healthy "postgres" 30
wait_for_healthy "redis" 15
wait_for_healthy "minio" 30

# ─── Step 3: Create S3 bucket ────────────────────────────────────
info "Ensuring MinIO bucket exists..."
MINIO_ENDPOINT="http://localhost:9000"
MINIO_USER="${MINIO_ROOT_USER:-minioadmin}"
MINIO_PASS="${MINIO_ROOT_PASSWORD:-minioadmin}"

# Check if mc is available, otherwise use curl
if command -v mc >/dev/null 2>&1; then
  mc alias set local "$MINIO_ENDPOINT" "$MINIO_USER" "$MINIO_PASS" >/dev/null 2>&1
  mc mb --ignore-existing local/personal-hub >/dev/null 2>&1
  ok "Bucket 'personal-hub' ready"
else
  # Use curl to check — bucket creation happens on first upload anyway
  warn "mc (MinIO Client) not installed — bucket will be created on first upload"
fi

# ─── Step 4: Push DB schema ───────────────────────────────────────
info "Pushing database schema..."
cd "$ROOT/packages/db"
# Use migrate for idempotent schema management. On a fresh database,
# drizzle-kit migrate creates the _drizzle_migrations table and applies
# all pending migrations. Already-applied migrations are skipped.
pnpm dotenvx run -f "$ENV_FILE" -- drizzle-kit migrate 2>&1 | tail -10
ok "Database schema pushed"
cd "$ROOT"

# ─── Step 5: Free app ports (stale vite/devtools holders) ─────────
# Web can die while leaving TanStack devtools on :4206; next start then
# crashes with EADDRINUSE and never binds :3000. Clear before launch.
info "Freeing app ports (3000, 4206, 5200, 4111, 9229)..."
for port in 3000 4206 5200 4111 9229; do
  lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

# ─── Step 6: Start apps ──────────────────────────────────────────
info "Starting all apps in dev mode..."
echo ""
echo -e "  ${CYAN}Server${RESET}  → http://localhost:5200"
echo -e "  ${CYAN}Web${RESET}     → http://localhost:3000"
echo -e "  ${CYAN}Agent${RESET}  → http://localhost:4111"
echo ""
echo -e "  ${YELLOW}Note: GitHub OAuth callback URL: http://localhost:5200/auth/callback/github${RESET}"
echo -e "  ${YELLOW}Make sure this is registered in your GitHub OAuth app settings.${RESET}"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${RESET}"
echo ""

# Trap Ctrl+C to also stop docker infra
cleanup() {
  echo ""
  info "Stopping apps..."
  # Kill processes on all known ports.
  # 4206 = @tanstack/devtools-vite event bus (held even when :3000 is dead;
  # a stale holder causes `listen EADDRINUSE ::1:4206` and web never binds 3000).
  for port in 3000 4206 5200 4111 9229; do
    lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  kill $(jobs -p) 2>/dev/null || true
  sleep 1
  info "Stopping infrastructure..."
  docker compose -f "$INFRA_COMPOSE" down
  ok "All services stopped"
}
trap cleanup EXIT INT TERM

# Start all apps in parallel using pnpm's built-in parallel runner
# Override production URLs with local dev equivalents. Both must be set:
# the server's CORS allowlist is derived from VITE_WEB_URL, so leaving it
# at the production origin would block the browser (localhost:3000).
#
# API mounts at URL root (no /server path). VITE_SERVER_URL pathname is
# empty → Hono has no basePath; oRPC client calls `${VITE_SERVER_URL}/rpc`.
# Keep this in sync with packages/env/.env — a leftover `/server` suffix
# (from the pre-dedicated-api-host setup) causes 404 on every procedure.
VITE_SERVER_URL="http://localhost:5200" VITE_WEB_URL="http://localhost:3000" pnpm -r --parallel dev
