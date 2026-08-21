import { useMediaQuery } from "@/shared/lib/use-media-query";

/**
 * Viewport breakpoints (not auto-fill): column count stays stable when the
 * side panel opens and only card width animates — no item reflow/rearrange.
 * Keep in sync with {@link useItemsGridColumnCount}.
 */
export const ITEMS_GRID_CLASSNAME =
  "grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 animate-grid";

export const ITEMS_GRID_CELL_CLASSNAME = "@container animate-grid-item min-w-0 scroll-mt-3";

/** Matches {@link ITEMS_GRID_CLASSNAME} breakpoints for D-pad / keyboard nav. */
export function useItemsGridColumnCount(): number {
  const sm = useMediaQuery("(min-width: 640px)");
  const lg = useMediaQuery("(min-width: 1024px)");
  const xxl = useMediaQuery("(min-width: 1536px)");
  if (xxl) return 5;
  if (lg) return 4;
  if (sm) return 3;
  return 2;
}
