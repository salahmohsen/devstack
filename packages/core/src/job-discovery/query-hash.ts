/**
 * Canonical preference-query hash for per-user fetch dedup/invalidation.
 * Same filters in any key/array order → same hash; any value change → new hash.
 */
export async function preferenceQueryHash(filters: Record<string, unknown>): Promise<string> {
  const json = JSON.stringify(canonicalize(filters));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(json));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

function compareJson(a: unknown, b: unknown): number {
  const left = JSON.stringify(a);
  const right = JSON.stringify(b);
  return left < right ? -1 : left > right ? 1 : 0;
}

/** Sort keys, sort arrays, trim strings, drop null/undefined/empty strings/arrays. */
function canonicalize(value: unknown): unknown {
  if (value == null) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (Array.isArray(value)) {
    const items = value
      .map(canonicalize)
      .filter((item) => item !== undefined)
      .toSorted(compareJson);
    return items.length === 0 ? undefined : items;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .map(([key, child]) => [key, canonicalize(child)] as const)
      .filter(([, child]) => child !== undefined)
      .toSorted(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return entries.length === 0 ? undefined : Object.fromEntries(entries);
  }
  return value;
}
