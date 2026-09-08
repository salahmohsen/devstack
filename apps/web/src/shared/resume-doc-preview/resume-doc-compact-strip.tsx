"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  ResumeDocPreview,
  type ResumeDocPreviewProps
} from "@/shared/resume-doc-preview/resume-doc-preview";

/**
 * Single-column companion to the doc pane: section ticks + counts, expandable
 * to the full document. Used below `lg` where the sticky pane collapses.
 */
export function ResumeDocCompactStrip({
  draft,
  model,
  className
}: {
  draft?: ResumeDocPreviewProps["draft"];
  model?: ResumeDocPreviewProps["model"];
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const sections = model?.sections ?? [];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3.5 py-2.5">
        <ul className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {sections.map((section) => (
            <li
              key={section.id}
              className={cn(
                "flex items-center gap-1 text-xs tabular-nums",
                section.present ? "text-foreground" : "text-muted-foreground/70"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "size-1.5 rounded-full",
                  section.present ? "bg-success" : "bg-muted-foreground/40"
                )}
              />
              {section.label}
              {section.present ? (
                <span className="text-muted-foreground">{section.count}</span>
              ) : null}
            </li>
          ))}
        </ul>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Hide" : "Preview"}
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform duration-150 motion-reduce:transition-none",
              expanded && "rotate-180"
            )}
            aria-hidden
          />
        </Button>
      </div>
      {expanded ? <ResumeDocPreview draft={draft} model={model} /> : null}
    </div>
  );
}
