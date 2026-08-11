"use client";

import { Link } from "@tanstack/react-router";
import {
  BanIcon,
  BookmarkPlusIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  InboxIcon,
  MailSearchIcon,
  PackageIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  APPLICATION_SOURCE_TAG_LABELS,
  type ApplicationOutput,
  type ApplicationSourceTag
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconRotate, IconShake } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

import { DefaultLoader } from "@/shared/ui/default-loader";
import { Markdown } from "@/shared/ui/markdown";

import {
  ApplicationActivitySection,
  ApplicationMatchScoreBadge,
  useDeleteApplicationsMutation,
  useDismissApplicationMutation,
  useGenerateApplyPackageMutation,
  useListApplicationsQuery,
  usePromoteApplicationMutation,
  useRegenerateAgentTakeMutation,
  useRestoreApplicationMutation,
  useScanJobAlertsMutation
} from "@/features/applications";

import { ItemsEmpty, PageHeader, PageLayout } from "@/widgets/items-page";

import { ApplyPackageSheet } from "@/pages/dashboard/applications/ui/apply-package-sheet";

type InboxFilter = "inbox" | "dismissed";

function sourceTagLabel(tag: string): string {
  if (tag in APPLICATION_SOURCE_TAG_LABELS) {
    return APPLICATION_SOURCE_TAG_LABELS[tag as ApplicationSourceTag];
  }
  return tag;
}

