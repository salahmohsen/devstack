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

# Ensure bucket exists + public GetObject for profile avatars only.
# (Resume sources / PDFs stay private — AccessDenied without credentials.)
apply_minio_avatars_policy() {
  local bucket="${S3_BUCKET:-personal-hub}"
  local policy_file
  policy_file="$(mktemp)"
  cat >"$policy_file" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"AWS": ["*"]},
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${bucket}/*/avatars/*"]
    }
  ]
}
EOF
  if command -v mc >/dev/null 2>&1; then
    mc anonymous set-json "$policy_file" "local/${bucket}" >/dev/null 2>&1 || true
  else
    docker run --rm --network tsu-stack-infra_default \
      -v "$policy_file:/tmp/avatars-read.json:ro" \
      --entrypoint /bin/sh minio/mc:latest -c "
        mc alias set local http://tsu-stack-infra-minio-1:9000 \"$MINIO_USER\" \"$MINIO_PASS\" >/dev/null
        mc mb --ignore-existing local/${bucket} >/dev/null
        mc anonymous set-json /tmp/avatars-read.json local/${bucket} >/dev/null
      " >/dev/null 2>&1 || true
  fi
  rm -f "$policy_file"
}

if command -v mc >/dev/null 2>&1; then
  mc alias set local "$MINIO_ENDPOINT" "$MINIO_USER" "$MINIO_PASS" >/dev/null 2>&1
  mc mb --ignore-existing "local/${S3_BUCKET:-personal-hub}" >/dev/null 2>&1
  apply_minio_avatars_policy
  ok "Bucket '${S3_BUCKET:-personal-hub}' ready (public GetObject for */avatars/*)"
else
  apply_minio_avatars_policy
  ok "Bucket '${S3_BUCKET:-personal-hub}' ready via docker mc (public GetObject for */avatars/*)"
fi

# ─── Step 4: Push DB schema ───────────────────────────────────────
info "Pushing database schema..."
cd "$ROOT/packages/db"
# Use migrate for idempotent schema management. On a fresh database,
# drizzle-kit migrate creates the _drizzle_migrations table and applies
# all pending migrations. Already-applied migrations are skipped.
#
# IMPORTANT: do NOT run via `pnpm dotenvx …` / `pnpm exec …` here.
# When the workspace install is out of sync, pnpm's pre-run deps check
# may try to purge/reinstall node_modules and block on a TTY confirm
# (or hang forever under `vp run` with no TTY) — looks like "schema push hung".
# Call dotenvx + drizzle-kit binaries directly.
DOTENVX_BIN="${ROOT}/node_modules/.bin/dotenvx"
DRIZZLE_KIT_BIN="${ROOT}/packages/db/node_modules/.bin/drizzle-kit"
if [ ! -x "$DOTENVX_BIN" ]; then
  DOTENVX_BIN="${ROOT}/packages/db/node_modules/.bin/dotenvx"
fi
if [ ! -x "$DRIZZLE_KIT_BIN" ]; then
  DRIZZLE_KIT_BIN="${ROOT}/node_modules/.bin/drizzle-kit"
fi
[ -x "$DOTENVX_BIN" ] || fail "dotenvx not found (run pnpm install from repo root)"
[ -x "$DRIZZLE_KIT_BIN" ] || fail "drizzle-kit not found (run pnpm install from repo root)"
"$DOTENVX_BIN" run -f "$ENV_FILE" -- "$DRIZZLE_KIT_BIN" migrate
ok "Database schema pushed"
cd "$ROOT"

# ─── Step 5: Free app ports (stale vite/devtools holders) ─────────
# Web can die while leaving TanStack devtools on :4206; next start then
# crashes with EADDRINUSE and never binds :3000. Clear before launch.
info "Freeing app ports (3000, 4206, 5200, 4111, 9229)..."
for port in 3000 4206 5200 4111 9229; do
  lsof -ti :"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
done

# ─── Step 5b: Optional public HTTPS tunnel for webhooks ───────────
# SaaS providers (Resend, Gmail Pub/Sub, GitHub) cannot POST to localhost.
# Options (env from packages/env/.env — never hardcode hostnames in this script):
#
#   # Quick ephemeral URL (changes every run):
#   pnpm dev:tunnel
#   DEV_TUNNEL=1 pnpm dev
#
#   # Named tunnel + your subdomain (stable — recommended for Gmail/OAuth):
#   DEV_TUNNEL=1
#   DEV_TUNNEL_MODE=named
#   DEV_PUBLIC_SERVER_URL=https://api-dev.example.com
#   DEV_CLOUDFLARED_CONFIG=~/.cloudflared/tsu-stack-dev.yml
#   # or: DEV_CLOUDFLARED_TUNNEL_NAME=tsu-stack-dev
#
#   # Public URL only (you already run cloudflared elsewhere):
#   DEV_PUBLIC_SERVER_URL=https://api-dev.example.com pnpm dev
#
# Web stays on http://localhost:3000. Public HTTPS origin is PUBLIC_SERVER_URL
# (inbound webhooks + Settings → Mail). Browser VITE_SERVER_URL stays
# http://localhost:5200 so OAuth/session cookies stay first-party.
# Uses cloudflared CLI only (not Workers/wrangler deploy).

# Optional DEV_* keys from packages/env/.env if not already exported.
load_dev_env_keys() {
  [ -f "$ENV_FILE" ] || return 0
  local line key val
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%$'\r'}"
    case "$line" in
      ''|\#*) continue ;;
      DEV_*=*|GMAIL_PUSH_OIDC_AUDIENCE=*)
        key="${line%%=*}"
        val="${line#*=}"
        # strip surrounding quotes
        if [ "${val#\"}" != "$val" ] && [ "${val%\"}" != "$val" ]; then
          val="${val#\"}"
          val="${val%\"}"
        elif [ "${val#\'}" != "$val" ] && [ "${val%\'}" != "$val" ]; then
          val="${val#\'}"
          val="${val%\'}"
        fi
        # do not override a value already set in the environment
        if eval "[ -z \"\${${key}+x}\" ]"; then
          export "${key}=${val}"
        fi
        ;;
    esac
  done <"$ENV_FILE"
}
load_dev_env_keys

USE_TUNNEL=0
for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) USE_TUNNEL=1 ;;
  esac
done
if [ "${DEV_TUNNEL:-0}" = "1" ] || [ "${DEV_TUNNEL:-}" = "true" ]; then
  USE_TUNNEL=1
fi

# named | quick  (default: named when config/name present, else quick)
TUNNEL_MODE="${DEV_TUNNEL_MODE:-}"
PUBLIC_SERVER_URL="${DEV_PUBLIC_SERVER_URL:-}"
# Expand ~ in config path
CLOUDFLARED_CONFIG="${DEV_CLOUDFLARED_CONFIG:-}"
if [ -n "$CLOUDFLARED_CONFIG" ] && [ "${CLOUDFLARED_CONFIG#\~}" != "$CLOUDFLARED_CONFIG" ]; then
  CLOUDFLARED_CONFIG="${HOME}${CLOUDFLARED_CONFIG#\~}"
fi
# Resolve relative config paths against repo root (e.g. scripts/cloudflared.tunnel.yml)
if [ -n "$CLOUDFLARED_CONFIG" ] && [ "${CLOUDFLARED_CONFIG#/}" = "$CLOUDFLARED_CONFIG" ]; then
  CLOUDFLARED_CONFIG="$ROOT/$CLOUDFLARED_CONFIG"
fi
CLOUDFLARED_TUNNEL_NAME="${DEV_CLOUDFLARED_TUNNEL_NAME:-}"
DEV_WEB_URL="${DEV_WEB_URL:-http://localhost:3000}"

if [ -z "$TUNNEL_MODE" ]; then
  if [ -n "$CLOUDFLARED_CONFIG" ] || [ -n "$CLOUDFLARED_TUNNEL_NAME" ]; then
    TUNNEL_MODE="named"
  else
    TUNNEL_MODE="quick"
  fi
fi

TUNNEL_PID=""
TUNNEL_LOG="${TMPDIR:-/tmp}/tsu-stack-cloudflared-$$.log"
TUNNEL_KIND="" # quick | named | external | none

strip_trailing_slash() {
  local u="$1"
  while [ "${u%/}" != "$u" ]; do u="${u%/}"; done
  printf '%s' "$u"
}

start_named_tunnel() {
  command -v cloudflared >/dev/null 2>&1 || fail "cloudflared not installed (brew install cloudflared) — required for named tunnels"
  [ -n "$PUBLIC_SERVER_URL" ] || fail "Named tunnel requires DEV_PUBLIC_SERVER_URL=https://your-stable-host (e.g. https://api-dev.example.com)"

  local cmd=(cloudflared tunnel --no-autoupdate)
  if [ -n "$CLOUDFLARED_CONFIG" ]; then
    [ -f "$CLOUDFLARED_CONFIG" ] || fail "DEV_CLOUDFLARED_CONFIG not found: $CLOUDFLARED_CONFIG (see scripts/cloudflared.tunnel.example.yml)"
    cmd+=(--config "$CLOUDFLARED_CONFIG" run)
    info "Starting named tunnel (config: $CLOUDFLARED_CONFIG) → http://127.0.0.1:5200 ..."
  elif [ -n "$CLOUDFLARED_TUNNEL_NAME" ]; then
    # Ingress must already map hostname → http://127.0.0.1:5200 in account config / YAML.
    cmd+=(run "$CLOUDFLARED_TUNNEL_NAME")
    info "Starting named tunnel (name: $CLOUDFLARED_TUNNEL_NAME) → local :5200 ..."
  else
    fail "Named mode needs DEV_CLOUDFLARED_CONFIG or DEV_CLOUDFLARED_TUNNEL_NAME (or set DEV_PUBLIC_SERVER_URL only if the tunnel is already running)"
  fi

  : >"$TUNNEL_LOG"
  "${cmd[@]}" >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
  sleep 1
  if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    fail "cloudflared named tunnel exited early — see $TUNNEL_LOG"
  fi
  ok "Named tunnel running (pid $TUNNEL_PID) → ${PUBLIC_SERVER_URL}"
  TUNNEL_KIND="named"
}

start_quick_tunnel() {
  command -v cloudflared >/dev/null 2>&1 || fail "cloudflared not installed (brew install cloudflared) — required for DEV_TUNNEL=1"
  info "Starting cloudflared quick tunnel → http://127.0.0.1:5200 ..."
  : >"$TUNNEL_LOG"
  cloudflared tunnel --url "http://127.0.0.1:5200" --no-autoupdate >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!

  PUBLIC_SERVER_URL=""
  for _i in $(seq 1 40); do
    if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
      fail "cloudflared exited early — see $TUNNEL_LOG"
    fi
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
  ok "Quick tunnel (ephemeral): $PUBLIC_SERVER_URL"
  warn "URL changes each run — prefer DEV_TUNNEL_MODE=named + DEV_PUBLIC_SERVER_URL for Gmail/OAuth"
  TUNNEL_KIND="quick"
}

# Featured developer links — high-visibility block (apps + Mastra + webhooks).
# $1 public (tunnel) URL for inbound webhooks; $2 web origin; $3 browser API URL (OAuth).
print_dev_links_banner() {
  local public="$1"
  local web="$2"
  local browser_api="${3:-http://localhost:5200}"
  public="$(strip_trailing_slash "$public")"
  web="$(strip_trailing_slash "$web")"
  browser_api="$(strip_trailing_slash "$browser_api")"
  local api_local="http://localhost:5200"
  local agent="http://localhost:4111"
  local BOLD='\033[1m'
  local DIM='\033[2m'
  local MAGENTA='\033[35m'

  echo ""
  echo -e "${BOLD}${MAGENTA}╔══════════════════════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${MAGENTA}║${RESET}${BOLD}  tsu-stack · developer links${RESET}                                           ${BOLD}${MAGENTA}║${RESET}"
  echo -e "${BOLD}${MAGENTA}╠══════════════════════════════════════════════════════════════════════════╣${RESET}"
  echo -e "${BOLD}${MAGENTA}║${RESET}  ${BOLD}Apps${RESET}                                                                  ${BOLD}${MAGENTA}║${RESET}"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Web" "$web"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "API (browser)" "$browser_api"
  if [ "$public" != "$browser_api" ] && [ "$public" != "$api_local" ]; then
    printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "API (public)" "$public"
  fi
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "API health" "$api_local/health/live"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "API OpenAPI" "$api_local/docs"
  echo -e "${BOLD}${MAGENTA}║${RESET}  ${BOLD}Mastra agent${RESET}                                                          ${BOLD}${MAGENTA}║${RESET}"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Studio" "$agent"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "API" "$agent/api"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Swagger UI" "$agent/swagger-ui"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Health" "$agent/health"
  echo -e "${BOLD}${MAGENTA}║${RESET}  ${BOLD}Realtime${RESET}                                                              ${BOLD}${MAGENTA}║${RESET}"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${DIM}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "GitHub WS" "$browser_api/api/ws/github-signals"
  echo -e "${BOLD}${MAGENTA}║${RESET}  ${BOLD}OAuth callbacks${RESET} (register on GitHub / Google apps)                    ${BOLD}${MAGENTA}║${RESET}"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "GitHub" "$browser_api/auth/callback/github"
  printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Google" "$browser_api/auth/callback/google"

  if [ "$public" = "$api_local" ]; then
    echo -e "${BOLD}${MAGENTA}║${RESET}  ${YELLOW}Webhooks${RESET}  ${DIM}need public HTTPS — run: pnpm dev:tunnel${RESET}                  ${BOLD}${MAGENTA}║${RESET}"
    echo -e "${BOLD}${MAGENTA}║${RESET}            ${DIM}or set DEV_TUNNEL_MODE=named + DEV_PUBLIC_SERVER_URL${RESET}         ${BOLD}${MAGENTA}║${RESET}"
  else
    echo -e "${BOLD}${MAGENTA}║${RESET}  ${BOLD}Inbound webhooks${RESET} (public origin)                                      ${BOLD}${MAGENTA}║${RESET}"
    printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Resend" "$public/webhooks/resend/<token>"
    echo -e "${BOLD}${MAGENTA}║${RESET}            ${DIM}token from Settings → Mail; paste full URL in Resend${RESET}       ${BOLD}${MAGENTA}║${RESET}"
    printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "Gmail push" "$public/webhooks/gmail-push"
    printf "${BOLD}${MAGENTA}║${RESET}    %-18s ${GREEN}%-48s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "GitHub hook" "$public/webhooks/github"
    if [ -n "${GMAIL_PUSH_OIDC_AUDIENCE:-}" ]; then
      if [ "${GMAIL_PUSH_OIDC_AUDIENCE}" = "${public}/webhooks/gmail-push" ]; then
        echo -e "${BOLD}${MAGENTA}║${RESET}    ${GREEN}✔ GMAIL_PUSH_OIDC_AUDIENCE matches Gmail push URL${RESET}                   ${BOLD}${MAGENTA}║${RESET}"
      else
        echo -e "${BOLD}${MAGENTA}║${RESET}    ${YELLOW}⚠ GMAIL_PUSH_OIDC_AUDIENCE mismatch — expected:${RESET}                    ${BOLD}${MAGENTA}║${RESET}"
        printf "${BOLD}${MAGENTA}║${RESET}      ${YELLOW}%-66s${RESET} ${BOLD}${MAGENTA}║${RESET}\n" "${public}/webhooks/gmail-push"
      fi
    else
      echo -e "${BOLD}${MAGENTA}║${RESET}    ${YELLOW}⚠ set GMAIL_PUSH_OIDC_AUDIENCE=${public}/webhooks/gmail-push${RESET} ${BOLD}${MAGENTA}║${RESET}"
    fi
    echo -e "${BOLD}${MAGENTA}║${RESET}  ${DIM}API process binds :5200; cloudflared forwards public HTTPS.${RESET}          ${BOLD}${MAGENTA}║${RESET}"
  fi

  echo -e "${BOLD}${MAGENTA}╠══════════════════════════════════════════════════════════════════════════╣${RESET}"
  echo -e "${BOLD}${MAGENTA}║${RESET}  ${YELLOW}Ctrl+C${RESET} stops apps, tunnel, and docker infra                             ${BOLD}${MAGENTA}║${RESET}"
  echo -e "${BOLD}${MAGENTA}╚══════════════════════════════════════════════════════════════════════════╝${RESET}"
  echo ""
}

if [ "$USE_TUNNEL" = "1" ]; then
  case "$TUNNEL_MODE" in
    named)
      if [ -n "$CLOUDFLARED_CONFIG" ] || [ -n "$CLOUDFLARED_TUNNEL_NAME" ]; then
        start_named_tunnel
      elif [ -n "$PUBLIC_SERVER_URL" ]; then
        ok "Using fixed public API URL (tunnel process not started by this script): $PUBLIC_SERVER_URL"
        TUNNEL_KIND="external"
      else
        fail "DEV_TUNNEL_MODE=named needs DEV_PUBLIC_SERVER_URL and DEV_CLOUDFLARED_CONFIG (or DEV_CLOUDFLARED_TUNNEL_NAME)"
      fi
      ;;
    quick)
      if [ -n "$PUBLIC_SERVER_URL" ] && { [ -n "$CLOUDFLARED_CONFIG" ] || [ -n "$CLOUDFLARED_TUNNEL_NAME" ]; }; then
        # Prefer named when config is present even if mode defaulted oddly
        start_named_tunnel
      elif [ -n "$PUBLIC_SERVER_URL" ]; then
        ok "Using fixed public API URL: $PUBLIC_SERVER_URL"
        TUNNEL_KIND="external"
      else
        start_quick_tunnel
      fi
      ;;
    *)
      fail "Unknown DEV_TUNNEL_MODE='$TUNNEL_MODE' (use named or quick)"
      ;;
  esac
elif [ -n "$PUBLIC_SERVER_URL" ]; then
  ok "Using fixed public API URL: $PUBLIC_SERVER_URL"
  TUNNEL_KIND="external"
else
  PUBLIC_SERVER_URL="http://localhost:5200"
  TUNNEL_KIND="none"
fi

PUBLIC_SERVER_URL="$(strip_trailing_slash "$PUBLIC_SERVER_URL")"
DEV_WEB_URL="$(strip_trailing_slash "$DEV_WEB_URL")"

# Split tunnel public origin from browser API origin (see comment at export block).
export PUBLIC_SERVER_URL
export DEV_PUBLIC_SERVER_URL="$PUBLIC_SERVER_URL"
export VITE_WEB_URL="$DEV_WEB_URL"
case "$DEV_WEB_URL" in
  *localhost*|*127.0.0.1*)
    export VITE_SERVER_URL="http://localhost:5200"
    if [ "$PUBLIC_SERVER_URL" != "http://localhost:5200" ]; then
      info "Browser API/OAuth → http://localhost:5200 (first-party cookies)"
      info "Inbound webhooks  → $PUBLIC_SERVER_URL (cloudflared)"
    fi
    ;;
  *)
    export VITE_SERVER_URL="$PUBLIC_SERVER_URL"
    ;;
esac

# ─── Step 6: Start apps ──────────────────────────────────────────
info "Starting all apps in dev mode..."
print_dev_links_banner "$PUBLIC_SERVER_URL" "$DEV_WEB_URL" "$VITE_SERVER_URL"

# pnpm --filter … may run a deps-status check that tries `pnpm install`.
# Project-wide: confirmModulesPurge: false in pnpm-workspace.yaml (pnpm v11).
# Do not export CI=true here — it changes behavior in many tools (tests, bundlers).

APP_PIDS=()

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
  for pid in "${APP_PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  if [ -n "${TUNNEL_PID:-}" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    info "Stopping cloudflared tunnel (pid $TUNNEL_PID)..."
    kill "$TUNNEL_PID" 2>/dev/null || true
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
  # Best-effort cleanup of leftover quick-tunnel processes from this machine
  pkill -f "cloudflared tunnel --url http://127.0.0.1:5200" 2>/dev/null || true
  kill $(jobs -p) 2>/dev/null || true
  sleep 1
  if [ "${DEV_KEEP_INFRA:-0}" = "1" ]; then
    info "Leaving docker infra up (DEV_KEEP_INFRA=1)"
  else
    info "Stopping infrastructure..."
    docker compose -f "$INFRA_COMPOSE" down
  fi
  rm -f "$TUNNEL_LOG" 2>/dev/null || true
  ok "All services stopped"
}
trap cleanup EXIT INT TERM

# Start apps as independent processes (not `pnpm -r --parallel`).
# Recursive parallel fails the whole monorepo if one package exits (e.g. web
# vite crash) — that SIGKILLed server/agent and made debugging harder.
#
# VITE_* / PUBLIC_SERVER_URL already exported above (before first banner).

start_app() {
  local name="$1"
  local filter="$2"
  local log="${TMPDIR:-/tmp}/tsu-stack-${name}-$$.log"
  info "Starting ${name}… (log: ${log})"
  # Stream with prefix; pipefail so pnpm's exit code is preserved.
  # Sibling apps keep running if one exits (unlike pnpm -r --parallel).
  (
    set -o pipefail
    pnpm --filter "$filter" dev 2>&1 | while IFS= read -r line || [ -n "$line" ]; do
      printf '[%s] %s\n' "$name" "$line"
      printf '%s\n' "$line" >>"$log"
    done
    code=$?
    echo -e "${RED}✘ ${name} exited (code ${code}) — see ${log}${RESET}"
  ) &
  APP_PIDS+=($!)
}

start_app "server" "@tsu-stack/server"
start_app "web" "@tsu-stack/web"
start_app "agent" "@tsu-stack/agent"

# Wait until something is listening, then re-print links (easy to spot after log noise)
wait_port() {
  local port=$1
  local label=$2
  local max=${3:-60}
  local i=0
  while [ $i -lt "$max" ]; do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      ok "$label is listening on :$port"
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done
  warn "$label not listening on :$port after ${max}s"
  return 1
}

wait_port 5200 "API (server)" 90 || true
wait_port 4111 "Mastra agent" 90 || true
wait_port 3000 "Web" 120 || true

echo ""
ok "Stack ready — links again for convenience:"
print_dev_links_banner "$PUBLIC_SERVER_URL" "$DEV_WEB_URL" "$VITE_SERVER_URL"

# Block until all app wrappers exit (or Ctrl+C)
wait

