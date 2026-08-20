import { Card } from "@tsu-stack/ui/components/card.js";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ITEMS_GRID_CLASSNAME } from "@/widgets/items-page/lib/items-grid-layout";

type ItemSkeletonProps = {
  /** How many skeleton rows to render. */
  count?: number;
};

export function ListSkeleton({ count = 6 }: ItemSkeletonProps) {
  return (
    <ul className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <Card render={<li />} key={index} className="flex flex-row items-center gap-3 bg-card p-4">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </Card>
      ))}
    </ul>
  );
}

export function GridSkeleton({ count = 6 }: ItemSkeletonProps) {
  return (
    <div className={ITEMS_GRID_CLASSNAME} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <Card
          // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
          role="button"
          tabIndex={-1}
          key={index}
          className={cn("group relative aspect-square cursor-pointer py-0!")}
        >
          <Skeleton className="size-full" />
        </Card>
      ))}
    </div>
  );
}
