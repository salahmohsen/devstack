"use client";

import { Link } from "@tanstack/react-router";
import {
  BanIcon,
  BookmarkPlusIcon,
  Building2Icon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FileTextIcon,
  InboxIcon,
  LinkIcon,
  MapPinIcon,
  PackageIcon,
  PencilIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SparklesIcon,
  SquareCheckIcon,
  SquareIcon,
  Trash2Icon
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  applicationSourceChipLabels,
  type ApplicationOutput,
  isThinJobDescription
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
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Menu, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { Tabs, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import {
  areAllVisibleSelected,
  isBatchSelectActive,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { expandDashboardSidePanel } from "@/shared/lib/side-panel-control";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { JobIdentityMark, JobYearsBadge } from "@/shared/ui/job-card-marks";
import {
  ListItemContent,
  type ListItemMeta,
  type ListItemTag
} from "@/shared/ui/list-item-content";
import {
  createListItemContextSlots,
  createListItemMenuSlots,
  type ListItemMenuSlots
} from "@/shared/ui/list-item-menu-slots";

import { useEntityPanelHostActive } from "@/features/agent-hub";
import {
  ApplicationMatchScoreBadge,
  clearPendingOpenApplicationId,
  useAgentTakeJob,
  useBatchDismissApplicationsMutation,
  useBatchRestoreApplicationsMutation,
  useCountApplicationsQuery,
  useDeleteApplicationsMutation,
  useDismissApplicationMutation,
  useGenerateApplyPackageMutation,
  useListApplicationsQuery,
  usePromoteApplicationMutation,
  useRefreshFromListingJob,
  useRegenerateAgentTakeMutation,
  useRestoreApplicationMutation
} from "@/features/applications";
import { useGetJobPreferenceQuery } from "@/features/job-preference";

import {
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";
import { useSidePanelClose } from "@/widgets/layout";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { FixPostingUrlDialog } from "@/pages/dashboard/new-jobs/ui/fix-posting-url-dialog";
import { NewJobsDiscoveryActions } from "@/pages/dashboard/new-jobs/ui/new-jobs-discovery-actions";
import { UpdateDescriptionDialog } from "@/pages/dashboard/new-jobs/ui/update-description-dialog";

const ApplicationFormSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/application-form-sheet").then((m) => {
    return {
      default: m.ApplicationFormSheet
    };
  })
);
const ApplicationInfoPanel = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/application-info-panel").then((m) => {
    return {
      default: m.ApplicationInfoPanel
    };
  })
);
const ApplyPackageSheet = lazy(() =>
  import("@/pages/dashboard/tracked-jobs/ui/apply-package-sheet").then((m) => {
    return {
      default: m.ApplyPackageSheet
    };
  })
);

type InboxFilter = "inbox" | "dismissed";

const INBOX_TABS = [
  { value: "inbox" as const, label: "New" },
  { value: "dismissed" as const, label: "Dismissed" }
];

function newJobTags(job: ApplicationOutput): ListItemTag[] {
  const tags: ListItemTag[] = [];
  if (job.listingClosed) {
    tags.push({
      id: "listing-closed",
      label: "Listing closed",
      variant: "secondary",
      size: "xs",
      className: "text-muted-foreground",
      title: "This posting is no longer on the board."
    });
  }
  if (job.matchScore != null) {
    tags.push({
      id: "match-score",
      node: <ApplicationMatchScoreBadge matchScore={job.matchScore} />
    });
  }
  if (job.experienceYearsMin != null) {
    tags.push({
      id: "years",
      node: <JobYearsBadge years={job.experienceYearsMin} />
    });
  }
  for (const label of applicationSourceChipLabels({
    sourceTags: job.sourceTags,
    sourceLabel: job.sourceLabel
  }).slice(0, 2)) {
    tags.push({
      id: `source-${label}`,
      label,
      variant: "secondary",
      size: "xs"
    });
  }
  return tags;
}

function newJobMeta(job: ApplicationOutput): ListItemMeta[] {
  const meta: ListItemMeta[] = [{ id: "company", icon: Building2Icon, text: job.companyName }];
  if (job.location) {
    meta.push({ id: "location", icon: MapPinIcon, text: job.location });
  }
  return meta;
}

/** Usable JD for Track & package — rejects empty and harvest/paywall stubs. */
function hasUsableJobDescription(job: ApplicationOutput): boolean {
  return !isThinJobDescription(job.description);
}

