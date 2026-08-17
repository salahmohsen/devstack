"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

import { Badge } from "@tsu-stack/ui/components/badge";

import {
  groupHubStacksByType,
  parseListStacksResult
} from "@/features/agent-hub/lib/stack-catalog";

export function ListStacksToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseListStacksResult(result);
  if (status?.type === "running" && rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading stacks…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No stacks recorded yet.</p>;
  }
  const groups = groupHubStacksByType(rows);
  return (
    <div className="flex max-w-[min(72ch,100%)] flex-col gap-3" data-slot="stack-catalog">
      {groups.map((group) => (
        <div key={group.type} className="flex flex-col gap-1.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {group.type}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.stacks.map((stack) => (
              <Badge
                key={stack.id}
                variant={stack.featured ? "default" : "secondary"}
                className={stack.inPortfolio ? undefined : "opacity-70"}
              >
                {stack.name}
                {stack.projectCount > 0 ? (
                  <span className="ml-1 font-normal opacity-70">{stack.projectCount}</span>
                ) : null}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
