"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlignLeftIcon, BriefcaseIcon, Building2Icon, CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ExperienceListPageOutput, type ExperienceOutput } from "@tsu-stack/core";
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
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import {
  areAllVisibleSelected,
  isBatchSelectActive,
  isIdSelected,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { invalidateExperiencesListQueries } from "@/shared/lib/invalidate-experiences-list";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { HeaderActions } from "@/shared/ui/header-actions";
import { ListItem } from "@/shared/ui/list-item";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

import { useEntityFormHostActive } from "@/features/agent-hub";
import { getPortfolioListQueryKey } from "@/features/portfolio";

import {
  ItemInfoPanel,
  PanelEditButton,
  ItemInfoRow,
  ItemInfoSection,
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";

import { useExperienceStore } from "./_lib/experience.slice";
import {
  EXPERIENCES_LIST_STALE_TIME_MS,
  flattenExperiencesPages,
  getListExperiencesPageInfiniteQueryKey,
  useListExperiencesPageInfiniteQuery
} from "./api/list-experiences-page.query";
import { ExperienceForm } from "./experience-form";

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "MMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "MMM yyyy");
  return `${start} — ${end}`;
}

function formatRangeFull(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "dd MMMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "dd MMMM yyyy");
  return `${start} — ${end}`;
}

function safeFormat(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, pattern);
}

