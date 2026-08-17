"use client";

import { CheckIcon, ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import { cn } from "@tsu-stack/ui/lib/utils";

import { collapsePanel, field, mono, ShimmerLabel } from "@/shared/ui/surfaces";

export type ToolCallProps = {
  label: string;
  activeLabel: string;
  query: string;
  request: string;
  result: string;
  running: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function ToolCall({
  label,
  activeLabel,
  query,
  request,
  result,
  running,
  open,
  onOpenChange,
  className
}: ToolCallProps) {
  return (
    <Collapsible
      data-slot="tool-call"
      open={open}
      onOpenChange={onOpenChange}
      className={cn("w-full", className)}
    >
      <CollapsibleTrigger className="group/trigger flex items-center gap-2 rounded-md py-1 text-[13.5px] text-foreground/55 transition-colors outline-none hover:text-foreground/90">
        <ChevronRightIcon className="size-3.5 shrink-0 opacity-60 transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-panel-open/trigger:rotate-90 group-data-open/trigger:rotate-90 motion-reduce:transition-none" />
        {running ? (
          <ShimmerLabel active className="relative inline-block text-start leading-none">
            {activeLabel}
          </ShimmerLabel>
        ) : (
          <span className="text-start">{label}</span>
        )}
        {query ? (
          <span className={cn(mono, "rounded-md bg-foreground/6 px-1.5 py-0.5 text-foreground/70")}>
            {query}
          </span>
        ) : null}
        <span className="ms-auto flex w-4 items-center justify-end">
          {running ? null : (
            <CheckIcon className="size-3.5 animate-in text-emerald-500 duration-200 zoom-in-90 fade-in" />
          )}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className={cn(collapsePanel, "outline-none")}>
        <div className={cn(field, "mt-2 overflow-hidden rounded-2xl text-xs")}>
          <div className="px-3.5 pt-2.5 pb-2">
            <p className={cn(mono, "mb-1 text-foreground/35")}>Request</p>
            <p className="font-mono wrap-break-word text-foreground/55">{request || "—"}</p>
          </div>
          <div className="mx-3.5 h-px bg-foreground/6" />
          <div className="px-3.5 pt-2 pb-2.5">
            <p className={cn(mono, "mb-1 text-foreground/35")}>Result</p>
            <p className="wrap-break-word text-foreground/90">{running ? "…" : result || "—"}</p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

const QUERY_KEYS = ["query", "q", "id", "href", "name", "title", "companyName", "url"] as const;

export function toolCallQueryChip(input: unknown): string {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "";
  const row = input as Record<string, unknown>;
  for (const key of QUERY_KEYS) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 48);
  }
  return "";
}

export function toolCallPayload(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

export function HubTraceToolCall({
  toolName,
  args,
  result,
  status,
  state
}: {
  toolName: string;
  args?: unknown;
  result?: unknown;
  status?: { type?: string };
  state?: string;
}) {
  const [open, setOpen] = useState(false);
  const running =
    status?.type === "running" ||
    status?.type === "requires-action" ||
    state === "input-streaming" ||
    state === "input-available" ||
    state === "call" ||
    state === "partial-call";

  return (
    <ToolCall
      label={toolName}
      activeLabel={toolName}
      query={toolCallQueryChip(args)}
      request={toolCallPayload(args)}
      result={toolCallPayload(result)}
      running={running}
      open={open}
      onOpenChange={setOpen}
      className="max-w-[min(72ch,100%)]"
    />
  );
}
