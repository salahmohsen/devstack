import { useCallback, useEffect, useMemo, useRef } from "react";

import { isAnyOpened } from "@/widgets/items-page/lib/is-any-item-open";

type UseItemsNavigationOptions<T extends { id: string }> = {
  items: readonly T[] | null;
  openedItem: T | null;
  isItemOpen: Record<string, boolean> | null | undefined;
  setOpenedItem: (item: T | null) => void;
  setIsItemOpen: (open: Record<string, boolean> | null) => void;
  containerRef?: React.RefObject<HTMLUListElement | null>;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Keyboard-driven navigation across a list of items.
 *
 * - ArrowLeft / ArrowRight cycles through items.
 * - Skips when the user is typing in an input/textarea/contenteditable.
 * - Scrolls the newly selected item into view inside the container.
 *
 * Returns `handleNext` and `handlePrev` for the page to wire into the
 * items-page footer (and any other keyboard-aware UI).
 */
export function useItemsNavigation<T extends { id: string }>({
  items,
  openedItem,
  isItemOpen,
  setOpenedItem,
  setIsItemOpen,
  containerRef
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

  const handleNext = useCallback(() => {
    if (!items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(false);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    if (idx === -1 || idx >= itemIds.length - 1) {
      resetSelection(false);
      return;
    }
    setSelectionById(itemIds[idx + 1]);
  }, [items, openedItem, isAnyOpen, itemIds, resetSelection, setSelectionById]);

  const handlePrev = useCallback(() => {
    if (!items?.length) return;
    if (!openedItem || !isAnyOpen) {
      resetSelection(true);
      return;
    }
    const idx = itemIds.indexOf(openedItem.id);
    if (idx <= 0) {
      resetSelection(true);
      return;
    }
    setSelectionById(itemIds[idx - 1]);
  }, [items, openedItem, isAnyOpen, itemIds, resetSelection, setSelectionById]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditableTarget(event.target)) return;

      event.preventDefault();
      if (event.key === "ArrowLeft") {
        handlePrev();
      } else {
        handleNext();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handlePrev]);

  const lastScrolledId = useRef<string | null>(null);
  useEffect(() => {
    if (!openedItem) return;
    if (lastScrolledId.current === openedItem.id) return;
    const container = containerRef?.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-item-id="${CSS.escape(openedItem.id)}"]`
    );
    if (!target) return;
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    lastScrolledId.current = openedItem.id;
  }, [openedItem, containerRef]);

  return { handleNext, handlePrev };
}
