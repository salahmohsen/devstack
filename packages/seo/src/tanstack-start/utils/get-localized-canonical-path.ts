import { normalizeCanonicalPath } from "#@/tanstack-start/utils/normalize-canonical-path";

export function getLocalizedCanonicalPath({
  canonicalPath
}: {
  canonicalPath: `/${string}`;
}): `/${string}` {
  return normalizeCanonicalPath(canonicalPath);
}
