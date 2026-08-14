import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import {
  formatStackTypeLabel,
  normalizeStackType,
  STACK_TYPE_ORDER,
  type StackOutput
} from "@tsu-stack/core";
import {
  NativeMarquee,
  SideFadeGradients
} from "@tsu-stack/ui/components/uitripled/native-marquee";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";

import { useGetPortfolioListQuery } from "@/features/portfolio";

import { StackChip } from "@/pages/home-page/ui/stack-chip";

type FeaturedTypeGroup = {
  type: string;
  label: string;
  stacks: StackOutput[];
};

function groupFeaturedStacksByType(stacks: StackOutput[]): FeaturedTypeGroup[] {
  const byType = new Map<string, StackOutput[]>();
  for (const stack of stacks) {
    const type = normalizeStackType(stack.type);
    const list = byType.get(type) ?? [];
    list.push(stack);
    byType.set(type, list);
  }

  const groups: FeaturedTypeGroup[] = [];
  const seen = new Set<string>();

  const push = (type: string) => {
    const list = byType.get(type);
    if (!list?.length) return;
    seen.add(type);
    groups.push({
      type,
      label: formatStackTypeLabel(type),
      stacks: [...list].toSorted(
        (a, b) =>
          a.sortOrder - b.sortOrder ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      )
    });
  };

  for (const type of STACK_TYPE_ORDER) push(type);
  for (const type of byType.keys()) {
    if (!seen.has(type)) push(type);
  }
  return groups;
}

function FeaturedTypeTrack({ stacks, reverse }: { stacks: StackOutput[]; reverse: boolean }) {
  const isClient = useIsClient();
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const trackRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  const items = useMemo(
    () =>
      stacks.map((stack) => {
        return {
          id: stack.id,
          label: stack.name,
          content: <StackChip stack={stack} />
        };
      }),
    [stacks]
  );

  useEffect(() => {
    const track = trackRef.current;
    const measure = measureRef.current;
    if (!track || !measure) return;

    const update = () => {
      setOverflows(measure.scrollWidth > track.clientWidth + 1);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(track);
    observer.observe(measure);
    return () => observer.disconnect();
  }, [stacks]);

  const useMarquee = isClient && !reduceMotion && overflows;

  return (
    <div ref={trackRef} className="relative min-h-5 min-w-0">
      <div
        ref={measureRef}
        className={cn(
          "flex w-max items-center gap-1.5",
          useMarquee && "pointer-events-none invisible absolute inset-y-0 inset-s-0"
        )}
        aria-hidden={useMarquee}
      >
        {stacks.map((stack) => (
          <StackChip key={stack.id} stack={stack} />
        ))}
      </div>
      {useMarquee ? (
        <>
          <NativeMarquee
            items={items}
            speed={4}
            gap={8}
            reverse={reverse}
            pauseOnHover
            pauseOnTouch
          />
          <SideFadeGradients sizeClassName="w-6" fromClassName="from-background" />
        </>
      ) : null}
    </div>
  );
}

export function FeaturedStacksSection({ username }: { username: string }) {
  const portfolioQuery = useGetPortfolioListQuery(username);
  const featured = useMemo(
    () => (portfolioQuery.data?.stacks ?? []).filter((stack) => stack.isFeatured),
    [portfolioQuery.data?.stacks]
  );
  const groups = useMemo(() => groupFeaturedStacksByType(featured), [featured]);

  if (groups.length === 0) return null;

  return (
    <section
      id="stacks"
      data-slot="panel"
      className="screen-line-bottom"
      aria-label="Featured stacks"
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-2.5">
        {groups.map((group, index) => (
          <Fragment key={group.type}>
            <p className="font-mono text-[0.65rem] leading-none font-medium tracking-wide whitespace-nowrap text-muted-foreground uppercase">
              {group.label}
            </p>
            <FeaturedTypeTrack stacks={group.stacks} reverse={index % 2 === 1} />
          </Fragment>
        ))}
      </div>
    </section>
  );
}
