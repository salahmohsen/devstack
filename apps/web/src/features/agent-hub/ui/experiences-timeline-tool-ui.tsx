"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";

import { RichHtml } from "@/shared/ui/rich-html";
import { Timeline } from "@/shared/ui/timeline";

import {
  experiencesToTimelineEvents,
  parseGetExperienceResult,
  parseListExperiencesResult
} from "@/features/agent-hub/lib/experience-timeline";

export function ListExperiencesToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseListExperiencesResult(result);
  return (
    <ExperienceTimelineFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="No experiences yet."
    />
  );
}

export function GetExperienceToolUI({
  result,
  status
}: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const rows = parseGetExperienceResult(result);
  return (
    <ExperienceTimelineFrame
      rows={rows}
      pending={status?.type === "running"}
      empty="That experience was not found."
    />
  );
}

function ExperienceTimelineFrame({
  rows,
  pending,
  empty
}: {
  rows: ReturnType<typeof parseListExperiencesResult>;
  pending: boolean;
  empty: string;
}) {
  if (pending && rows.length === 0) {
    return <p className="text-xs text-muted-foreground">Loading experience…</p>;
  }
  if (rows.length === 0) {
    return <p className="text-xs text-muted-foreground">{empty}</p>;
  }
  const events = experiencesToTimelineEvents(rows).map((event) => {
    const meta = event.detail;
    const summaryHtml = event.summaryHtml;
    return {
      ...event,
      detail:
        meta || summaryHtml ? (
          <>
            {meta ? <span>{meta}</span> : null}
            {summaryHtml ? (
              <RichHtml html={summaryHtml} className="max-w-none text-xs text-foreground/45" />
            ) : null}
          </>
        ) : undefined
    };
  });
  return <Timeline events={events} visibleCount={events.length} className="max-w-none" />;
}
