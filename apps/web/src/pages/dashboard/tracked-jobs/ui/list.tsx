"use client";

import { Building2Icon, BriefcaseIcon, FileTextIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { isApplicationOpen, type ApplicationOutput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Tabs, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";

import { areAllVisibleSelected, isBatchSelectActive } from "@/shared/lib/batch-selection";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { ListItem } from "@/shared/ui/list-item";

import {
  ApplicationApplyLinks,
  ApplicationApplyMethodBadge,
  ApplicationMatchScoreBadge,
  ApplicationStageBadge,
  ApplicationStatusBadge,
  useDeleteApplicationsMutation
} from "@/features/applications";

import { ItemsEmpty, ListSkeleton } from "@/widgets/items-page";

import { useApplicationStore } from "@/pages/dashboard/tracked-jobs/_lib/application.slice";
import {
  applicationContextSlots,
  applicationListMenuSlots
} from "@/pages/dashboard/tracked-jobs/ui/application-action-slots";
import { ApplicationItemActions } from "@/pages/dashboard/tracked-jobs/ui/application-item-actions";

const LIST_FILTERS = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" }
] as const;

type ApplicationsListProps = {
  applications: ApplicationOutput[];
  isLoading?: boolean;
  listRef?: React.RefObject<HTMLUListElement | null>;
};

export function ApplicationsList({ applications, isLoading, listRef }: ApplicationsListProps) {
  const {
    listFilter,
    setListFilter,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    openView,
    openEdit,
    openCreate,
    openImportJdSheet,
    viewItem,
    closeView
  } = useApplicationStore();
  const deleteMutation = useDeleteApplicationsMutation();
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const selectedCount = selectedIds.length;

  const filtered = useMemo(() => {
    if (listFilter === "open") return applications.filter((a) => isApplicationOpen(a.outcome));
    if (listFilter === "closed") return applications.filter((a) => !isApplicationOpen(a.outcome));
    return applications;
  }, [applications, listFilter]);

  const filteredIds = useMemo(() => filtered.map((a) => a.id), [filtered]);
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
    return (
      <ItemsEmpty
        icon={<BriefcaseIcon aria-hidden />}
        title="No tracked jobs yet"
        description="Track a discovery from New jobs, add a role manually, or import a job description."
        action={
          <Group>
            <Button type="button" variant="outline" onClick={openImportJdSheet}>
              <FileTextIcon aria-hidden />
              Import from JD
            </Button>
            <GroupSeparator />
            <Button type="button" onClick={openCreate}>
              <PlusIcon aria-hidden />
              Add job
            </Button>
          </Group>
        }
      />
    );
  }

  return (
    <Tabs
      value={listFilter}
      onValueChange={(value) => {
        if (value === "open" || value === "closed" || value === "all") {
          setListFilter(value);
          clearSelection();
        }
      }}
      className="flex min-h-0 flex-1 flex-col gap-3"
    >
      <TabsList className="w-fit shrink-0">
        {LIST_FILTERS.map((filter) => (
          <TabsTrigger key={filter.value} value={filter.value}>
            {filter.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <BatchSelectionBar
        selectedCount={selectedCount}
        totalCount={filteredIds.length}
        allVisibleSelected={allFilteredSelected}
        isDeleting={deleteMutation.isPending}
        onDeleteSelected={deleteSelected}
        onSelectAll={() => selectAll(filteredIds)}
        onClearSelection={clearSelection}
      />

      {filtered.length === 0 ? (
        <ItemsEmpty
          icon={<BriefcaseIcon aria-hidden />}
          title={
            listFilter === "open"
              ? "No open applications"
              : listFilter === "closed"
                ? "No closed applications"
                : "No applications"
          }
          description={
            listFilter === "open"
              ? "Everything is closed, or you have not added any open roles yet."
              : listFilter === "closed"
                ? "Close an application from the board or list when a role wraps up."
                : "Add a job to start tracking your pipeline."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              {listFilter !== "all" ? (
                <Button type="button" variant="outline" onClick={() => setListFilter("all")}>
                  Show all
                </Button>
              ) : null}
              <Button type="button" onClick={openCreate}>
                <PlusIcon aria-hidden />
                Add application
              </Button>
            </div>
          }
        />
      ) : (
        // flex-1 + min-h-0: fill remaining viewport; overflow only when content exceeds it.
        // overflow-x-clip + light py: ListItem hover/selected scale should not spawn a scroller.
        <ul ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-x-clip overflow-y-auto py-1">
          {filtered.map((app) => {
            const selected = viewItem?.id === app.id;
            const batchSelected = selectedIds.includes(app.id);
            const listingUrl = app.url ?? app.applyUrl ?? null;
            const openListing = listingUrl
              ? () => {
                  window.open(listingUrl, "_blank", "noopener,noreferrer");
                }
              : undefined;
            return (
              <li key={app.id}>
                <ContextMenu>
                  <ContextMenuTrigger className="block w-full outline-none">
                    <ListItem
                      selected={selected}
                      onSelect={() => openView(app)}
                      isBatchSelected={batchSelected}
                      batchSelectActive={batchSelectActive}
                      onToggleSelect={() => toggleSelect(app.id)}
                      onView={openListing}
                      viewLabel="View listing"
                      onEdit={() => openEdit(app)}
                      // Full board parity lives in the ⋮ menu (and right-click).
                      // Delete is in ApplicationItemActions with confirm dialog.
                      extraMenuItems={
                        <ApplicationItemActions
                          app={app}
                          slots={applicationListMenuSlots}
                          density="list-overflow"
                        />
                      }
                      title={app.title}
                      titleEnd={
                        <>
                          <ApplicationMatchScoreBadge matchScore={app.matchScore} />
                          <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
                          <ApplicationStageBadge stage={app.stage} />
                          {app.outcome ? <ApplicationStatusBadge outcome={app.outcome} /> : null}
                        </>
                      }
                      meta={
                        <>
                          <p className="flex items-center gap-1">
                            <Building2Icon size={14} />
                            <span>{app.companyName}</span>
                          </p>
                          {app.location ? (
                            <p className="flex items-center gap-1">
                              <MapPinIcon size={14} />
                              <span>{app.location}</span>
                            </p>
                          ) : null}
                          <ApplicationApplyLinks
                            applyUrl={app.applyUrl}
                            url={app.url}
                            applyMethod={app.applyMethod}
                            hideListingLink={Boolean(listingUrl)}
                            className="mt-1"
                          />
                        </>
                      }
                    />
                  </ContextMenuTrigger>
                  <ContextMenuPopup className="min-w-44">
                    <ApplicationItemActions app={app} slots={applicationContextSlots} />
                  </ContextMenuPopup>
                </ContextMenu>
              </li>
            );
          })}
        </ul>
      )}
    </Tabs>
  );
}
