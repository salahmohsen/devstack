import { Card } from "@tsu-stack/ui/components/card.js";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import { cn } from "@tsu-stack/ui/lib/utils";

type ItemSkeletonProps = {
  /** How many skeleton rows to render. */
  count?: number;
};

export function ListSkeleton({ count = 6 }: ItemSkeletonProps) {
  return (
    <ul className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="flex items-center gap-3 rounded-xl border bg-card p-4">
          <Skeleton className="size-10 rounded-md" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </li>
      ))}
    </ul>
  );
}

export function GridSkeleton({ count = 6 }: ItemSkeletonProps) {
  return (
    <div
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Card
          role="button"
          tabIndex={-1}
          key={index}
          size="sm"
          className={cn(
            "group border-px relative aspect-square cursor-pointer rounded-sm border-border bg-transparent py-0!",
            "transition-all duration-200",
            "hover:border-border hover:bg-muted data-selected:border-foreground data-selected:bg-muted"
          )}
        >
          <Skeleton className="size-full" />
        </Card>
      ))}
    </div>
  );
}
