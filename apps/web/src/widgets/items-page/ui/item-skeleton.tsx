import { Skeleton } from "@tsu-stack/ui/components/skeleton";

type ItemSkeletonProps = {
  /** How many skeleton rows to render. */
  count?: number;
};

export function ItemSkeleton({ count = 6 }: ItemSkeletonProps) {
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
