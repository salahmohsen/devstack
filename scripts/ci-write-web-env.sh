#!/usr/bin/env bash
# Materialize packages/env/.env for CI (test + build) from the job environment.
# Uses bash %q so values with spaces/special chars stay valid for dotenvx.
set -euo pipefail

ENV_FILE="${1:-packages/env/.env}"
mkdir -p "$(dirname "$ENV_FILE")"
: >"$ENV_FILE"

write_key() {
  local key="$1"
  local val="${!key-}"
  printf '%s=%q\n' "$key" "$val" >>"$ENV_FILE"
}

write_key VITE_SERVER_URL
write_key VITE_WEB_URL
write_key VITE_IMGPROXY_URL
write_key SOURCE_COMMIT
write_key DATABASE_URL
write_key BETTER_AUTH_SECRET
write_key GITHUB_CLIENT_ID
write_key GITHUB_CLIENT_SECRET
write_key GITHUB_WEBHOOK_SECRET
