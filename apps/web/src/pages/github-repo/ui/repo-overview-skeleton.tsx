import { Container } from "@tsu-stack/ui/components/container";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";

const skeletonRows = ["s0", "s1", "s2", "s3", "s4", "s5", "s6", "s7"];

export function RepoOverviewSkeleton() {
  return (
    <Container className="space-y-6 py-8">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-56 rounded-xl" />
          <div className="overflow-hidden rounded-2xl border border-border">
            {skeletonRows.map((row) => (
              <div
                key={row}
                className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
              >
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-4 flex-1 rounded" />
                <Skeleton className="ml-auto h-4 w-14 rounded" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    </Container>
  );
}
