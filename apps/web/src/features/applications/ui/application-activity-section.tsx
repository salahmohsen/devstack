"use client";

import { formatDistanceToNow } from "date-fns";
import { SendIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import {
  formatApplicationActivitySummary,
  isUserApplicationActivity,
  type ApplicationActivityOutput
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Button } from "@tsu-stack/ui/components/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea
} from "@tsu-stack/ui/components/input-group";
import { cn } from "@tsu-stack/ui/lib/utils";

import { AiLoader } from "@/shared/ui/ai-loader";

import { useAddApplicationNoteMutation } from "@/features/applications/api/add-application-note.mutation";
import { useDeleteApplicationNoteMutation } from "@/features/applications/api/delete-application-note.mutation";
import { useListApplicationActivityQuery } from "@/features/applications/api/list-application-activity.query";

/** Matches the Activity heading: 20px icon column + 10px gap. */
const ACTIVITY_GRID = "grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-2.5";

function firstNameFromDisplayName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "You";
  return trimmed.split(/\s+/)[0] ?? "You";
}

function initialFromName(name: string | null | undefined): string {
  const first = firstNameFromDisplayName(name);
  return first.slice(0, 1).toUpperCase();
}

function activityWhen(value: Date | string) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return formatDistanceToNow(d, { addSuffix: true });
}

function ActivityRow({
  item,
  isLast,
  authorName,
  authorImage,
  onDelete
}: {
  item: ApplicationActivityOutput;
  isLast: boolean;
  authorName: string;
  authorImage?: string;
  onDelete?: (item: ApplicationActivityOutput) => void;
}) {
  const isUser = isUserApplicationActivity(item.kind);
  const summary = formatApplicationActivitySummary({
    kind: item.kind,
    body: item.body,
    metadata: item.metadata
  });

  return (
    <li className={ACTIVITY_GRID}>
      <span className="relative flex justify-center" aria-hidden>
        <span className="relative z-1 mt-1.5 size-2 shrink-0 rounded-full bg-muted-foreground/45" />
        {isLast ? null : (
          <span className="absolute top-2.5 -bottom-2.5 left-1/2 w-px -translate-x-1/2 bg-border" />
        )}
      </span>
      <div className={cn("min-w-0", !isLast && "pb-4")}>
        <div className="flex items-center justify-between gap-2">
          {isUser ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Avatar className="size-5 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10">
                {authorImage ? <AvatarImage alt="" src={authorImage} /> : null}
                <AvatarFallback className="text-[9px] font-medium">
                  {initialFromName(authorName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-medium text-foreground">{authorName}</span>
            </span>
          ) : (
            <p className="min-w-0 truncate text-sm font-medium text-foreground">System</p>
          )}
          <div className="flex shrink-0 items-center gap-0.5">
            <time
              dateTime={
                item.createdAt instanceof Date
                  ? item.createdAt.toISOString()
                  : String(item.createdAt)
              }
              className="text-[11px] text-muted-foreground tabular-nums"
            >
              {activityWhen(item.createdAt)}
            </time>
            {onDelete ? (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Delete note"
                onClick={() => onDelete(item)}
              >
                <Trash2Icon className="size-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
        <p
          className={cn(
            "mt-0.5 text-sm leading-relaxed",
            isUser ? "whitespace-pre-wrap text-foreground" : "text-muted-foreground"
          )}
        >
          {summary}
        </p>
      </div>
    </li>
  );
}

type ApplicationActivitySectionProps = {
  applicationId: string;
  className?: string;
  /** When false, skip fetching (e.g. collapsed card). Default true. */
  enabled?: boolean;
  /** When true, omit the local heading (parent already provides one). */
  hideHeading?: boolean;
};

export function ApplicationActivitySection({
  applicationId,
  className,
  enabled = true,
  hideHeading = false
}: ApplicationActivitySectionProps) {
  const [draft, setDraft] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<ApplicationActivityOutput | null>(null);
  const { user } = useAuth();
  const authorName = firstNameFromDisplayName(user?.name);
  const authorImage = user?.image ?? undefined;
  const activityQuery = useListApplicationActivityQuery(applicationId, { enabled });
  const addNote = useAddApplicationNoteMutation();
  const deleteNote = useDeleteApplicationNoteMutation();

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
    <section className={cn("min-w-0", className)}>
      {hideHeading ? null : (
        <h3 className="mb-3.5 text-[15px] font-semibold tracking-tight text-foreground">
          Activity
        </h3>
      )}

      {activityQuery.isLoading ? (
        <div className="flex justify-center py-4">
          <AiLoader />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ol className="m-0 list-none p-0">
          {items.map((item, index) => (
            <ActivityRow
              key={item.id}
              item={item}
              isLast={index === items.length - 1}
              authorName={authorName}
              authorImage={authorImage}
              onDelete={isUserApplicationActivity(item.kind) ? setNoteToDelete : undefined}
            />
          ))}
        </ol>
      )}

      <div className={cn("mt-6 min-w-0", hideHeading && ACTIVITY_GRID)}>
        {hideHeading ? <span aria-hidden /> : null}
        <InputGroup className="min-w-0">
          <InputGroupTextarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a note…"
            rows={2}
            aria-label="Add a note"
            disabled={addNote.isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canSubmit) {
                e.preventDefault();
                void onSubmit();
              }
            }}
          />
          <InputGroupAddon align="block-end" className="justify-between gap-2">
            <InputGroupText className="text-[11px]">⌘/Ctrl + Enter</InputGroupText>
            <Button
              type="button"
              size="sm"
              disabled={!canSubmit}
              loading={addNote.isPending}
              onClick={() => void onSubmit()}
            >
              <SendIcon className="size-3.5 rtl:-scale-x-100" aria-hidden />
              Add note
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </div>

      <AlertDialog
        open={noteToDelete != null}
        onOpenChange={(open) => {
          if (!open) setNoteToDelete(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteNote.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={deleteNote.isPending}
              onClick={() => {
                if (!noteToDelete) return;
                const payload = {
                  id: noteToDelete.id,
                  applicationId: noteToDelete.applicationId
                };
                void deleteNote.mutateAsync(payload).then(() => setNoteToDelete(null));
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </section>
  );
}
