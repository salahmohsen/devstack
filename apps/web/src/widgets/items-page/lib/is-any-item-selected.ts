/**
 * Returns true if any id in the selection dict is selected.
 * Safe for `null` and empty dicts.
 *
 * Replaces the cilas `Object.values(isItemSelected ?? false)[0] ?? false`
 * pattern, which was order-dependent and wrong for multi-entry dicts.
 */
export function isAnyItemSelected(
  isItemSelected: Record<string, boolean> | null | undefined
): boolean {
  if (!isItemSelected) return false;
  for (const key in isItemSelected) {
    if (isItemSelected[key]) return true;
  }
  return false;
}
