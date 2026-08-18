"use client";

import { BriefcaseIcon, Building2Icon, FileTextIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useMemo } from "react";

import { isApplicationOpen, type ApplicationOutput } from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  ContextMenu,
  ContextMenuPopup,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { Tabs, TabsList, TabsTrigger } from "@tsu-stack/ui/components/tabs";
import { TruncatedText } from "@tsu-stack/ui/components/truncated-text";
import { cn } from "@tsu-stack/ui/lib/utils";

import { areAllVisibleSelected, isBatchSelectActive } from "@/shared/lib/batch-selection";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { ListItem } from "@/shared/ui/list-item";

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
            return (
              <li key={app.id}>
                <ContextMenu>
                  <ContextMenuTrigger className="block w-full outline-none">
                    <ListItem
                      selected={selected}
                      onSelect={() => openView(app)}
                      isBatchSelected={batchSelected}
                      batchSelectActive={batchSelectActive}
                      batchCheckboxVisibility="active-only"
                      onToggleSelect={() => toggleSelect(app.id)}
                      className={cn(selected && "border-primary/40")}
                      actions={
                        <ApplicationActionGroup
                          app={app}
                          variant="list"
                          className="hidden md:flex"
                        />
                      }
                    >
                      {/* Tags → avatar + title/meta; mobile ends with Magic|▾ Group. */}
                      <div className="flex min-w-0 flex-col gap-1.5">
                        <div className="no-scrollbar flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto overscroll-x-contain">
                          {app.listingClosed ? (
                            <Badge
                              variant="secondary"
                              size="xs"
                              className="shrink-0 font-normal tracking-normal text-muted-foreground normal-case"
                              title="This posting is no longer on the board."
                            >
                              Listing closed
                            </Badge>
                          ) : null}
                          <ApplicationMatchScoreBadge matchScore={app.matchScore} />
                          <ApplicationApplyMethodBadge applyMethod={app.applyMethod} />
                          <ApplicationStageBadge stage={app.stage} />
                          {app.outcome ? <ApplicationStatusBadge outcome={app.outcome} /> : null}
                        </div>
                        <div className="flex min-w-0 items-start gap-2.5">
                          <AgentAvatar
                            seed={app.companyName}
                            size={32}
                            animated={selected}
                            className="mt-0.5 size-8 shrink-0 outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                            aria-label={app.companyName}
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="min-w-0 truncate text-sm font-medium">{app.title}</h3>
                            <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
                              <span className="inline-flex max-w-full min-w-0 items-center gap-1.5">
                                <Building2Icon
                                  className="size-3.5 shrink-0 text-muted-foreground"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                                <TruncatedText>{app.companyName}</TruncatedText>
                              </span>
                              {app.location ? (
                                <span className="inline-flex max-w-[min(100%,16rem)] min-w-0 items-center gap-1">
                                  <MapPinIcon
                                    className="size-3.5 shrink-0 text-muted-foreground"
                                    strokeWidth={1.75}
                                    aria-hidden
                                  />
                                  <TruncatedText>{app.location}</TruncatedText>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div
                          role="presentation"
                          className="mt-0.5 md:hidden"
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <ApplicationActionGroup app={app} variant="list" className="w-full" />
                        </div>
                      </div>
                    </ListItem>
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
        </ul>
      )}
    </Tabs>
  );
}
