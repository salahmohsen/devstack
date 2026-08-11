"use client";

import { formatDistanceToNow } from "date-fns";
import { SendIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  formatApplicationActivitySummary,
  isUserApplicationActivity,
  type ApplicationActivityOutput
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle
} from "@tsu-stack/ui/components/reui/timeline";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { DefaultLoader } from "@/shared/ui/default-loader";

import { useAddApplicationNoteMutation } from "@/features/applications/api/add-application-note.mutation";
import { useListApplicationActivityQuery } from "@/features/applications/api/list-application-activity.query";

function activityWhen(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

function ActivityRow({ item, step }: { item: ApplicationActivityOutput; step: number }) {
  const isUser = isUserApplicationActivity(item.kind);
  const summary = formatApplicationActivitySummary({
    kind: item.kind,
    body: item.body,
    metadata: item.metadata
  });

  return (
    <TimelineItem step={step} className="pb-4 last:pb-0">
      <TimelineIndicator
        className={cn(
          isUser ? "border-primary bg-primary/15" : "border-muted-foreground/40 bg-muted"
        )}
      />
      <TimelineSeparator />
      <TimelineHeader className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <TimelineTitle className="text-sm font-medium text-foreground">
          {isUser ? "You" : "System"}
        </TimelineTitle>
        <TimelineDate className="mb-0 text-[11px] font-normal text-muted-foreground">
          {activityWhen(item.createdAt)}
        </TimelineDate>
      </TimelineHeader>
      <TimelineContent
        className={cn(
          "text-sm leading-relaxed",
          isUser ? "whitespace-pre-wrap text-foreground" : "text-muted-foreground"
        )}
      >
        {summary}
      </TimelineContent>
    </TimelineItem>
  );
}

type ApplicationActivitySectionProps = {
  applicationId: string;
  className?: string;
  /** When false, skip fetching (e.g. collapsed card). Default true. */
  enabled?: boolean;
};

export function ApplicationActivitySection({
  applicationId,
  className,
  enabled = true
}: ApplicationActivitySectionProps) {
  const [draft, setDraft] = useState("");
  const activityQuery = useListApplicationActivityQuery(applicationId, { enabled });
  const addNote = useAddApplicationNoteMutation();

  const items = activityQuery.data ?? [];
  const canSubmit = draft.trim().length > 0 && !addNote.isPending;

  const onSubmit = async () => {
    const body = draft.trim();
    if (!body) return;
    try {
      await addNote.mutateAsync({ applicationId, body });
      setDraft("");
      toast.success("Note added");
    } catch {
      // toast from mutation onError
    }
  };

  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        Activity
      </h3>

      {activityQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <DefaultLoader />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <Timeline
          defaultValue={items.length}
          value={items.length}
          className="ms-1"
          orientation="vertical"
        >
          {items.map((item, index) => (
            <ActivityRow key={item.id} item={item} step={index + 1} />
          ))}
        </Timeline>
      )}

      <div className="space-y-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a note…"
          rows={2}
          className="min-h-18 resize-y text-sm"
          disabled={addNote.isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
              e.preventDefault();
              void onSubmit();
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-muted-foreground">⌘/Ctrl + Enter to send</p>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit}
            loading={addNote.isPending}
            onClick={() => void onSubmit()}
          >
            <SendIcon className="size-3.5" aria-hidden />
            Add note
          </Button>
        </div>
      </div>
    </section>
  );
}
