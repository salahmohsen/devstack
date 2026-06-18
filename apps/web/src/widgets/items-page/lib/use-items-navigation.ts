import { useCallback, useEffect, useRef } from "react";

import { isAnyItemSelected } from "@/widgets/items-page/lib/is-any-item-selected";

type UseItemsNavigationOptions<T extends { id: string }> = {
  items: readonly T[] | null;
  itemInfo: T | null;
  isItemSelected: Record<string, boolean> | null | undefined;
  setItemInfo: (item: T | null) => void;
  setItemSelected: (selected: Record<string, boolean> | null) => void;
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
  itemInfo,
  isItemSelected,
  setItemInfo,
  setItemSelected,
  containerRef
}: UseItemsNavigationOptions<T>) {
  const itemIds = items?.map((item) => item.id) ?? [];
  const isAnySelected = isAnyItemSelected(isItemSelected);

  const setSelectionById = useCallback(
    (id: string) => {
      const target = items?.find((item) => item.id === id);
      if (!target) return;
      setItemInfo(target);
      setItemSelected({ [id]: true });
    },
    [items, setItemInfo, setItemSelected]
  );

  const resetSelection = useCallback(
    (last = false) => {
      if (!items?.length) return;
      const target = last ? items[items.length - 1] : items[0];
      setItemInfo(target);
      setItemSelected({ [target.id]: true });
    },
    [items, setItemInfo, setItemSelected]
  );

  const handleNext = useCallback(() => {
    if (!items?.length) return;
    if (!itemInfo || !isAnySelected) {
      resetSelection(false);
      return;
    }
    const idx = itemIds.indexOf(itemInfo.id);
    if (idx === -1 || idx >= itemIds.length - 1) {
      resetSelection(false);
      return;
    }
    setSelectionById(itemIds[idx + 1]);
  }, [items, itemInfo, isAnySelected, itemIds, resetSelection, setSelectionById]);

  const handlePrev = useCallback(() => {
    if (!items?.length) return;
    if (!itemInfo || !isAnySelected) {
      resetSelection(true);
      return;
    }
    const idx = itemIds.indexOf(itemInfo.id);
    if (idx <= 0) {
      resetSelection(true);
      return;
    }
    setSelectionById(itemIds[idx - 1]);
  }, [items, itemInfo, isAnySelected, itemIds, resetSelection, setSelectionById]);

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
    if (!itemInfo) return;
    if (lastScrolledId.current === itemInfo.id) return;
    const container = containerRef?.current;
    if (!container) return;
    const target = container.querySelector<HTMLElement>(
      `[data-item-id="${CSS.escape(itemInfo.id)}"]`
    );
    if (!target) return;
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
    lastScrolledId.current = itemInfo.id;
  }, [itemInfo, containerRef]);

  return { handleNext, handlePrev };
}
