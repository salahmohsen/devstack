export const STACK_ALTERNATIVE_NAMES_MAX = 20;
export const STACK_ALTERNATIVE_NAME_MAX_LENGTH = 80;

/**
 * Trim, drop empties/duplicates (case-insensitive), drop the canonical name,
 * cap length and count.
 */
export function normalizeStackAlternativeNames(
  names: readonly string[] | null | undefined,
  canonicalName?: string | null
): string[] {
  const skip = new Set<string>();
  const canonical = canonicalName?.trim().toLowerCase();
  if (canonical) skip.add(canonical);

  const out: string[] = [];
  for (const raw of names ?? []) {
    const name = raw.trim().slice(0, STACK_ALTERNATIVE_NAME_MAX_LENGTH);
    if (!name) continue;
    const key = name.toLowerCase();
    if (skip.has(key)) continue;
    skip.add(key);
    out.push(name);
    if (out.length >= STACK_ALTERNATIVE_NAMES_MAX) break;
  }
  return out;
}
