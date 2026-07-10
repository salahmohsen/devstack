/**
 * Type guard that narrows an `unknown` value to a plain object record.
 *
 * Returns `true` for any non-null object (including arrays). Pair with
 * `Array.isArray` when you need to exclude arrays.
 *
 * @example
 * const value: unknown = JSON.parse(input);
 * if (isRecord(value) && typeof value.name === "string") {
 *   // value is now Record<string, unknown>
 * }
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

/**
 * Type guard that narrows `T | undefined` to `T`.
 *
 * Useful as a `.filter(...)` predicate to strip `undefined` from an array
 * while preserving the element type.
 *
 * @example
 * const items = [1, undefined, 2, 3].filter(isDefined);
 * // items: number[]  (not (number | undefined)[])
 */
export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}
