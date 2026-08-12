/**
 * Shared multi-select helpers for list/grid pages.
 * Supports both string[] (tracked/new jobs) and Record maps (items-page stores).
 */

export type BatchIdMap = Record<string, boolean> | null | undefined;

/** Normalize selection state to an id list. */
export function selectedIdsFromState(selected: string[] | BatchIdMap): string[] {
  if (Array.isArray(selected)) return selected;
  if (!selected) return [];
  return Object.entries(selected)
    .filter(([, on]) => on)
    .map(([id]) => id);
}

export function isIdSelected(selected: string[] | BatchIdMap, id: string): boolean {
  if (Array.isArray(selected)) return selected.includes(id);
  return Boolean(selected?.[id]);
}

export function isBatchSelectActive(selected: string[] | BatchIdMap): boolean {
  return selectedIdsFromState(selected).length > 0;
}

export function areAllVisibleSelected(
  selected: string[] | BatchIdMap,
  visibleIds: readonly string[]
): boolean {
  if (visibleIds.length === 0) return false;
  return visibleIds.every((id) => isIdSelected(selected, id));
}
