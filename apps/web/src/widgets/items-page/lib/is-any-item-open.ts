/**
 * Returns true if any id in the open dict is open.
 * Safe for `null` and empty dicts.
 */
export function isAnyOpened(isItemOpen: Record<string, boolean> | null | undefined): boolean {
  if (!isItemOpen) return false;
  for (const key in isItemOpen) {
    if (isItemOpen[key]) return true;
  }
  return false;
}
