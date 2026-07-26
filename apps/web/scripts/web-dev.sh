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
exec pnpm dotenvx run -f ../../packages/env/.env -- vp dev
