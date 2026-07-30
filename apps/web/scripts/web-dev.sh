#!/usr/bin/env bash
# Local web dev entry: preload EMFILE guard before Vite binds fs.watch.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
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
exec pnpm dotenvx run -f ../../packages/env/.env -- vp dev
