#!/bin/sh
# Resolve deploy/build SHA for Docker images.
#
# Priority:
#   1. SOURCE_COMMIT (compose/CI/Dokploy env → build arg)
#   2. DOKPLOY_COMMIT_HASH (future Dokploy auto inject — PR #4007)
#   3. DOKPLOY_COMMIT_SHORT
#   4. .git/HEAD (packed or symbolic ref — no git binary required)
#   5. git rev-parse HEAD (if git is installed)
#   6. "unknown"
#
# Usage (Dockerfile build stage, after COPY . .):
#   ARG SOURCE_COMMIT=
#   ARG DOKPLOY_COMMIT_HASH=
#   ARG DOKPLOY_COMMIT_SHORT=
#   RUN docker/resolve-source-commit.sh > /tmp/SOURCE_COMMIT
set -eu

read_git_head() {
  if [ ! -f .git/HEAD ]; then
    return 1
  fi
  head_content="$(tr -d '[:space:]' < .git/HEAD)"
  case "$head_content" in
    ref:*)
      ref_path="${head_content#ref:}"
      ref_path="${ref_path# }"
      if [ -f ".git/${ref_path}" ]; then
        tr -d '[:space:]' < ".git/${ref_path}"
        return 0
      fi
      # Packed refs fallback
      if [ -f .git/packed-refs ]; then
        # lines: <sha> <ref>
        awk -v ref="$ref_path" '$2 == ref { print $1; found=1; exit } END { exit !found }' .git/packed-refs \
          && return 0
      fi
      return 1
      ;;
    *)
      # Detached HEAD — raw SHA
      printf '%s' "$head_content"
      return 0
      ;;
  esac
}

sc="${SOURCE_COMMIT:-}"
if [ -z "${sc}" ]; then
  sc="${DOKPLOY_COMMIT_HASH:-}"
fi
if [ -z "${sc}" ]; then
  sc="${DOKPLOY_COMMIT_SHORT:-}"
fi
if [ -z "${sc}" ]; then
  sc="$(read_git_head 2>/dev/null || true)"
fi
if [ -z "${sc}" ] && command -v git >/dev/null 2>&1 && [ -d .git ]; then
  sc="$(git rev-parse HEAD 2>/dev/null || true)"
fi

printf '%s' "${sc:-unknown}"
