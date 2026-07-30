"use client";

import { formatDistanceToNow } from "date-fns";
import { ClipboardCheckIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  REVIEW_ITEM_KIND_LABELS,
  type ReviewItemDetail,
  type ReviewItemListItem
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Textarea } from "@tsu-stack/ui/components/textarea";
import { cn } from "@tsu-stack/ui/lib/utils";

import { SurfaceIslandLayout } from "@/shared/ui/dashboard-shell";
import { DefaultLoader } from "@/shared/ui/default-loader";

import {
  useConfirmReviewMutation,
  useDiscardReviewMutation,
  useGetReviewQuery,
  useListReviewQuery,
  useUpdateReviewMutation
} from "@/features/review";

import { ItemsEmpty, PageHeader, PageLayout } from "@/widgets/items-page";

const EMPTY: ReviewItemListItem[] = [];

export function ReviewPage() {
  const listQuery = useListReviewQuery({ status: "pending" });
  const items = listQuery.data ?? EMPTY;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeId = useMemo(() => {
    if (selectedId && items.some((i) => i.id === selectedId)) return selectedId;
    return items[0]?.id ?? null;
  }, [items, selectedId]);

  const detailQuery = useGetReviewQuery(activeId, { enabled: Boolean(activeId) });
  const detail = detailQuery.data ?? null;
  const listItem = items.find((i) => i.id === activeId) ?? null;

  return (
    <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-3 overflow-hidden p-5">
      <PageHeader
        title="Review"
        description="Confirm reply drafts and other AI actions that need your OK."
      />
      <SurfaceIslandLayout
        className="min-h-0 flex-1"
        islandClassName="md:w-56 lg:w-64"
        island={
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0 border-b px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardCheckIcon className="size-3.5 opacity-80" aria-hidden />
                Pending ({items.length})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listQuery.isLoading ? (
                <div className="flex justify-center py-10">
                  <DefaultLoader />
                </div>
              ) : listQuery.isError ? (
                <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                  <p className="text-sm text-muted-foreground">Couldn’t load the review queue.</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void listQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : items.length === 0 ? (
                <ItemsEmpty
                  className="py-10"
                  icon={<ClipboardCheckIcon aria-hidden />}
                  title="Queue clear"
                  description="No pending review items. Drafts appear after career mail is classified, or from Mail → Draft with agent."
                />
              ) : (
                <ul className="divide-y" aria-label="Pending review items">
                  {items.map((item) => {
                    const active = item.id === activeId;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          aria-current={active ? "true" : undefined}
                          className={cn(
                            "w-full px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                            active && "bg-muted/70"
                          )}
                        >
                          <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.preview}
                          </p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            {REVIEW_ITEM_KIND_LABELS[item.kind]} ·{" "}
                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        }
      >
        <ReviewDetail
          key={activeId ?? "none"}
          listItem={listItem}
          detail={detail}
          isLoading={detailQuery.isLoading && Boolean(activeId)}
          onResolved={() => setSelectedId(null)}
        />
      </SurfaceIslandLayout>
    </PageLayout>
  );
}

function ReviewDetail({
  listItem,
  detail,
  isLoading,
  onResolved
}: {
  listItem: ReviewItemListItem | null;
  detail: ReviewItemDetail | null;
  isLoading: boolean;
  onResolved: () => void;
}) {
  const confirm = useConfirmReviewMutation();
  const discard = useDiscardReviewMutation();
  const update = useUpdateReviewMutation();

  /** Local edits only; null means show server detail. */
  const [edit, setEdit] = useState<{ body: string; subject: string } | null>(null);

  const body = edit?.body ?? detail?.bodyText ?? "";
  const subject = edit?.subject ?? detail?.subject ?? "";
  const dirty = edit != null;

  const item = detail ?? listItem;

  if (!item) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
        Select a review item
      </div>
    );
  }

  if (isLoading && !detail) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <DefaultLoader />
      </div>
    );
  }

  async function handleSave() {
    if (!detail || !edit) return;
    await update.mutateAsync({
      id: detail.id,
      bodyText: edit.body,
      subject: edit.subject.trim() || null
    });
    setEdit(null);
  }

  /** Flush dirty local edits before send so confirm uses the text the user sees. */
  async function handleSend() {
    if (!detail) return;
    if (edit) {
      await update.mutateAsync({
        id: detail.id,
        bodyText: edit.body,
        subject: edit.subject.trim() || null
      });
      setEdit(null);
    }
    await confirm.mutateAsync({ id: detail.id });
    onResolved();
  }

  const busy = confirm.isPending || discard.isPending || update.isPending;

  return (
    <article className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
      <header className="shrink-0 space-y-1 border-b px-4 py-3">
        <h2 className="text-base font-semibold">{item.title}</h2>
        <p className="text-xs text-muted-foreground">
          To {item.toEmail ?? "—"}
          {detail?.mailFromName ? ` · from ${detail.mailFromName}` : ""}
          {detail?.applicationCompanyName
            ? ` · ${detail.applicationCompanyName}${detail.applicationTitle ? ` / ${detail.applicationTitle}` : ""}`
            : ""}
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="review-subject">
            Subject
          </label>
          <input
            id="review-subject"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={subject}
            onChange={(e) => {
              setEdit({ body, subject: e.target.value });
            }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="review-body">
            Draft
          </label>
          <Textarea
            id="review-body"
            value={body}
            rows={14}
            className="min-h-48 font-mono text-sm"
            onChange={(e) => {
              setEdit({ body: e.target.value, subject });
            }}
          />
        </div>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!dirty || busy || !detail}
          onClick={() => {
            void handleSave();
          }}
        >
          {update.isPending && !confirm.isPending ? "Saving…" : "Save edits"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy || !detail}
          onClick={() => {
            void handleSend();
          }}
        >
          {confirm.isPending ? "Sending…" : dirty ? "Save & send reply" : "Send reply"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy || !detail}
          onClick={() => {
            if (!detail) return;
            void discard.mutateAsync({ id: detail.id }).then(() => onResolved());
          }}
        >
          Discard
        </Button>
      </footer>
    </article>
  );
}
