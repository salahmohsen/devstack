"use client";

import { CheckIcon, Loader2Icon } from "lucide-react";
import { type ComponentProps } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { pct } from "./range";
import { mono, paper } from "./surfaces";

export type SubagentItem = {
  name: string;
  model: string;
};

export function SubagentList({
  agents,
  completedCount,
  progress,
  showSummary,
  summaryAgent,
  className,
  ...props
}: Omit<
  ComponentProps<"div">,
  "children" | "agents" | "completedCount" | "progress" | "showSummary" | "summaryAgent"
> & {
  agents: readonly SubagentItem[];
  completedCount: number;
  progress: readonly number[];
  showSummary: boolean;
  summaryAgent: SubagentItem;
}) {
  return (
    <div
      data-slot="subagent-list"
      className={cn("flex min-h-58 w-full max-w-xs flex-col gap-2", className)}

      {...props}
    >
      {agents.map((agent, index) => {
        const done = index < completedCount;
        const width = progress[index] ?? 0;

        return (
          <div
            key={agent.name}
            className={cn(paper, "flex flex-col gap-2 rounded-2xl px-3.5 py-2.5")}
          >
            <div className="flex items-center gap-2">
              {done ? (
                <CheckIcon className="size-3.5 shrink-0 animate-in text-emerald-500 duration-200 zoom-in-90 fade-in" />
              ) : (
                <Loader2Icon className="size-3.5 shrink-0 animate-spin text-foreground/35 motion-reduce:animate-none" />
              )}
              <span className="flex-1 truncate text-[13.5px]">{agent.name}</span>
              <span className={cn(mono, "text-foreground/35")}>{agent.model}</span>
            </div>
            <span className="h-0.75 w-full overflow-hidden rounded-full bg-foreground/6">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-700",
                  done ? "bg-emerald-500/70" : "bg-foreground/60"
                )}
                style={{ width: `${pct(width, 100)}%` }}
              />
            </span>
          </div>
        );
      })}
      {showSummary && (
        <div
          className={cn(
            paper,
            "flex animate-in flex-col gap-2 rounded-2xl px-3.5 py-2.5 duration-300 fade-in slide-in-from-bottom-2"
          )}
        >
          <div className="flex items-center gap-2">
            <Loader2Icon className="size-3.5 shrink-0 animate-spin text-foreground/35 motion-reduce:animate-none" />
            <span className="flex-1 truncate text-[13.5px]">{summaryAgent.name}</span>
            <span className={cn(mono, "text-foreground/35")}>{summaryAgent.model}</span>
          </div>
          <span className="h-0.75 w-full overflow-hidden rounded-full bg-foreground/6">
            <span
              className="block h-full rounded-full bg-foreground/60 transition-[width] duration-700"
              style={{ width: "42%" }}
            />
          </span>
        </div>
      )}
    </div>
  );
}