const newJobMenuSlots = createListItemMenuSlots({ stopPropagation: true });
const newJobContextSlots = createListItemContextSlots();

function NewJobOverflowMenuItems({
  slots,
  job,
  filter,
  busy,
  takeBusy,
  batchSelected,
  onToggleSelect,
  onDismiss,
  onRestore,
  onTrackAndPackage,
  onPromote,
  onRegenerateTake,
  onUpdateDescription,
  onFixPostingUrl,
  onEdit,
  onRequestDelete
}: {
  slots: ListItemMenuSlots;
  job: ApplicationOutput;
  filter: InboxFilter;
  busy: boolean;
  takeBusy: boolean;
  batchSelected: boolean;
  onToggleSelect: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onTrackAndPackage: () => void;
  onPromote: () => void;
  onRegenerateTake: () => void;
  onUpdateDescription: () => void;
  onFixPostingUrl: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
}) {
  const { Item, Separator } = slots;
  const hasUsableDescription = hasUsableJobDescription(job);
  const hasAnyDescription = Boolean(job.description?.trim());

  if (filter === "dismissed") {
    return (
      <>
        <Item onClick={onToggleSelect}>
          {batchSelected ? <SquareCheckIcon aria-hidden /> : <SquareIcon aria-hidden />}
          {batchSelected ? "Deselect" : "Select"}
        </Item>
        <Separator />
        <Item onClick={onRestore} disabled={busy}>
          <RotateCcwIcon aria-hidden />
          Restore
        </Item>
        <Item onClick={onPromote} disabled={busy}>
          <BookmarkPlusIcon aria-hidden />
          Track
        </Item>
        <Separator />
        <Item onClick={onRequestDelete} disabled={busy} variant="destructive">
          <Trash2Icon className="text-destructive" aria-hidden />
          Delete permanently
        </Item>
      </>
    );
  }

  return (
    <>
      <Item onClick={onToggleSelect}>
        {batchSelected ? <SquareCheckIcon aria-hidden /> : <SquareIcon aria-hidden />}
        {batchSelected ? "Deselect" : "Select"}
      </Item>
      <Separator />
      <Item onClick={onEdit} disabled={busy}>
        <PencilIcon aria-hidden />
        Edit
      </Item>
      <Item onClick={onPromote} disabled={busy}>
        <BookmarkPlusIcon aria-hidden />
        Track only
      </Item>
      <Item
        onClick={hasUsableDescription ? onTrackAndPackage : undefined}
        disabled={!hasUsableDescription || busy}
      >
        <PackageIcon aria-hidden />
        Track &amp; package
      </Item>
      <Item onClick={onRegenerateTake} disabled={takeBusy || busy}>
        <RefreshCwIcon aria-hidden />
        {job.agentTake?.trim() ? "Regenerate take" : "Generate take"}
      </Item>
      <Item onClick={onFixPostingUrl} disabled={busy}>
        <LinkIcon aria-hidden />
        Fix posting URL
      </Item>
      <Item onClick={onUpdateDescription} disabled={busy}>
        <FileTextIcon aria-hidden />
        {hasAnyDescription ? "Update description" : "Add description"}
      </Item>
      <Separator />
      <Item onClick={onDismiss} disabled={busy} variant="destructive">
        <BanIcon aria-hidden />
        Dismiss
      </Item>
    </>
  );
}

