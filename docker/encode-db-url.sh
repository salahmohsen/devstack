#!/bin/sh
# Wraps the entrypoint to build a URL-safe DATABASE_URL at runtime.
# PostgreSQL passwords may contain + / = which break URL parsing.
# Prefer Node's encodeURIComponent when available (same decoding as `pg`).
# When CREATE_DB=true, also creates the target database via ensure-db.js.
set -eu

_user="${POSTGRES_USER:?}"
_pass="${POSTGRES_PASSWORD:?}"
_db="${POSTGRES_DB:-personal_hub}"
# Prefer hub-postgres in compose (unique on shared Dokploy networks).
# Keep "postgres" as fallback for older stacks / local defaults.
_host="${POSTGRES_HOST:-postgres}"
_port="${POSTGRES_PORT:-5432}"

# Discrete vars for libraries that read them directly (libpq / some clients).
export PGUSER="$_user"
export PGPASSWORD="$_pass"
export PGHOST="$_host"
export PGPORT="$_port"
export PGDATABASE="$_db"

if command -v node >/dev/null 2>&1; then
  export DATABASE_URL="$(
    node -e '
      const user = process.env.POSTGRES_USER;
      const pass = process.env.POSTGRES_PASSWORD;
      const host = process.env.POSTGRES_HOST || "postgres";
      const port = process.env.POSTGRES_PORT || "5432";
      const db = process.env.POSTGRES_DB || "personal_hub";
      const url =
        "postgresql://" +
        encodeURIComponent(user) +
        ":" +
        encodeURIComponent(pass) +
        "@" +
        host +
        ":" +
        port +
        "/" +
        encodeURIComponent(db);
      process.stdout.write(url);
    '
  )"
else
  # Fallback sed encoder (mirrors encodeURIComponent for common password chars).
  encode() {
    printf '%s' "$1" | sed \
      -e 's/%/%25/g' \
      -e 's/ /%20/g' \
      -e 's/!/%21/g' \
      -e 's/#/%23/g' \
      -e 's/\$/%24/g' \
      -e 's/&/%26/g' \
      -e "s/'/%27/g" \
      -e 's/(/%28/g' \
      -e 's/)/%29/g' \
      -e 's/\*/%2A/g' \
      -e 's/+/%2B/g' \
      -e 's/,/%2C/g' \
      -e 's/\//%2F/g' \
      -e 's/:/%3A/g' \
      -e 's/;/%3B/g' \
      -e 's/=/%3D/g' \
      -e 's/?/%3F/g' \
      -e 's/@/%40/g' \
      -e 's/\[/%5B/g' \
      -e 's/\]/%5D/g'
  }
  export DATABASE_URL="postgresql://$(encode "$_user"):$(encode "$_pass")@${_host}:${_port}/${_db}"
fi

# When CREATE_DB is set, attempt to create the target database.
if [ "${CREATE_DB:-false}" = "true" ]; then
  node /usr/local/bin/ensure-db.js 2>&1 || true
fi

exec "$@"