function NewJobCard({
  job,
  filter,
  onPromote,
  onDismiss,
  onRestore,
  onTrackAndPackage,
  onRegenerateTake,
  onRequestDelete,
  busyId,
  takeBusyId
}: {
  job: ApplicationOutput;
  filter: InboxFilter;
  onPromote: (id: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
  onTrackAndPackage: (id: string) => void;
  onRegenerateTake: (id: string) => void;
  onRequestDelete: (id: string) => void;
  busyId: string | null;
  takeBusyId: string | null;
}) {
  const busy = busyId === job.id;
  const takeBusy = takeBusyId === job.id;
  const [activityOpen, setActivityOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [takeExpanded, setTakeExpanded] = useState(false);
  const hasDescription = Boolean(job.description?.trim());
  const hasSalary = Boolean(job.salaryRange?.trim());

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-xs/5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <h2 className="truncate text-sm font-semibold text-foreground">{job.title}</h2>
          <p className="truncate text-sm text-muted-foreground">{job.companyName}</p>
          {job.location ? <p className="text-xs text-muted-foreground">{job.location}</p> : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {job.matchScore != null ? (
            <ApplicationMatchScoreBadge matchScore={job.matchScore} />
          ) : null}
          {(job.sourceTags ?? []).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px] font-medium">
              {sourceTagLabel(tag)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {job.agentTake?.trim() ? (
          <p
            className={cn(
              "text-sm leading-relaxed text-muted-foreground",
              !takeExpanded && "line-clamp-3"
            )}
          >
            {job.agentTake}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground/80 italic">No agent take yet.</p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {job.agentTake && job.agentTake.length > 160 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setTakeExpanded((v) => !v)}
            >
              {takeExpanded ? "Show less" : "Show more"}
            </Button>
          ) : null}
          {job.url || job.applyUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              render={
                <a
                  href={(job.url ?? job.applyUrl)!}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open job listing"
                />
              }
            >
              <ExternalLinkIcon className="size-3.5" aria-hidden />
              Listing
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            disabled={busy || takeBusy}
            loading={takeBusy}
            onClick={() => onRegenerateTake(job.id)}
          >
            <RefreshCwIcon className="size-3.5" aria-hidden />
            {job.agentTake?.trim() ? "Regenerate take" : "Generate take"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {filter === "inbox" ? (
          <>
            <Group>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                loading={busy}
                onClick={() => onPromote(job.id)}
              >
                <IconRotate mode="hover">
                  <BookmarkPlusIcon />
                </IconRotate>
                Track
              </Button>
              <GroupSeparator />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onTrackAndPackage(job.id)}
              >
                <IconRotate mode="hover">
                  <PackageIcon />
                </IconRotate>
                Track & package
              </Button>
            </Group>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onDismiss(job.id)}
            >
              <IconShake mode="hover">
                <BanIcon />
              </IconShake>
              Dismiss
            </Button>
          </>
        ) : (
          <>
            <Group>
              <Button
                type="button"
                size="sm"
                disabled={busy}
                loading={busy}
                onClick={() => onPromote(job.id)}
              >
                <IconRotate mode="hover">
                  <BookmarkPlusIcon />
                </IconRotate>
                Track
              </Button>
              <GroupSeparator />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onTrackAndPackage(job.id)}
              >
                <IconRotate mode="hover">
                  <PackageIcon />
                </IconRotate>
                Track & package
              </Button>
            </Group>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onRestore(job.id)}
            >
              <IconRotate mode="hover">
                <RotateCcwIcon />
              </IconRotate>
              Restore
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={() => onRequestDelete(job.id)}
            >
              <Trash2Icon className="size-3.5" aria-hidden />
              Delete
            </Button>
          </>
        )}
      </div>

      {hasDescription || hasSalary ? (
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full justify-between px-2 text-muted-foreground"
              />
            }
          >
            <span className="text-xs font-medium tracking-wide uppercase">Details</span>
            <ChevronDownIcon
              className={cn("size-4 transition-transform", detailsOpen && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {hasSalary ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Salary · </span>
                {job.salaryRange}
              </p>
            ) : null}
            {hasDescription ? (
              <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {job.description!}
              </Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No job description.</p>
            )}
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-full justify-between px-2 text-muted-foreground"
            />
          }
        >
          <span className="text-xs font-medium tracking-wide uppercase">Activity & notes</span>
          <ChevronDownIcon
            className={cn("size-4 transition-transform", activityOpen && "rotate-180")}
            aria-hidden
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          {activityOpen ? (
            <ApplicationActivitySection applicationId={job.id} enabled={activityOpen} />
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}

export function NewJobsPage() {
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  /** Snapshot after promote+package — must not depend on inbox list (row leaves after promote). */
  const [packageApplication, setPackageApplication] = useState<ApplicationOutput | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [takeBusyId, setTakeBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const listQuery = useListApplicationsQuery(filter);
  const promote = usePromoteApplicationMutation();
  const dismiss = useDismissApplicationMutation();
  const restore = useRestoreApplicationMutation();
  const generatePackage = useGenerateApplyPackageMutation();
  const regenerateTake = useRegenerateAgentTakeMutation();
  const deleteApps = useDeleteApplicationsMutation();
  const scanJobAlerts = useScanJobAlertsMutation();

  const jobs = listQuery.data ?? [];

  const deleteJob = useMemo(
    () => (deleteId ? (jobs.find((j) => j.id === deleteId) ?? null) : null),
    [deleteId, jobs]
  );

  const run = async (id: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(okMessage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-5 overflow-hidden p-5">
      <PageHeader
        title="New jobs"
        description="AI discoveries from job alerts. Track to add to your pipeline, or dismiss."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              loading={scanJobAlerts.isPending}
              onClick={() => void scanJobAlerts.mutateAsync({})}
            >
              <MailSearchIcon className="size-4" aria-hidden />
              Scan job alerts
            </Button>
            <Group>
              <Button
                type="button"
                size="sm"
                variant={filter === "inbox" ? "default" : "outline"}
                onClick={() => setFilter("inbox")}
              >
                New{listQuery.isSuccess && filter === "inbox" ? ` (${jobs.length})` : ""}
              </Button>
              <GroupSeparator />
              <Button
                type="button"
                size="sm"
                variant={filter === "dismissed" ? "default" : "outline"}
                onClick={() => setFilter("dismissed")}
              >
                Dismissed
                {listQuery.isSuccess && filter === "dismissed" && jobs.length > 0
                  ? ` (${jobs.length})`
                  : ""}
              </Button>
            </Group>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {listQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <DefaultLoader />
          </div>
        ) : jobs.length === 0 ? (
          filter === "inbox" ? (
            <ItemsEmpty
              icon={<SparklesIcon aria-hidden />}
              title="No new matches"
              description="Job alert digests that pass your preferences will show up here. Scan recent digests, or set preferences under Settings."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    loading={scanJobAlerts.isPending}
                    onClick={() => void scanJobAlerts.mutateAsync({})}
                  >
                    <MailSearchIcon className="size-4" aria-hidden />
                    Scan job alerts
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    render={<Link to="/dashboard/settings/jobs" />}
                  >
                    Job preferences
                  </Button>
                </div>
              }
            />
          ) : (
            <ItemsEmpty
              icon={<InboxIcon aria-hidden />}
              title="No dismissed jobs"
              description="Jobs you dismiss from New stay here until you restore them, track them, or delete permanently."
            />
          )
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-8">
            {jobs.map((job) => (
              <NewJobCard
                key={job.id}
                job={job}
                filter={filter}
                busyId={busyId}
                takeBusyId={takeBusyId}
                onPromote={(id) =>
                  void run(id, () => promote.mutateAsync({ id }), "Moved to Tracked jobs")
                }
                onDismiss={(id) => void run(id, () => dismiss.mutateAsync({ id }), "Dismissed")}
                onRestore={(id) =>
                  void run(id, () => restore.mutateAsync({ id }), "Restored to New jobs")
                }
                onRequestDelete={(id) => setDeleteId(id)}
                onRegenerateTake={(id) => {
                  setTakeBusyId(id);
                  void regenerateTake
                    .mutateAsync({ id })
                    .catch(() => {
                      /* toast in mutation */
                    })
                    .finally(() => setTakeBusyId(null));
                }}
                onTrackAndPackage={(id) =>
                  void run(
                    id,
                    async () => {
                      await promote.mutateAsync({ id });
                      // Use generate response as sheet source — job leaves inbox list after promote.
                      const packed = await generatePackage.mutateAsync({ applicationId: id });
                      setPackageApplication(packed);
                    },
                    "Tracked — package ready"
                  )
                }
              />
            ))}
          </div>
        )}
      </div>

      {packageApplication ? (
        <ApplyPackageSheet
          open
          application={packageApplication}
          onOpenChange={(open) => {
            if (!open) setPackageApplication(null);
          }}
        />
      ) : null}

      <AlertDialog
        open={deleteId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteJob
                ? `Remove “${deleteJob.title}” at ${deleteJob.companyName} forever. This cannot be undone.`
                : "This cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              loading={deleteApps.isPending}
              onClick={() => {
                if (!deleteId) return;
                void deleteApps.mutateAsync({ ids: [deleteId] }).then(() => setDeleteId(null));
              }}
            >
              Delete forever
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </PageLayout>
  );
}
