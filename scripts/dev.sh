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

# Preload EMFILE guard for web (and any Node child) before ESM binds fs.watch.
# apps/web/package.json also sets this; export here so `pnpm -r --parallel dev`
# children inherit a raised limit + early patch.
_EMFILE_GUARD="$ROOT/apps/web/vite-emfile-guard.cjs"
if [ -f "$_EMFILE_GUARD" ]; then
  case "${NODE_OPTIONS:-}" in
    *vite-emfile-guard*) ;;
    *)
      export NODE_OPTIONS="--require ${_EMFILE_GUARD}${NODE_OPTIONS:+ ${NODE_OPTIONS}}"
      info "NODE_OPTIONS EMFILE preload: ${_EMFILE_GUARD}"
      ;;
  esac
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
# Host map 9002→container 9000 (see docker-compose.infra.yml); avoids php-fpm on :9000.
MINIO_ENDPOINT="http://127.0.0.1:9002"
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

# ─── Step 5b: Optional public HTTPS tunnel for Resend webhooks ────
# Resend (and most SaaS webhooks) cannot POST to http://localhost — they
# need a public HTTPS origin. Local mkcert HTTPS still is not reachable
# from the internet. Use a Cloudflare quick tunnel to :5200 instead:
#
#   DEV_TUNNEL=1 pnpm dev
#   pnpm dev --tunnel
#   DEV_PUBLIC_SERVER_URL=https://your-fixed-tunnel.example pnpm dev
#
# Web stays on http://localhost:3000 (browser). API public URL becomes HTTPS
# so Settings → Mail webhook URL + CORS-facing VITE_SERVER_URL match Resend.
USE_TUNNEL=0
for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) USE_TUNNEL=1 ;;
  esac
done
if [ "${DEV_TUNNEL:-0}" = "1" ] || [ "${DEV_TUNNEL:-}" = "true" ]; then
  USE_TUNNEL=1
fi

PUBLIC_SERVER_URL="${DEV_PUBLIC_SERVER_URL:-}"
TUNNEL_PID=""
TUNNEL_LOG="${TMPDIR:-/tmp}/tsu-stack-cloudflared-$$.log"

if [ -n "$PUBLIC_SERVER_URL" ]; then
  ok "Using fixed public API URL: $PUBLIC_SERVER_URL"
elif [ "$USE_TUNNEL" = "1" ]; then
  command -v cloudflared >/dev/null 2>&1 || fail "cloudflared not installed (brew install cloudflared) — required for DEV_TUNNEL=1"
  info "Starting Cloudflare quick tunnel → http://127.0.0.1:5200 ..."
  : >"$TUNNEL_LOG"
  cloudflared tunnel --url "http://127.0.0.1:5200" --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  PUBLIC_SERVER_URL=""
  for _i in $(seq 1 40); do
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
      fail "cloudflared exited early — see $TUNNEL_LOG"
    fi
    # Quick tunnels print https://*.trycloudflare.com once ready.
    PUBLIC_SERVER_URL="$(
      grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" 2>/dev/null | head -1 || true
    )"
    if [ -n "$PUBLIC_SERVER_URL" ]; then
      break
    fi
    sleep 0.5
  done

  if [ -z "$PUBLIC_SERVER_URL" ]; then
    fail "Timed out waiting for cloudflared HTTPS URL — see $TUNNEL_LOG"
  fi
  ok "Public API tunnel: $PUBLIC_SERVER_URL"
else
  PUBLIC_SERVER_URL="http://localhost:5200"
fi

# ─── Step 6: Start apps ──────────────────────────────────────────
info "Starting all apps in dev mode..."
echo ""
echo -e "  ${CYAN}Server (local)${RESET}  → http://localhost:5200"
if [ "$PUBLIC_SERVER_URL" != "http://localhost:5200" ]; then
  echo -e "  ${CYAN}Server (public)${RESET} → ${GREEN}${PUBLIC_SERVER_URL}${RESET}"
  echo -e "  ${CYAN}Resend webhook${RESET}  → ${PUBLIC_SERVER_URL}/webhooks/resend/<token>"
fi
echo -e "  ${CYAN}Web${RESET}              → http://localhost:3000"
echo -e "  ${CYAN}Agent${RESET}            → http://localhost:4111"
echo ""
if [ "$PUBLIC_SERVER_URL" = "http://localhost:5200" ]; then
  echo -e "  ${YELLOW}Resend webhooks need public HTTPS. Re-run with:${RESET}"
  echo -e "  ${YELLOW}  pnpm dev:tunnel${RESET}"
  echo -e "  ${YELLOW}  # or: DEV_TUNNEL=1 pnpm dev${RESET}"
  echo ""
  echo -e "  ${YELLOW}GitHub OAuth callback: ${PUBLIC_SERVER_URL}/auth/callback/github${RESET}"
else
  # Tunnel / fixed public URL: Better Auth baseURL follows VITE_SERVER_URL.
  echo -e "  ${YELLOW}GitHub OAuth callback (register in GitHub app):${RESET}"
  echo -e "  ${GREEN}  ${PUBLIC_SERVER_URL}/auth/callback/github${RESET}"
  echo -e "  ${YELLOW}(Local bind stays http://localhost:5200; public API origin is the tunnel.)${RESET}"
fi
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${RESET}"
echo ""

# Trap Ctrl+C to also stop docker infra + tunnel
cleanup() {
  echo ""
  info "Stopping apps..."
  # Kill processes on all known ports.
  # 4206 = @tanstack/devtools-vite event bus (held even when :3000 is dead;
  # a stale holder causes `listen EADDRINUSE ::1:4206` and web never binds 3000).
  for port in 3000 4206 5200 4111 9229; do
    lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
  done
  if [ -n "${TUNNEL_PID:-}" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    info "Stopping Cloudflare tunnel (pid $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  # Best-effort: any leftover cloudflared for this log file
  pkill -f "cloudflared tunnel --url http://127.0.0.1:5200" 2>/dev/null || true
  kill $(jobs -p) 2>/dev/null || true
  sleep 1
  info "Stopping infrastructure..."
  docker compose -f "$INFRA_COMPOSE" down
  rm -f "$TUNNEL_LOG" 2>/dev/null || true
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
# When tunneling, VITE_SERVER_URL is the public HTTPS origin so webhook URL
# generation (Settings → Mail) and Resend match.
VITE_SERVER_URL="$PUBLIC_SERVER_URL" VITE_WEB_URL="http://localhost:3000" pnpm -r --parallel dev
