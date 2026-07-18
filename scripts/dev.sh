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
pnpm dotenvx run -f "$ENV_FILE" -- drizzle-kit push --force 2>&1 | tail -5
ok "Database schema pushed"
cd "$ROOT"

# ─── Step 5: Start apps ──────────────────────────────────────────
info "Starting all apps in dev mode..."
echo ""
echo -e "  ${CYAN}Server${RESET}  → http://localhost:5200"
echo -e "  ${CYAN}Web${RESET}     → http://localhost:5100"
echo -e "  ${CYAN}Agent${RESET}  → http://localhost:4111"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services${RESET}"
echo ""

# Trap Ctrl+C to also stop docker infra
cleanup() {
  echo ""
  info "Stopping apps..."
  kill $(jobs -p) 2>/dev/null || true
  info "Stopping infrastructure..."
  docker compose -f "$INFRA_COMPOSE" down
  ok "All services stopped"
}
trap cleanup EXIT INT TERM

# Start all apps in parallel using pnpm's built-in parallel runner
pnpm -r --parallel dev
