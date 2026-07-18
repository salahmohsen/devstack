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

# ─── Config ───────────────────────────────────────────────────────
SERVER_URL="${SERVER_URL:-http://localhost:5200}"
REDIS_CONTAINER="${REDIS_CONTAINER:-tsu-stack-infra-redis-1}"
REDIS_PASSWORD="${REDIS_PASSWORD:-changeme}"

# ─── Preflight ────────────────────────────────────────────────────
command -v docker >/dev/null 2>&1 || fail "Docker is not installed"
command -v curl >/dev/null 2>&1 || fail "curl is not installed"

docker inspect "$REDIS_CONTAINER" >/dev/null 2>&1 || \
  fail "Redis container $REDIS_CONTAINER not running. Run: pnpm dev:infra"

curl -sf "$SERVER_URL/server/health/ready" >/dev/null 2>&1 || \
  warn "Server not ready at $SERVER_URL (that's ok if you're not testing cache flow)"

# ─── Step 1: Check Redis connection ────────────────────────────────
info "Checking Redis connection..."
if docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" ping 2>/dev/null | grep -q PONG; then
  ok "Redis is up"
else
  fail "Redis is not responding"
fi

# ─── Step 2: Count current cache keys ──────────────────────────────
info "Counting GitHub cache keys..."
KEY_COUNT=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" \
  --no-auth-warning KEYS "*" 2>/dev/null | grep -c "::" || echo "0")
ok "Found $KEY_COUNT cache keys (pattern: <owner>::<resource>::<params>)"

# ─── Step 3: Show first 10 keys with TTL ───────────────────────────
info "Sample of cache keys + TTLs:"
docker exec -i "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning KEYS "*" 2>/dev/null \
  | head -10 \
  | while IFS= read -r key; do
      if [ -n "$key" ]; then
        ttl=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning TTL "$key" 2>/dev/null)
        size=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning STRLEN "$key" 2>/dev/null)
        echo "  ${CYAN}$key${RESET}  ttl=${ttl}s  size=${size}B"
      fi
    done

# ─── Step 4: Watch server log for cache activity ──────────────────
echo ""
info "Cache test options:"
echo ""
echo -e "  1. ${CYAN}Watch live cache activity${RESET} (server log filter):"
echo -e "     pnpm dev 2>&1 | grep 'cache:redis'"
echo ""
echo -e "  2. ${CYAN}Test cache flow manually${RESET} (open in browser):"
echo -e "     ${SERVER_URL}/api/github/public/profile-repos?salahmohsen"
echo ""
echo -e "  3. ${CYAN}Flush all cache (force fresh fetch from GitHub):"
echo -e "     docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASSWORD FLUSHALL"
echo ""
echo -e "  4. ${CYAN}Inspect a specific key:${RESET}"
echo -e "     docker exec $REDIS_CONTAINER redis-cli -a $REDIS_PASSWORD GET '<key>'"
echo ""

# ─── Step 5: Optional — hit a public endpoint and re-check keys ────
if [ "${1:-}" = "--test-flow" ]; then
  info "Testing cache flow with /api/github/public/..."
  BEFORE=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" \
    --no-auth-warning KEYS "*" 2>/dev/null | wc -l | tr -d ' ')

  echo -e "  ${CYAN}Before:${RESET} $BEFORE keys"
  echo -e "  ${CYAN}Hit:${RESET}  $SERVER_URL/api/github/public/profile-repos/salahmohsen"

  curl -s -o /dev/null -w "  HTTP %{http_code} in %{time_total}s\n" \
    "$SERVER_URL/api/github/public/profile-repos/salahmohsen" || true

  sleep 2

  AFTER=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" \
    --no-auth-warning KEYS "*" 2>/dev/null | wc -l | tr -d ' ')

  echo -e "  ${CYAN}After:${RESET}  $AFTER keys"

  if [ "$AFTER" -gt "$BEFORE" ]; then
    ok "Cache miss → fetched from GitHub → stored in Redis"
  else
    ok "Cache hit → served from Redis (no new key)"
  fi

  echo ""
  info "New keys (if any):"
  docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" \
    --no-auth-warning KEYS "*" 2>/dev/null | head -5 | while IFS= read -r key; do
    if [ -n "$key" ]; then
      ttl=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASSWORD" --no-auth-warning TTL "$key" 2>/dev/null)
      echo "  ${CYAN}$key${RESET}  ttl=${ttl}s"
    fi
  done
fi
