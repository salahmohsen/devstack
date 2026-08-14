"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { type StackOutput } from "@tsu-stack/core";
import {
  NativeMarquee,
  SideFadeGradients
} from "@tsu-stack/ui/components/uitripled/native-marquee";
import { useIsClient } from "@tsu-stack/ui/hooks/use-is-client.hook";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useMediaQuery } from "@/shared/lib/use-media-query";

import { StackChip } from "@/pages/home-page/ui/stack-chip";

export function StackChipMarqueeRow({
  stacks,
  reverse = false,
  fadeFromClassName = "from-background"
}: {
  stacks: StackOutput[];
  reverse?: boolean;
  fadeFromClassName?: string;
}) {
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

  if (stacks.length === 0) return null;

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
          <SideFadeGradients sizeClassName="w-6" fromClassName={fadeFromClassName} />
        </>
      ) : null}
    </div>
  );
}

/** Split stacks across `rows` NativeMarquee tracks (second row runs the other way). */
export function StackChipMarqueeRows({
  stacks,
  rows = 2,
  fadeFromClassName = "from-card"
}: {
  stacks: StackOutput[];
  rows?: number;
  fadeFromClassName?: string;
}) {
  if (stacks.length === 0) return null;

  const trackCount = Math.min(Math.max(rows, 1), stacks.length);
  const tracks: StackOutput[][] = Array.from({ length: trackCount }, () => []);
  for (const [index, stack] of stacks.entries()) {
    tracks[index % trackCount]?.push(stack);
  }

  return (
    <span className="flex w-full min-w-0 flex-col gap-1.5">
      {tracks.map((row, index) => (
        <StackChipMarqueeRow
          key={row.map((stack) => stack.id).join("-") || index}
          stacks={row}
          reverse={index % 2 === 1}
          fadeFromClassName={fadeFromClassName}
        />
      ))}
    </span>
  );
}
