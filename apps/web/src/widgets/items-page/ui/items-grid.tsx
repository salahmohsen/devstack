import { type ReactNode, type Ref } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import {
  ITEMS_GRID_CELL_CLASSNAME,
  ITEMS_GRID_CLASSNAME
} from "@/widgets/items-page/lib/items-grid-layout";
import { GridSkeleton } from "@/widgets/items-page/ui/item-skeleton";

export {
  ITEMS_GRID_CELL_CLASSNAME,
  ITEMS_GRID_CLASSNAME,
  useItemsGridColumnCount
} from "@/widgets/items-page/lib/items-grid-layout";

export function ItemsGridCell({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ITEMS_GRID_CELL_CLASSNAME, className)}>{children}</div>;
}

type ItemsGridProps<T extends { id: string }> = {
  items: readonly T[];
  isLoading?: boolean;
  emptyState: ReactNode;
  renderItem: (item: T) => ReactNode;
  containerRef?: Ref<HTMLDivElement | null>;
  skeletonCount?: number;
  /** Infinite-scroll sentinel, loaders, etc. */
  after?: ReactNode;
  footer?: ReactNode;
};

/**
 * Dashboard entity grid (Skills, Resumes). Loading / empty / cells live here
 * so pages do not copy the column recipe or `@container` cell wrapper.
 */
export function ItemsGrid<T extends { id: string }>({
  items,
  isLoading = false,
  emptyState,
  renderItem,
  containerRef,
  skeletonCount = 8,
  after,
  footer
}: ItemsGridProps<T>) {
  if (isLoading) return <GridSkeleton count={skeletonCount} />;
  if (items.length === 0) return emptyState;

  return (
    <>
      <div ref={containerRef} className={ITEMS_GRID_CLASSNAME}>
        {items.map((item) => (
          <ItemsGridCell key={item.id}>{renderItem(item)}</ItemsGridCell>
        ))}
      </div>
      {after}
      {footer}
    </>
  );
}
