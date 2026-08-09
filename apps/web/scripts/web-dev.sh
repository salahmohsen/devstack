#!/usr/bin/env bash
# Local web dev entry: preload EMFILE guard before Vite binds fs.watch.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$ROOT/../.." && pwd)"
GUARD="${ROOT}/vite-emfile-guard.cjs"

case "${NODE_OPTIONS:-}" in
  *vite-emfile-guard*) ;;
  *)
    export NODE_OPTIONS="--require ${GUARD}${NODE_OPTIONS:+ ${NODE_OPTIONS}}"
    ;;
esac

cd "$ROOT"
# dotenvx does not override already-set vars by default, so session exports
# from scripts/dev.sh (VITE_WEB_URL, VITE_SERVER_URL for OAuth, etc.) win over
# packages/env/.env. Tunnel public origin is PUBLIC_SERVER_URL on the server —
# not VITE_SERVER_URL (that stays localhost for first-party cookies).
#
# Prefer dotenvx on PATH (pnpm script runners add node_modules/.bin). Fall back
# to monorepo root bins — avoid nested `pnpm dotenvx` (deps-status install gate).
# @see https://dotenvx.com — `dotenvx run -f <file> -- <command>`
export PATH="${REPO_ROOT}/node_modules/.bin:${PATH}"
command -v dotenvx >/dev/null 2>&1 || {
  echo "dotenvx not found — run pnpm install at repo root" >&2
  exit 1
}
command -v vp >/dev/null 2>&1 || {
  echo "vp not found — run pnpm install at repo root" >&2
  exit 1
}
exec dotenvx run -f ../../packages/env/.env -- vp dev
