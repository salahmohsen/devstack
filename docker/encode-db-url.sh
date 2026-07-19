#!/bin/sh
# Wraps the entrypoint to build a URL-safe DATABASE_URL at runtime.
# PostgreSQL passwords may contain + / = which break URL parsing;
# this script percent-encodes the password and sets DATABASE_URL accordingly.
# When CREATE_DB=true, also creates the target database via ensure-db.js.
set -eu

_user="${POSTGRES_USER:?}"
_pass="${POSTGRES_PASSWORD:?}"
_db="${POSTGRES_DB:-personal_hub}"
_host="${POSTGRES_HOST:-postgres}"
_port="${POSTGRES_PORT:-5432}"

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

# When CREATE_DB is set, attempt to create the target database.
if [ "${CREATE_DB:-false}" = "true" ]; then
  node /usr/local/bin/ensure-db.js 2>&1 || true
fi

exec "$@"
