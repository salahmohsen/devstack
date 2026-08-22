"use client";

import { BriefcaseIcon, Building2Icon, FileTextIcon, MapPinIcon, PlusIcon } from "lucide-react";

import { type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { ChaoticPixelsLoader } from "@tsu-stack/ui/components/chaotic-pixels-loader";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

import { areAllVisibleSelected, isBatchSelectActive } from "@/shared/lib/batch-selection";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { JobIdentityMark, JobYearsBadge } from "@/shared/ui/job-card-marks";
import {
  ListItemContent,
  type ListItemMeta,
  type ListItemTag
} from "@/shared/ui/list-item-content";

import {
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  ApplicationStageBadge,
  ApplicationStatusBadge,
  getApplicationPrimaryAction,
  useDeleteApplicationsMutation
} from "@/features/applications";

import { ItemsEmpty, ListSkeleton } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import { ApplicationActionGroup } from "@/pages/dashboard/tracked-jobs/ui/application-action-group";
import { applicationContextSlots } from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
import { ApplicationItemActions } from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";

type ApplicationsListProps = {
  applications: ApplicationOutput[];
  isLoading?: boolean;
  listRef?: React.RefObject<HTMLUListElement | null>;
  narrowed: boolean;
  trackedTotal: number;
  onClearFilters: () => void;
  sentinelRef?: React.RefCallback<HTMLLIElement>;
  isFetchingNextPage?: boolean;
  hasNextPage?: boolean;
};

function trackedJobTags(app: ApplicationOutput): ListItemTag[] {
  const tags: ListItemTag[] = [];
  if (app.listingClosed) {
    tags.push({
      id: "listing-closed",
      label: "Listing closed",
      variant: "secondary",
      size: "xs",
      className: "text-muted-foreground",
      title: "This posting is no longer on the board."
    });
  }
  tags.push({
    id: "match-score",
    node: <ApplicationMatchScoreBadge matchScore={app.matchScore} />
  });
  if (app.experienceYearsMin != null) {
    tags.push({
      id: "years",
      node: <JobYearsBadge years={app.experienceYearsMin} />
    });
  }
  tags.push({
    id: "apply-method",
    node: <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
  });
  tags.push({
    id: "stage",
    node: <ApplicationStageBadge stage={app.stage} />
  });
  if (app.outcome) {
    tags.push({
      id: "outcome",
      node: <ApplicationStatusBadge outcome={app.outcome} />
    });
  }
  return tags;
}

function trackedJobMeta(app: ApplicationOutput): ListItemMeta[] {
  const meta: ListItemMeta[] = [{ id: "company", icon: Building2Icon, text: app.companyName }];
  if (app.location) {
    meta.push({ id: "location", icon: MapPinIcon, text: app.location });
  }
  return meta;
}

export function ApplicationsList({
  applications,
  isLoading,
  listRef,
  narrowed,
  trackedTotal,
  onClearFilters,
  sentinelRef,
  isFetchingNextPage,
  hasNextPage
}: ApplicationsListProps) {
  const {
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    openView,
    openCreate,
    openImportJdSheet,
    viewItem,
    closeView
  } = useApplicationStore();
  const deleteMutation = useDeleteApplicationsMutation();
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const selectedCount = selectedIds.length;
  const filteredIds = applications.map((a) => a.id);
  const allFilteredSelected = areAllVisibleSelected(selectedIds, filteredIds);

  const deleteSelected = () => {
    if (selectedCount === 0) return;
    const ids = [...selectedIds];
    void deleteMutation.mutateAsync({ ids }).then(() => {
      clearSelection();
      if (viewItem && ids.includes(viewItem.id)) closeView();
    });
  };

  if (isLoading) return <ListSkeleton />;

  if (applications.length === 0) {
    if (narrowed) {
      return (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title="No jobs match"
          description="Try a different search or clear filters to see open tracked jobs."
          action={
            <Button type="button" variant="outline" onClick={onClearFilters}>
              Clear filters
            </Button>
          }
        />
      );
    }
    if (trackedTotal > 0) {
      return (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title="No open applications"
          description="Everything is closed, or you have not added any open roles yet."
          action={
            <Button type="button" onClick={openCreate}>
              <PlusIcon aria-hidden />
              Add application
            </Button>
          }
        />
      );
    }
    return (
      <ItemsEmpty
        icon={<BriefcaseIcon aria-hidden />}
        title="No tracked jobs yet"
        description="Track a discovery from New jobs, add a role manually, or import a job description."
        action={
          <Group>
            <Button type="button" onClick={openCreate}>
              <PlusIcon aria-hidden />
              New
            </Button>
            <GroupSeparator />
            <Button type="button" variant="outline" onClick={openImportJdSheet}>
              <FileTextIcon aria-hidden />
              Import
            </Button>
          </Group>
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <BatchSelectionBar
        selectedCount={selectedCount}
        totalCount={filteredIds.length}
        allVisibleSelected={allFilteredSelected}
        isDeleting={deleteMutation.isPending}
        onDeleteSelected={deleteSelected}
        onSelectAll={() => selectAll(filteredIds)}
        onClearSelection={clearSelection}
      />

      <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-x-clip overflow-y-auto py-1">
        {applications.map((app) => {
          const selected = viewItem?.id === app.id;
          const batchSelected = selectedIds.includes(app.id);
          return (
            <li key={app.id}>
              <ContextMenu>
                <ContextMenuTrigger className="block w-full outline-none">
                  <ListItemContent
                    title={app.title}
                    selected={selected}
                    onSelect={() => openView(app)}
                    isBatchSelected={batchSelected}
                    batchSelectActive={batchSelectActive}
                    onToggleSelect={() => toggleSelect(app.id)}
                    tags={trackedJobTags(app)}
                    meta={trackedJobMeta(app)}
                    leading={
                      <JobIdentityMark
                        companyName={app.companyName}
                        logoUrl={app.companyLogoUrl}
                        size={40}
                        selected={selected}
                        className="size-10"
                      />
                    }
                    actions={
                      <ApplicationActionGroup app={app} variant="list" className="hidden md:flex" />
                    }
                    mobileActions={
                      <ApplicationActionGroup app={app} variant="list" className="w-full" />
                    }
                  />
                </ContextMenuTrigger>
                <ContextMenuPopup className="min-w-44">
                  <ApplicationItemActions
                    app={app}
                    slots={applicationContextSlots}
                    hidePrimaryKind={getApplicationPrimaryAction(app)?.kind ?? null}
                  />
                </ContextMenuPopup>
              </ContextMenu>
            </li>
          );
        })}
        {sentinelRef ? (
          <li ref={sentinelRef} className="list-none" aria-hidden={!hasNextPage}>
            <div className="flex w-full items-center justify-center py-2">
              {isFetchingNextPage ? <ChaoticPixelsLoader label="Loading more jobs" /> : null}
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
