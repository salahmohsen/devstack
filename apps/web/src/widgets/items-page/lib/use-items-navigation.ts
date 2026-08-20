import { useCallback, useEffect, useMemo, useRef } from "react";

import { isAnyOpened } from "@/widgets/items-page/lib/is-any-item-open";

export type ItemsNavLayout = "list" | "grid";

type UseItemsNavigationOptions<T extends { id: string }> = {
  items: readonly T[] | null;
  openedItem: T | null;
  isItemOpen: Record<string, boolean> | null | undefined;
  setOpenedItem: (item: T | null) => void;
  setIsItemOpen: (open: Record<string, boolean> | null) => void;
  containerRef?: React.RefObject<HTMLElement | null>;
  /** `grid` enables up/down (and a D-pad in the inspect footer). */
  layout?: ItemsNavLayout;
  /** Column count for `layout="grid"`. Ignored for lists. */
  columnCount?: number;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Keyboard-driven navigation across a list or grid of items.
 *
 * - List: ArrowLeft / ArrowRight cycles (wraps).
 * - Grid: Arrow keys move spatially; edges do not wrap.
 * - Skips when the user is typing in an input/textarea/contenteditable.
 * - Scrolls the newly selected item into view inside the container.
 */
export function useItemsNavigation<T extends { id: string }>({
  items,
  openedItem,
  isItemOpen,
  setOpenedItem,
  setIsItemOpen,
  containerRef,
  layout = "list",
  columnCount = 1
}: UseItemsNavigationOptions<T>) {
  const itemIds = useMemo(() => items?.map((item) => item.id) ?? [], [items]);
  const isAnyOpen = isAnyOpened(isItemOpen);

  const setSelectionById = useCallback(
    (id: string) => {
      const target = items?.find((item) => item.id === id);
      if (!target) return;
      setOpenedItem(target);
      setIsItemOpen({ [id]: true });
    },
    [items, setOpenedItem, setIsItemOpen]
  );

  const resetSelection = useCallback(
    (last = false) => {
      if (!items?.length) return;
      const target = last ? items[items.length - 1] : items[0];
      setOpenedItem(target);
      setIsItemOpen({ [target.id]: true });
    },
    [items, setOpenedItem, setIsItemOpen]
  );

  const cols = layout === "grid" ? Math.max(1, columnCount) : 1;
  const currentIndex = openedItem && isAnyOpen ? itemIds.indexOf(openedItem.id) : -1;
  const col = currentIndex >= 0 ? currentIndex % cols : 0;
  const hasItems = Boolean(items?.length);

  const canPrev =
    hasItems &&
    (layout === "list" ? items!.length > 1 : currentIndex < 0 || (currentIndex > 0 && col > 0));
  const canNext =
    hasItems &&
    (layout === "list"
      ? items!.length > 1
      : currentIndex < 0 || (col < cols - 1 && currentIndex < itemIds.length - 1));
  const canUp = layout === "grid" && hasItems && (currentIndex < 0 || currentIndex >= cols);
  const canDown =
    layout === "grid" && hasItems && (currentIndex < 0 || currentIndex + cols < itemIds.length);

  const handleNext = useCallback(() => {
    if (!items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(false);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    if (idx === -1 || idx >= itemIds.length - 1) {
      if (layout === "list") resetSelection(false);
      return;
    }
    if (layout === "grid" && idx % cols === cols - 1) return;
    setSelectionById(itemIds[idx + 1]);
  }, [items, openedItem, isAnyOpen, itemIds, layout, cols, resetSelection, setSelectionById]);

  const handlePrev = useCallback(() => {
    if (!items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(true);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    if (idx <= 0) {
      if (layout === "list") resetSelection(true);
      return;
    }
    if (layout === "grid" && idx % cols === 0) return;
    setSelectionById(itemIds[idx - 1]);
  }, [items, openedItem, isAnyOpen, itemIds, layout, cols, resetSelection, setSelectionById]);

  const handleUp = useCallback(() => {
    if (layout !== "grid" || !items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(true);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    if (idx < cols) return;
    setSelectionById(itemIds[idx - cols]);
  }, [layout, items, openedItem, isAnyOpen, itemIds, cols, resetSelection, setSelectionById]);

  const handleDown = useCallback(() => {
    if (layout !== "grid" || !items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(false);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    const next = idx + cols;
    if (next >= itemIds.length) return;
    setSelectionById(itemIds[next]);
  }, [layout, items, openedItem, isAnyOpen, itemIds, cols, resetSelection, setSelectionById]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isHorizontal = event.key === "ArrowLeft" || event.key === "ArrowRight";
      const isVertical = event.key === "ArrowUp" || event.key === "ArrowDown";
      if (!isHorizontal && !(layout === "grid" && isVertical)) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (event.key === "ArrowLeft") handlePrev();
      else if (event.key === "ArrowRight") handleNext();
      else if (event.key === "ArrowUp") handleUp();
      else handleDown();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev, handleUp, handleDown, layout]);

  const lastScrolledId = useRef<string | null>(null);
  useEffect(() => {
    if (!openedItem) return;
    if (lastScrolledId.current === openedItem.id) return;

    const id = openedItem.id;
    const frame = window.requestAnimationFrame(() => {
      const root: ParentNode = containerRef?.current ?? document;
      const target = root.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`);
      if (!target) return;
      lastScrolledId.current = id;
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openedItem, containerRef]);

  return {
    handleNext,
    handlePrev,
    handleUp,
    handleDown,
    layout,
    canPrev,
    canNext,
    canUp,
    canDown,
    columnCount: cols
  };
}
