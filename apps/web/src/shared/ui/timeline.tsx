"use client";

import { type ComponentProps, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { take } from "./range";
import { mono, paper } from "./surfaces";

export type TimelineWhen = "past" | "now" | "future";

export type TimelineEvent = {
  id: string;
  when: TimelineWhen;
  time: string;
  title: string;
  detail?: ReactNode;
};

export function Timeline({
  events,
  visibleCount,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "events" | "visibleCount"> & {
  events: readonly TimelineEvent[];
  visibleCount: number;
}) {
  return (
    <div
      data-slot="timeline"
      className={cn(paper, "flex w-full max-w-sm flex-col rounded-2xl p-4", className)}

      {...props}
    >
      {take(events, visibleCount).map((event, i, shown) => (
        <div
          key={event.id}
          className="grid animate-in grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-x-2 duration-300 fill-mode-both fade-in slide-in-from-left-1"
        >
          <span
            className={cn(
              mono,
              "pt-0.75 text-end tabular-nums",
              event.when === "future" ? "text-foreground/25" : "text-foreground/40"
            )}
          >
            {event.time}
          </span>

          <span className="flex flex-col items-center">
            <span
              className={cn(
                "mt-1 size-2 shrink-0 rounded-full",
                event.when === "now" && "bg-blue-500 ring-4 ring-blue-500/15 dark:bg-blue-400",
                event.when === "past" && "bg-foreground/30",
                event.when === "future" && "border border-foreground/20 bg-transparent"
              )}
            />
            {i < shown.length - 1 && (
              <span
                className={cn(
                  "w-px flex-1",
                  event.when === "future" ? "bg-foreground/8" : "bg-foreground/15"
                )}
              />
            )}
          </span>

          <div className={cn("flex flex-col gap-0.5", i < shown.length - 1 && "pb-3")}>
            <span
              className={cn(
                "text-[13px] wrap-break-word",
                event.when === "future" ? "text-foreground/40" : "text-foreground/90",
                event.when === "now" && "font-medium"
              )}
            >
              {event.title}
            </span>
            {event.detail ? (
              <div className="text-xs leading-relaxed wrap-break-word text-foreground/45">
                {event.detail}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
