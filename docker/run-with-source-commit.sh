#!/bin/sh
# Runtime wrapper: export SOURCE_COMMIT from the file baked at image build.
set -eu
if [ -z "${SOURCE_COMMIT:-}" ] || [ "${SOURCE_COMMIT}" = "unknown" ]; then
  if [ -f /etc/tsu-source-commit ]; then
    SOURCE_COMMIT="$(cat /etc/tsu-source-commit)"
    export SOURCE_COMMIT
  fi
fi
exec "$@"