function NewJobRowActions({
  job,
  filter,
  busy,
  takeBusy,
  batchSelected,
  onToggleSelect,
  onDismiss,
  onRestore,
  onTrackAndPackage,
  onPromote,
  onRegenerateTake,
  onUpdateDescription,
  onFixPostingUrl,
  onEdit,
  onRequestDelete,
  onViewListing
}: {
  job: ApplicationOutput;
  filter: InboxFilter;
  busy: boolean;
  takeBusy: boolean;
  batchSelected: boolean;
  onToggleSelect: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onTrackAndPackage: () => void;
  onPromote: () => void;
  onRegenerateTake: () => void;
  onUpdateDescription: () => void;
  onFixPostingUrl: () => void;
  onEdit: () => void;
  onRequestDelete: () => void;
  onViewListing?: () => void;
}) {
  const overflow = (
    <NewJobOverflowMenuItems
      slots={newJobMenuSlots}
      job={job}
      filter={filter}
      busy={busy}
      takeBusy={takeBusy}
      batchSelected={batchSelected}
      onToggleSelect={onToggleSelect}
      onDismiss={onDismiss}
      onRestore={onRestore}
      onTrackAndPackage={onTrackAndPackage}
      onPromote={onPromote}
      onRegenerateTake={onRegenerateTake}
      onUpdateDescription={onUpdateDescription}
      onFixPostingUrl={onFixPostingUrl}
      onEdit={onEdit}
      onRequestDelete={onRequestDelete}
    />
  );

  if (filter === "dismissed") {
    return (
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button type="button" size="sm" variant="outline" loading={busy} onClick={onRestore}>
          <RotateCcwIcon className="size-3.5" aria-hidden />
          Restore
        </Button>
        <Button type="button" size="sm" variant="outline" loading={busy} onClick={onPromote}>
          <BookmarkPlusIcon className="size-3.5" aria-hidden />
          Track
        </Button>
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                size="icon-sm"
                variant="outline"
                aria-label="More job actions"
              />
            }
          >
            <ChevronDownIcon className="size-3.5" aria-hidden />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-48">
            {overflow}
          </MenuPopup>
        </Menu>
      </div>
    );
  }

  const hasUsableDescription = hasUsableJobDescription(job);

  return (
    <Group aria-label="Job actions">
      {hasUsableDescription ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          loading={busy}
          onClick={onTrackAndPackage}
        >
          <PackageIcon className="size-3.5" aria-hidden />
          Track &amp; package
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" loading={busy} onClick={onFixPostingUrl}>
          <LinkIcon className="size-3.5" aria-hidden />
          Fix posting URL
        </Button>
      )}
      {onViewListing ? (
        <>
          <GroupSeparator />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={onViewListing}>
            <ExternalLinkIcon className="size-3.5" aria-hidden />
            View listing
          </Button>
        </>
      ) : null}
      <GroupSeparator />
      <Menu>
        <MenuTrigger
          render={
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              disabled={busy || takeBusy}
              aria-label="More job actions"
            />
          }
        >
          <ChevronDownIcon className="size-3.5" aria-hidden />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-48">
          {overflow}
        </MenuPopup>
      </Menu>
    </Group>
  );
}

