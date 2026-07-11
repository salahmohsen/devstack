/**
 * Formats a count as a compact, human-readable string with a `k` suffix
 * for values of 1,000 or above. Trailing `.0` is dropped
 * (e.g. `1500` -> `"1.5k"`, not `"1.50k"`).
 *
 * @example
 * formatCompactCount(999) // "999"
 * formatCompactCount(1000) // "1k"
 * formatCompactCount(1500) // "1.5k"
 * formatCompactCount(12345) // "12.3k"
 */
export function formatCompactCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return count.toString();
}