export function ExperiencesPage() {
  const {
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    openItem,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection
  } = useExperienceStore();
  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<ExperienceOutput[] | null>(null);
  const [isLoadingFullListForSort, setIsLoadingFullListForSort] = useState(false);
  const queryClient = useQueryClient();

  const experiencesQuery = useListExperiencesPageInfiniteQuery();
  const visibleExperiences = useMemo(
    () => flattenExperiencesPages(experiencesQuery.data),
    [experiencesQuery.data]
  );
  const totalCount = experiencesQuery.data?.pages[0]?.totalCount;

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: experiencesQuery.hasNextPage,
    isFetchingNextPage: experiencesQuery.isFetchingNextPage,
    fetchNextPage: () => {
      void experiencesQuery.fetchNextPage();
    },
    enabled: !isSort,
    rootMargin: "200px"
  });

  const deleteMutation = useMutation(
    orpcQueryClient.experiences.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateExperiencesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Experience deleted.");
      }
    })
  );

  const togglePortfolioMutation = useMutation(
    orpcQueryClient.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateExperiencesListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success(variables.included ? "Added to portfolio." : "Removed from portfolio.");
      },
      onError: () => {
        toast.error("Failed to update portfolio.");
      }
    })
  );

  const listPageKey = getListExperiencesPageInfiniteQueryKey();

  const reorderMutation = useMutation(
    orpcQueryClient.experiences.reorder.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: listPageKey });
        const previous =
          queryClient.getQueryData<InfiniteData<ExperienceListPageOutput, string | null>>(
            listPageKey
          );
        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));
        queryClient.setQueryData<InfiniteData<ExperienceListPageOutput, string | null>>(
          listPageKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => {
                return {
                  ...page,
                  items: page.items
                    .map((exp) => {
                      const sortOrder = nextSort.get(exp.id);
                      return sortOrder === undefined ? exp : { ...exp, sortOrder };
                    })
                    .toSorted((a, b) => a.sortOrder - b.sortOrder)
                };
              })
            };
          }
        );
        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(listPageKey, context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void invalidateExperiencesListQueries(queryClient);
        void queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
      }
    })
  );

  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleReorder(newOrder: ExperienceOutput[]) {
    setPendingOrder(newOrder);
  }

  function handleSaveSort() {
    const data = pendingOrder ?? visibleExperiences;
    reorderMutation.mutate({
      items: data.map((exp, index) => {
        return { id: exp.id, sortOrder: index };
      })
    });
  }

  async function handleStartSort() {
    // Reorder needs the full catalog so indices stay correct vs unloaded pages.
    setIsLoadingFullListForSort(true);
    try {
      const full = await queryClient.ensureQueryData({
        ...orpcQueryClient.experiences.list.queryOptions(),
        staleTime: EXPERIENCES_LIST_STALE_TIME_MS
      });
      setPendingOrder(full);
      setIsSort(true);
    } catch {
      toast.error("Failed to load experiences for sorting.");
    }
    setIsLoadingFullListForSort(false);
  }

  function handleRestoreDefault() {
    const sorted = [...(pendingOrder ?? visibleExperiences)].toSorted((a, b) => {
      if (!a.fromDate && !b.fromDate) return 0;
      if (!a.fromDate) return 1;
      if (!b.fromDate) return -1;
      return b.fromDate.localeCompare(a.fromDate);
    });
    setPendingOrder(sorted);
  }

  function handleCancelSort() {
    setPendingOrder(null);
    setIsSort(false);
  }

  function handleTogglePortfolio(experienceId: string, included: boolean) {
    setTogglingId(experienceId);
    togglePortfolioMutation.mutate(
      { type: "experience", entityId: experienceId, included },
      { onSettled: () => setTogglingId(null) }
    );
  }

  async function handleBatchDelete() {
    setBatchAction("delete");
    const ids = selectedIdList;
    const results = await Promise.allSettled(
      ids.map((id) => orpcClient.experiences.delete({ id }))
    );

    await invalidateExperiencesListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);
    setBatchDeleteDialogOpen(false);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Deleted ${succeeded} experience(s).`);
      clearSelection();
    } else {
      toast.error(`Deleted ${succeeded}, ${failed} failed.`);
    }
  }

  async function handleBatchAddToPortfolio() {
    setBatchAction("portfolio");
    const items = visibleExperiences.filter(
      (exp) => selectedIds?.[exp.id] && !exp.portfolioEntryId
    );

    if (items.length === 0) {
      toast("All selected items are already in portfolio.");
      setBatchAction(null);
      return;
    }

    const results = await Promise.allSettled(
      items.map((exp) =>
        orpcClient.portfolio.toggle({ type: "experience", entityId: exp.id, included: true })
      )
    );

    await invalidateExperiencesListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Added ${succeeded} experience(s) to portfolio.`);
      clearSelection();
    } else {
      toast.error(`Added ${succeeded} to portfolio, ${failed} failed.`);
    }
  }

  const containerRef = useRef<HTMLUListElement | null>(null);

  const { handleNext, handlePrev } = useItemsNavigation({
    items: visibleExperiences,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    containerRef
  });

  const [batchAction, setBatchAction] = useState<"delete" | "portfolio" | null>(null);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  const selectedIdList = selectedIdsFromState(selectedIds);
  const selectedCount = selectedIdList.length;
  const visibleIds = visibleExperiences.map((e) => e.id);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, visibleIds);
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const isBatchLoading = batchAction !== null;
  const isDeleting = batchAction === "delete";
  const isAddingToPortfolio = batchAction === "portfolio";

  const isAnyOpen = isAnyOpened(isItemOpen);

  useEffect(() => {
    if (!experiencesQuery.isLoading && visibleExperiences.length === 0) {
      if (openedItem) {
        setOpenedItem(null);
        setIsItemOpen(null);
      }
      if (selectedIds) clearSelection();
    }
  }, [
    experiencesQuery.isLoading,
    visibleExperiences.length,
    openedItem,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    clearSelection
  ]);

  const [editingExperienceId, setEditingExperienceId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Host wins the panel (any kind). Dirty page form is discarded without confirm.
  const hostOwnsPanel = useEntityFormHostActive();
  if (hostOwnsPanel && dialogOpen) setDialogOpen(false);

  const openDialog = useCallback((id: string | null) => {
    setEditingExperienceId(id);
    setDialogOpen(true);
  }, []);

  const emptyState = (
    <ItemsEmpty
      icon={<BriefcaseIcon aria-hidden />}
      title="No experiences yet"
      description="Add a new experience to start tracking your work history."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Experience" }} />}
    />
  );

  function renderList() {
    if (experiencesQuery.isLoading) return <ListSkeleton />;
    if (visibleExperiences.length === 0) return emptyState;

    const list = (
      <SortableList
        items={pendingOrder ?? visibleExperiences}
        onReorder={handleReorder}
        sortable
        disabled={reorderMutation.isPending || !isSort}
        siblingsDimOnHover
        containerClassName="space-y-2"
      >
        {(experience, dragHandleProps) => (
          <ListItem
            selected={isItemOpen?.[experience.id] ?? false}
            onSelect={() => openItem(experience.id, experience)}
            dragHandleProps={dragHandleProps}
            isSort={isSort}
            isBatchSelected={isIdSelected(selectedIds, experience.id)}
            batchSelectActive={batchSelectActive}
            onToggleSelect={() => toggleSelect(experience.id)}
            onMouseEnter={() => {
              void queryClient.prefetchQuery(
                orpcQueryClient.experiences.get.queryOptions({
                  input: { id: experience.id }
                })
              );
            }}
            onEdit={() => openDialog(experience.id)}
            onDelete={() => deleteMutation.mutate({ id: experience.id })}
            isDeleting={deleteMutation.isPending}
            onTogglePortfolio={() =>
              handleTogglePortfolio(experience.id, !experience.portfolioEntryId)
            }
            isTogglingPortfolio={togglingId === experience.id}
            inPortfolio={!!experience.portfolioEntryId}
            deleteTitle="Delete this experience?"
            deleteDescription="This will permanently delete this experience and all its associated projects."
            title={experience.title}
            meta={
              <>
                <p className="flex items-center gap-1">
                  <Building2Icon size={14} />
                  <span>{experience.organization}</span>
                </p>
                <p className="flex items-center gap-1">
                  <CalendarIcon size={14} />
                  <span>{formatRange(experience.fromDate, experience.toDate)}</span>
                </p>
              </>
            }
          />
        )}
      </SortableList>
    );

    if (isSort) return list;

    return (
      <>
        {list}
        <div
          ref={sentinelRef}
          className="flex h-10 w-full items-center justify-center"
          aria-hidden={!experiencesQuery.hasNextPage}
        >
          {experiencesQuery.isFetchingNextPage ? (
            <Spinner className="size-4 text-muted-foreground" />
          ) : null}
        </div>
        {totalCount != null && visibleExperiences.length > 0 ? (
          <p className="pb-2 text-center text-xs text-muted-foreground">
            Showing {visibleExperiences.length}
            {totalCount > visibleExperiences.length ? ` of ${totalCount}` : ""} experience
            {totalCount === 1 ? "" : "s"}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <ItemsNavProvider value={{ handleNext, handlePrev }}>
      <PageLayout>
        <PageHeader
          title="Experiences"
          description="Drag the handle to reorder. Use ← → to navigate, click to inspect."
          actions={
            <HeaderActions
              add={{ onAdd: () => openDialog(null), label: "Add Experience" }}
              sort={{
                isSort: isSort,
                isSortPending: reorderMutation.isPending || isLoadingFullListForSort,
                onSortStart: () => {
                  void handleStartSort();
                },
                onSortSave: handleSaveSort,
                onSortRestore: handleRestoreDefault,
                onSortCancel: handleCancelSort
              }}
            />
          }
        />

        {!isSort ? (
          <BatchSelectionBar
            selectedCount={selectedCount}
            totalCount={visibleIds.length}
            allVisibleSelected={allVisibleSelected}
            selectAllLabel={`Select all loaded (${visibleIds.length})`}
            isDeleting={isDeleting}
            isLoading={isBatchLoading}
            isAddingToPortfolio={isAddingToPortfolio}
            onDeleteSelected={() => setBatchDeleteDialogOpen(true)}
            onAddSelectedToPortfolio={handleBatchAddToPortfolio}
            onSelectAll={() => selectAll(visibleIds)}
            onClearSelection={clearSelection}
          />
        ) : null}

        {renderList()}

        <ItemsInspectHost
          open={isAnyOpen && !dialogOpen && !hostOwnsPanel}
          item={openedItem}
          title="Experience"
          onOpenChange={(next) => {
            if (!next) {
              setOpenedItem(null);
              setIsItemOpen(null);
            }
          }}
        >
          {(item) => {
            if (!item) return null;
            return (
              <ItemInfoPanel
                eyebrow={<BriefcaseIcon strokeWidth={1.75} />}
                title={item.title}
                description={
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{item.organization}</span>
                    <span aria-hidden className="text-border">
                      ·
                    </span>
                    <span>{formatRangeFull(item.fromDate, item.toDate)}</span>
                  </p>
                }
                actions={<PanelEditButton onClick={() => openDialog(item.id)} />}
                updatedAt={item.updatedAt}
                createdAt={item.createdAt}
              >
                <div className="space-y-8">
                  <ItemInfoSection title="Summary" icon={<AlignLeftIcon />}>
                    {item.description ? (
                      <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                        {item.description}
                      </Markdown>
                    ) : (
                      <p>No description.</p>
                    )}
                  </ItemInfoSection>
                  {item.projects.length > 0 ? (
                    <ItemInfoSection title="Projects" icon={<Building2Icon />}>
                      <ul className="space-y-2.5">
                        {item.projects.map((project) => (
                          <ItemInfoRow key={project.id}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-medium text-foreground">{project.title}</span>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {project.year}
                              </span>
                            </div>
                          </ItemInfoRow>
                        ))}
                      </ul>
                    </ItemInfoSection>
                  ) : null}
                </div>
              </ItemInfoPanel>
            );
          }}
        </ItemsInspectHost>

        {dialogOpen && !hostOwnsPanel ? (
          <ExperienceForm
            key={editingExperienceId ?? "new"}
            initialData={
              editingExperienceId
                ? (visibleExperiences.find((exp) => exp.id === editingExperienceId) ?? null)
                : null
            }
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        ) : null}

        <AlertDialog
          open={batchDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && isDeleting) return;
            setBatchDeleteDialogOpen(open);
          }}
        >
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} experience(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected experiences and all their associated
                projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                loading={isDeleting}
                onClick={() => {
                  void handleBatchDelete();
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