export function NewJobsPage() {
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const [viewItem, setViewItem] = useState<ApplicationOutput | null>(null);
  useSidePanelClose(useCallback(() => setViewItem(null), []));
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [packageApplication, setPackageApplication] = useState<ApplicationOutput | null>(null);
  const [descriptionApp, setDescriptionApp] = useState<ApplicationOutput | null>(null);
  const [fixUrlApp, setFixUrlApp] = useState<ApplicationOutput | null>(null);
  const [editApp, setEditApp] = useState<ApplicationOutput | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  // Host wins the panel (any kind). Dirty application sheet is discarded without confirm.
  const hostOwnsPanel = useEntityPanelHostActive();
  if (hostOwnsPanel && editApp != null) setEditApp(null);

  const listQuery = useListApplicationsQuery(filter);
  const inboxCountQuery = useCountApplicationsQuery("inbox");
  const dismissedCountQuery = useCountApplicationsQuery("dismissed");
  const jobPreferenceQuery = useGetJobPreferenceQuery();
  const importFromEmail = jobPreferenceQuery.data?.importFromEmail === true;
  const promote = usePromoteApplicationMutation();
  const dismiss = useDismissApplicationMutation();
  const restore = useRestoreApplicationMutation();
  const batchDismiss = useBatchDismissApplicationsMutation();
  const batchRestore = useBatchRestoreApplicationsMutation();
  const generatePackage = useGenerateApplyPackageMutation();
  const regenerateTake = useRegenerateAgentTakeMutation();
  const agentTakeJob = useAgentTakeJob();
  const deleteApps = useDeleteApplicationsMutation();

  const jobs = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const tabCounts: Record<InboxFilter, number> = {
    inbox: inboxCountQuery.data?.count ?? (filter === "inbox" ? jobs.length : 0),
    dismissed: dismissedCountQuery.data?.count ?? (filter === "dismissed" ? jobs.length : 0)
  };

  const { pendingOpenApplicationId } = useRefreshFromListingJob();

  // Fix posting URL success toast can request open from any route.
  useEffect(() => {
    if (!pendingOpenApplicationId) return;
    const job = jobs.find((j) => j.id === pendingOpenApplicationId);
    if (!job) return;
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- open panel from external job toast
    setFilter("inbox");
    expandDashboardSidePanel();
    setViewItem(job);
    clearPendingOpenApplicationId();
  }, [pendingOpenApplicationId, jobs]);

  const liveViewItem = useMemo(() => {
    if (!viewItem) return null;
    return jobs.find((j) => j.id === viewItem.id) ?? viewItem;
  }, [jobs, viewItem]);

  const deleteJob = useMemo(
    () => (deleteId ? (jobs.find((j) => j.id === deleteId) ?? null) : null),
    [deleteId, jobs]
  );

  // Match Tracked jobs: isItemOpen is a Record; hook only returns next/prev.
  const isItemOpen = useMemo(
    () => (liveViewItem ? { [liveViewItem.id]: true } : null),
    [liveViewItem]
  );
  const isAnyOpen = isAnyOpened(isItemOpen);

  const setOpenedItem = useCallback((item: ApplicationOutput | null) => {
    if (item) expandDashboardSidePanel();
    setViewItem(item);
  }, []);

  const setIsItemOpen = useCallback(
    (open: Record<string, boolean> | null) => {
      if (!open) {
        setViewItem(null);
        return;
      }
      const id = Object.keys(open).find((k) => open[k]);
      if (!id) {
        setViewItem(null);
        return;
      }
      const item = jobs.find((j) => j.id === id);
      if (item) setViewItem(item);
    },
    [jobs]
  );

  const { handleNext, handlePrev } = useItemsNavigation({
    items: jobs,
    openedItem: liveViewItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    containerRef: listRef
  });

  const run = async (id: string, fn: () => Promise<unknown>, okMessage: string) => {
    setBusyId(id);
    try {
      await fn();
      toast.success(okMessage);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
    setBusyId(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const clearSelection = () => setSelectedIds([]);
  const selectAllVisible = () => setSelectedIds(jobs.map((j) => j.id));
  const selectedCount = selectedIdsFromState(selectedIds).length;
  const allVisibleSelected = areAllVisibleSelected(
    selectedIds,
    jobs.map((j) => j.id)
  );

  const bulkDismiss = async () => {
    if (selectedIds.length === 0 || filter !== "inbox") return;
    setBusyId("__bulk__");
    try {
      await batchDismiss.mutateAsync({ ids: [...selectedIds] });
      clearSelection();
      if (viewItem && selectedIds.includes(viewItem.id)) setViewItem(null);
    } catch {
      /* toast in mutation */
    }
    setBusyId(null);
  };

  const bulkRestore = async () => {
    if (selectedIds.length === 0 || filter !== "dismissed") return;
    setBusyId("__bulk_restore__");
    try {
      await batchRestore.mutateAsync({ ids: [...selectedIds] });
      clearSelection();
      if (viewItem && selectedIds.includes(viewItem.id)) setViewItem(null);
    } catch {
      /* toast in mutation */
    }
    setBusyId(null);
  };

  const bulkDeletePermanent = async () => {
    if (selectedIds.length === 0 || filter !== "dismissed") return;
    setBusyId("__bulk_delete__");
    try {
      await deleteApps.mutateAsync({ ids: [...selectedIds] });
      clearSelection();
      if (viewItem && selectedIds.includes(viewItem.id)) setViewItem(null);
      setBulkDeleteConfirmOpen(false);
    } catch {
      /* toast in mutation */
    }
    setBusyId(null);
  };

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev, containerRef: listRef }}>
      <PageLayout className="flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-col gap-5 overflow-hidden p-5">
        <PageHeader
          title="New jobs"
          description="Matches from public job boards. Track to add to your pipeline, or dismiss."
          actions={<NewJobsDiscoveryActions importFromEmail={importFromEmail} />}
        />

        <Tabs
          value={filter}
          onValueChange={(value) => {
            if (value === "inbox" || value === "dismissed") {
              setFilter(value);
              clearSelection();
              setViewItem(null);
            }
          }}
          className="flex min-h-0 flex-1 flex-col gap-3"
        >
          <TabsList className="w-fit shrink-0">
            {INBOX_TABS.map((tab) => {
              const count = tabCounts[tab.value];
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
                  {tab.label}
                  {count > 0 ? (
                    <Badge size="sm" variant="brand" className="tabular-nums">
                      {count > 99 ? "99+" : count}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {filter === "inbox" ? (
            <BatchSelectionBar
              selectedCount={selectedCount}
              totalCount={jobs.length}
              allVisibleSelected={allVisibleSelected}
              isDeleting={busyId === "__bulk__"}
              deleteLabel="Dismiss"
              deleteVariant="destructive"
              deleteUsesBanIcon
              onDeleteSelected={() => void bulkDismiss()}
              onSelectAll={selectAllVisible}
              onClearSelection={clearSelection}
            />
          ) : (
            <BatchSelectionBar
              selectedCount={selectedCount}
              totalCount={jobs.length}
              allVisibleSelected={allVisibleSelected}
              isDeleting={busyId === "__bulk_delete__"}
              isRestoring={busyId === "__bulk_restore__"}
              deleteLabel="Delete"
              deleteVariant="destructive"
              onDeleteSelected={() => setBulkDeleteConfirmOpen(true)}
              onRestoreSelected={() => void bulkRestore()}
              restoreLabel="Restore"
              onSelectAll={selectAllVisible}
              onClearSelection={clearSelection}
            />
          )}

          <div className="flex min-h-0 flex-1 flex-col">
            {listQuery.isLoading ? (
              <ListSkeleton />
            ) : jobs.length === 0 ? (
              filter === "inbox" ? (
                <ItemsEmpty
                  icon={<SparklesIcon aria-hidden />}
                  title="No new matches"
                  description="Public job boards that match your title and keywords show up here. Find jobs now, or set a title under Settings."
                  action={
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <NewJobsDiscoveryActions importFromEmail={importFromEmail} />
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
              <ul
                ref={listRef}
                className="min-h-0 flex-1 space-y-2 overflow-x-clip overflow-y-auto py-1"
              >
                {jobs.map((job) => {
                  const selected = viewItem?.id === job.id;
                  const batchSelected = selectedIds.includes(job.id);
                  const busy =
                    busyId === job.id ||
                    busyId === "__bulk__" ||
                    busyId === "__bulk_delete__" ||
                    busyId === "__bulk_restore__";
                  const takeBusy =
                    agentTakeJob.status === "running" && agentTakeJob.applicationId === job.id;
                  const listingUrl = job.url ?? job.applyUrl ?? null;
                  const rowActions = {
                    onDismiss: () =>
                      void run(job.id, () => dismiss.mutateAsync({ id: job.id }), "Dismissed"),
                    onRestore: () =>
                      void run(
                        job.id,
                        () => restore.mutateAsync({ id: job.id }),
                        "Restored to New jobs"
                      ),
                    onPromote: () =>
                      void run(
                        job.id,
                        () => promote.mutateAsync({ id: job.id }),
                        "Moved to Tracked jobs"
                      ),
                    onTrackAndPackage: () => {
                      if (!hasUsableJobDescription(job)) {
                        setFixUrlApp(job);
                        return;
                      }
                      void run(
                        job.id,
                        async () => {
                          await promote.mutateAsync({ id: job.id });
                          const packed = await generatePackage.mutateAsync({
                            applicationId: job.id
                          });
                          setPackageApplication(packed);
                        },
                        "Tracked — package ready"
                      );
                    },
                    onRegenerateTake: () => {
                      void regenerateTake.mutateAsync({
                        id: job.id,
                        title: job.title,
                        companyName: job.companyName,
                        trackingStatus: filter === "dismissed" ? "dismissed" : "inbox"
                      });
                    },
                    onUpdateDescription: () => setDescriptionApp(job),
                    onFixPostingUrl: () => setFixUrlApp(job),
                    onEdit: () => setEditApp(job),
                    onRequestDelete: () => setDeleteId(job.id),
                    onToggleSelect: () => toggleSelect(job.id)
                  };
                  return (
                    <li key={job.id} data-item-id={job.id}>
                      <ContextMenu>
                        <ContextMenuTrigger className="block w-full outline-none">
                          <ListItemContent
                            title={job.title}
                            selected={selected}
                            onSelect={() =>
                              setViewItem((current) => {
                                if (current?.id === job.id) return null;
                                expandDashboardSidePanel();
                                return job;
                              })
                            }
                            isBatchSelected={batchSelected}
                            batchSelectActive={isBatchSelectActive(selectedIds)}
                            onToggleSelect={rowActions.onToggleSelect}
                            tags={newJobTags(job)}
                            meta={newJobMeta(job)}
                            leading={
                              <JobIdentityMark
                                companyName={job.companyName}
                                logoUrl={job.companyLogoUrl}
                                size={40}
                                selected={selected}
                                className="size-10"
                              />
                            }
                            actions={
                              <NewJobRowActions
                                job={job}
                                filter={filter}
                                busy={busy}
                                takeBusy={takeBusy}
                                batchSelected={batchSelected}
                                onViewListing={
                                  listingUrl
                                    ? () => {
                                        window.open(listingUrl, "_blank", "noopener,noreferrer");
                                      }
                                    : undefined
                                }
                                {...rowActions}
                              />
                            }
                          />
                        </ContextMenuTrigger>
                        <ContextMenuPopup className="min-w-48">
                          <NewJobOverflowMenuItems
                            slots={newJobContextSlots}
                            job={job}
                            filter={filter}
                            busy={busy}
                            takeBusy={takeBusy}
                            batchSelected={batchSelected}
                            {...rowActions}
                          />
                        </ContextMenuPopup>
                      </ContextMenu>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Tabs>

        <Suspense fallback={null}>
          <ItemsInspectHost
            open={isAnyOpen && editApp == null && !hostOwnsPanel}
            item={liveViewItem}
            title="Job"
            onOpenChange={(next) => {
              if (!next) setViewItem(null);
            }}
          >
            {(item) => (
              <ApplicationInfoPanel
                item={item}
                variant="discovery"
                onEdit={() => setEditApp(item)}
              />
            )}
          </ItemsInspectHost>

          {packageApplication ? (
            <ApplyPackageSheet
              open
              application={packageApplication}
              onOpenChange={(open) => {
                if (!open) setPackageApplication(null);
              }}
            />
          ) : null}

          {editApp != null && !hostOwnsPanel ? (
            <ApplicationFormSheet
              key={editApp.id ?? "new-jobs-edit"}
              open
              onOpenChange={(open) => {
                if (!open) setEditApp(null);
              }}
              mode="edit"
              initialData={editApp}
            />
          ) : null}
        </Suspense>

        <FixPostingUrlDialog
          open={fixUrlApp != null}
          application={fixUrlApp}
          onOpenChange={(open) => {
            if (!open) setFixUrlApp(null);
          }}
        />

        <UpdateDescriptionDialog
          open={descriptionApp != null}
          application={descriptionApp}
          onOpenChange={(open) => {
            if (!open) setDescriptionApp(null);
          }}
          onSaved={(app) => {
            if (hasUsableJobDescription(app)) {
              toast.success("Description saved", {
                description: "Ready to track and prepare a package.",
                action: {
                  label: "Track & package",
                  onClick: () => {
                    void run(
                      app.id,
                      async () => {
                        await promote.mutateAsync({ id: app.id });
                        const packed = await generatePackage.mutateAsync({
                          applicationId: app.id
                        });
                        setPackageApplication(packed);
                      },
                      "Tracked — package ready"
                    );
                  }
                },
                duration: 12_000
              });
            } else {
              toast.message("Description saved", {
                description:
                  "Still looks too thin for packaging. Paste more of the posting or fix the URL."
              });
            }
          }}
        />

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
              <AlertDialogCancel disabled={deleteApps.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={deleteApps.isPending}
                onClick={() => {
                  if (!deleteId) return;
                  void deleteApps
                    .mutateAsync({ ids: [deleteId] })
                    .then(() => {
                      if (viewItem?.id === deleteId) setViewItem(null);
                      setDeleteId(null);
                      toast.success("Deleted");
                    })
                    .catch((e) => {
                      toast.error(e instanceof Error ? e.message : "Delete failed");
                    });
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>

        <AlertDialog
          open={bulkDeleteConfirmOpen}
          onOpenChange={(open) => {
            if (!open) setBulkDeleteConfirmOpen(false);
          }}
        >
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} jobs permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the selected dismissed jobs forever. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={busyId === "__bulk_delete__"}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={busyId === "__bulk_delete__"}
                onClick={() => {
                  void bulkDeletePermanent();
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </PageLayout>
    </ItemsNavProvider>
  );
}
