import { useRef } from "react";

import { useItemsNavContext } from "@/widgets/items-page/lib/items-nav-context";
import { ItemSkeleton } from "@/widgets/items-page/ui/item-skeleton";

type ItemsListProps<T> = {
  items: readonly T[] | null;
  isLoading?: boolean;
  /**
   * Render a single item. The `data-item-id` attribute is automatically
   * applied to the wrapper, so keyboard nav can scroll to it.
   */
  renderItem: (item: T) => React.ReactNode;
  /**
   * When `true` (default), the skeleton is shown on every load, including
   * refetches. Set to `false` to only show the skeleton on first load
   * (once items have been seen, subsequent refetches render the existing
   * list while a subtle indicator shows the refresh).
   */
  showSkeletonOnRefetch?: boolean;
  /** Skeleton row count when loading. */
  skeletonCount?: number;
  /** Empty state shown when `items` is empty and not loading. */
  emptyState: React.ReactNode;
  /** Optional container ref override. Falls back to the provider's ref. */
  containerRef?: React.RefObject<HTMLUListElement | null>;
  className?: string;
};

/**
 * Generic list shell for the items-page widget.
 *
 * - Renders items via `renderItem` and applies `data-item-id` automatically.
 * - Shows the skeleton on first load (or always, per `showSkeletonOnRefetch`).
 * - Renders the empty state when the list is empty and not loading.
 * - Attaches the provider's `containerRef` for keyboard scroll-into-view
 *   when no `containerRef` prop is provided.
 */
export function ItemsList<T extends { id: string }>({
  items,
  isLoading,
  renderItem,
  showSkeletonOnRefetch = true,
  skeletonCount,
  emptyState,
  containerRef: containerRefOverride,
  className
}: ItemsListProps<T>) {
  const ctx = useItemsNavContext();
  const ref = containerRefOverride ?? ctx.containerRef;

  const hasLoadedOnce = useRef(false);
  if (items && items.length > 0) {
    hasLoadedOnce.current = true;
  }
  const showSkeleton = isLoading && (showSkeletonOnRefetch || !hasLoadedOnce.current);

  if (showSkeleton) {
    return <ItemSkeleton count={skeletonCount} />;
  }

  if (!items || items.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <ul ref={ref} className={className ?? "space-y-2 outline-none"} data-items-list>
      {items.map((item) => (
        <li key={item.id} data-item-id={item.id}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}
