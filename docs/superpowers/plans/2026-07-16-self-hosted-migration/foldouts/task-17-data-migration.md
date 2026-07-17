# Foldout: Task 17 — Data Migration (Neon → self-hosted)

**This foldout expands Task 17 in `plan.md`.** Read both.

## Goal

One-shot, idempotent script that moves production data from
Neon (`NEON_DATABASE_URL`) to a local self-hosted Postgres
(`postgresql://...@localhost:5432/personal_hub`). The local DB is
empty before this script runs.

## Pre-Conditions (`@blocker-if`)

- [ ] Docker Compose stack is up: `docker compose up -d postgres`
- [ ] Postgres healthcheck passes:
      `docker compose ps postgres | grep healthy`
- [ ] `NEON_DATABASE_URL` is set in shell (read-only access
      credentials)

## Files to Create

- Create: `scripts/migrate-from-neon.sh`
- Create: `scripts/postgres/wait-healthy.sh` _(helper)_

## Done-When

```bash
# 1. Verify both databases reachable:
psql "$NEON_DATABASE_URL" -c "SELECT count(*) FROM portfolio_entry;"
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/personaL_hub" \
     -c "SELECT 1"
# Both succeed.

# 2. Run the migration script:
./scripts/migrate-from-neon.sh
# Expected output:
#   Dumping...
#   Restore...
#   Migration complete: <N> rows in portfolio_entry on local

# 3. Verify counts match (within a few rows due to live writes on Neon):
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/personal_hub" \
     -c "SELECT count(*) FROM portfolio_entry;"
```

The migration script is **delete-it-after-use**. Plan Task 19
removes it.

## Canonical `migrate-from-neon.sh`

```bash
#!/usr/bin/env bash
# scripts/migrate-from-neon.sh
# ONE-SHOT — DELETE AFTER USE per task-19.
set -euo pipefail

: "${NEON_DATABASE_URL:?Need NEON_DATABASE_URL env}"
: "${POSTGRES_USER:=admin}"
: "${POSTGRES_PASSWORD:=changeme}"
: "${POSTGRES_DB:=personal_hub}"

LOCAL_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}"

echo "Waiting for local Postgres to be ready..."
until pg_isready -h localhost -p 5432 -U "$POSTGRES_USER"; do
  sleep 1
done

echo "Exporting from Neon..."
DUMP_FILE="$(mktemp /tmp/personal_hub.XXXX.dump)"
pg_dump "$NEON_DATABASE_URL" -Fc > "$DUMP_FILE"

echo "Restoring to local Postgres..."
pg_restore -h localhost -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
           --clean --if-exists --no-owner --no-acl "$DUMP_FILE" || \
    pg_restore -h localhost -p 5432 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
               --clean --if-exists --no-owner --no-acl --single-transaction "$DUMP_FILE"

echo "Done. Dump file: $DUMP_FILE"

# Best-effort: ensure schema (in case migration mode requires it):
echo "Running drizzle-kit migrate..."
pnpm --filter @tsu-stack/db db migrate

echo "Migration complete!"
```

## Pitfall: `pg_dump` version must match `postgres` server version

The local Docker image is `postgres:17-alpine`. Neon is Postgres 16.
`pg_dump` from an OLDER server targeting a NEWER major is generally
fine (Postgres 16 dump → Postgres 17 restore OK). The opposite is
NOT safe. Verify:

```bash
psql "$NEON_DATABASE_URL" -c "SELECT version();"
docker compose exec postgres psql -U "$POSTGRES_USER" -c "SELECT version();"
```

If local version is OLDER than Neon, abort and bump the Docker tag.

## Pitfall: Better Auth and Drizzle schema are in the same DB

`personal_hub` contains BOTH Drizzle-managed tables AND
`@auth/drizzle-schema` tables (Better Auth). The pg_dump captures
both. Restore covers both. No additional migration step needed
for Better Auth.

## Pitfall: The `mastra_agent` DB is empty after restore

`PostgresStore.init()` (called on first Mastra operation in the
server process) auto-creates `mastra_*, *_snapshot` etc. tables.
The dump does NOT contain Mastra tables since production Mastra
was on Turso (libsql, file-based). That's intentional — Mastra
starts fresh.

## After It Runs

The script's `DONE` line prints. Then:

```bash
# Smoke test: sign-in works locally
psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/personal_hub" \
     -c "SELECT id, email, name FROM \"user\" LIMIT 5;"
# >= 1 row expected.
```

Once confirmed, delete the script:

```bash
rm scripts/migrate-from-neon.sh scripts/postgres/wait-healthy.sh
```

(Plan Task 19 has the full cleanup).

## Commit (when ready to delete)

```bash
git add -u  # deletions
git commit -m "chore: remove Neon migration script after successful data move"
```
