"use client";

import { BookmarkPlusIcon, PackageIcon, RotateCcwIcon, BanIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  APPLICATION_SOURCE_TAG_LABELS,
  type ApplicationOutput,
  type ApplicationSourceTag
} from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconRotate, IconShake } from "@tsu-stack/ui/components/icon-motion";

import { DefaultLoader } from "@/shared/ui/default-loader";

import {
  ApplicationMatchScoreBadge,
  useDismissApplicationMutation,
  useGenerateApplyPackageMutation,
  useListApplicationsQuery,
  usePromoteApplicationMutation,
  useRestoreApplicationMutation
} from "@/features/applications";

import { PageHeader, PageLayout } from "@/widgets/items-page";

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
  busyId
}: {
  job: ApplicationOutput;
  filter: InboxFilter;
  onPromote: (id: string) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
  onTrackAndPackage: (id: string) => void;
  busyId: string | null;
}) {
  const busy = busyId === job.id;

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

      {job.agentTake?.trim() ? (
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {job.agentTake}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground/80 italic">No agent take yet.</p>
      )}

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
          </>
        )}
      </div>
    </article>
  );
}

export function NewJobsPage() {
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const [packageAppId, setPackageAppId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const listQuery = useListApplicationsQuery(filter);
  const promote = usePromoteApplicationMutation();
  const dismiss = useDismissApplicationMutation();
  const restore = useRestoreApplicationMutation();
  const generatePackage = useGenerateApplyPackageMutation();

  const jobs = listQuery.data ?? [];
  const packageApplication = useMemo(() => {
    if (!packageAppId) return null;
    return jobs.find((j) => j.id === packageAppId) ?? null;
  }, [jobs, packageAppId]);

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
            </Button>
          </Group>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {listQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <DefaultLoader />
          </div>
        ) : jobs.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            {filter === "inbox"
              ? "No new matches. Job alert digests that pass your preferences will show up here."
              : "No dismissed jobs."}
          </p>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-3 pb-8">
            {jobs.map((job) => (
              <NewJobCard
                key={job.id}
                job={job}
                filter={filter}
                busyId={busyId}
                onPromote={(id) =>
                  void run(id, () => promote.mutateAsync({ id }), "Moved to Tracked jobs")
                }
                onDismiss={(id) => void run(id, () => dismiss.mutateAsync({ id }), "Dismissed")}
                onRestore={(id) =>
                  void run(id, () => restore.mutateAsync({ id }), "Restored to New jobs")
                }
                onTrackAndPackage={(id) =>
                  void run(
                    id,
                    async () => {
                      await promote.mutateAsync({ id });
                      await generatePackage.mutateAsync({ applicationId: id });
                      setPackageAppId(id);
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
            if (!open) setPackageAppId(null);
          }}
        />
      ) : null}
    </PageLayout>
  );
}
