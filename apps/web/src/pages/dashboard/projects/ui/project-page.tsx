"use client";

import { type InfiniteData, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { FolderKanbanIcon, SparklesIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectListPageOutput, type ProjectOutput } from "@tsu-stack/core";
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
import { MenuItem } from "@tsu-stack/ui/components/menu";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useInfiniteScroll } from "@/shared/hooks/use-infinite-scroll";
import {
  areAllVisibleSelected,
  isBatchSelectActive,
  isIdSelected,
  selectedIdsFromState
} from "@/shared/lib/batch-selection";
import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { BatchSelectionBar } from "@/shared/ui/batch-selection-bar";
import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { ListItem } from "@/shared/ui/list-item";
import { SortableList } from "@/shared/ui/sortable-list";

import { useEntityPanelHostActive } from "@/features/agent-hub";
import { getPortfolioListQueryKey } from "@/features/portfolio";
import { getDetectJobState, startDetectStacksJob } from "@/features/stacks";

import {
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  ProjectInfoPanel,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";

import { ItemsInspectHost } from "@/pages/dashboard/_lib/items-inspect-host";
import { useProjectStore } from "@/pages/dashboard/projects/_lib/project.slice";
import {
  PROJECTS_LIST_STALE_TIME_MS,
  flattenProjectsPages,
  getListProjectsPageInfiniteQueryKey,
  useListProjectsPageInfiniteQuery
} from "@/pages/dashboard/projects/api/list-projects-page.query";
import { DetectStacksReposDialog } from "@/pages/dashboard/projects/ui/detect-stacks-repos-dialog";
import { ProjectForm } from "@/pages/dashboard/projects/ui/project-form";

const projectsRouteApi = getRouteApi("/(root-layout)/__protected/dashboard/projects/");

export function ProjectsPage() {
  const projectsQuery = useListProjectsPageInfiniteQuery();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { projectId: deepLinkProjectId } = projectsRouteApi.useSearch();

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
  } = useProjectStore();

  const projects = useMemo(() => flattenProjectsPages(projectsQuery.data), [projectsQuery.data]);
  const totalCount = projectsQuery.data?.pages[0]?.totalCount;

  // Open inspect when arriving with ?projectId= from the public profile.
  useEffect(() => {
    if (!deepLinkProjectId) return;

    const fromList = projects.find((project) => project.id === deepLinkProjectId);
    if (fromList) {
      setOpenedItem(fromList);
      setIsItemOpen({ [fromList.id]: true });
      void navigate({ to: "/dashboard/projects", search: {}, replace: true });
      return;
    }

    if (projectsQuery.isLoading) return;

    let cancelled = false;
    void queryClient
      .fetchQuery(orpcQueryClient.projects.get.queryOptions({ input: { id: deepLinkProjectId } }))
      .then((project) => {
        if (cancelled) return;
        if (project) {
          setOpenedItem(project);
          setIsItemOpen({ [project.id]: true });
        }
        void navigate({ to: "/dashboard/projects", search: {}, replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [
    deepLinkProjectId,
    projects,
    projectsQuery.isLoading,
    queryClient,
    setOpenedItem,
    setIsItemOpen,
    navigate
  ]);

  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<ProjectOutput[] | null>(null);
  const [isLoadingFullListForSort, setIsLoadingFullListForSort] = useState(false);

  const { sentinelRef } = useInfiniteScroll({
    hasNextPage: projectsQuery.hasNextPage,
    isFetchingNextPage: projectsQuery.isFetchingNextPage,
    fetchNextPage: () => {
      void projectsQuery.fetchNextPage();
    },
    enabled: !isSort,
    rootMargin: "200px"
  });

  const deleteMutation = useMutation(
    orpcQueryClient.projects.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateProjectsListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success("Project deleted.");
      },
      onError: () => {
        toast.error("Failed to delete project.");
      }
    })
  );

  const togglePortfolioMutation = useMutation(
    orpcQueryClient.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateProjectsListQueries(queryClient);
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

  const listPageKey = getListProjectsPageInfiniteQueryKey();

  const reorderMutation = useMutation(
    orpcQueryClient.projects.reorder.mutationOptions({
      onMutate: async (input) => {
        await queryClient.cancelQueries({ queryKey: listPageKey });
        const previous =
          queryClient.getQueryData<InfiniteData<ProjectListPageOutput, string | null>>(listPageKey);
        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));
        queryClient.setQueryData<InfiniteData<ProjectListPageOutput, string | null>>(
          listPageKey,
          (old) => {
            if (!old) return old;
            return {
              ...old,
              pages: old.pages.map((page) => {
                return {
                  ...page,
                  items: page.items
                    .map((proj) => {
                      const sortOrder = nextSort.get(proj.id);
                      return sortOrder === undefined ? proj : { ...proj, sortOrder };
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
        void invalidateProjectsListQueries(queryClient);
        void queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
      }
    })
  );

  const [togglingId, setTogglingId] = useState<string | null>(null);

  function handleReorder(newOrder: ProjectOutput[]) {
    setPendingOrder(newOrder);
  }

  function handleSaveSort() {
    const data = pendingOrder ?? projects;
    reorderMutation.mutate({
      items: data.map((proj, index) => {
        return { id: proj.id, sortOrder: index };
      })
    });
  }

  async function handleStartSort() {
    // Reorder needs the full catalog so indices stay correct vs unloaded pages.
    setIsLoadingFullListForSort(true);
    try {
      const full = await queryClient.ensureQueryData({
        ...orpcQueryClient.projects.list.queryOptions(),
        staleTime: PROJECTS_LIST_STALE_TIME_MS
      });
      setPendingOrder(full);
      setIsSort(true);
    } catch {
      toast.error("Failed to load projects for sorting.");
    }
    setIsLoadingFullListForSort(false);
  }

  function handleRestoreDefault() {
    const sorted = [...(pendingOrder ?? projects)].toSorted((a, b) => {
      if (!a.year && !b.year) return 0;
      if (!a.year) return 1;
      if (!b.year) return -1;
      return (b.year ?? 0) - (a.year ?? 0);
    });
    setPendingOrder(sorted);
  }

  function handleCancelSort() {
    setPendingOrder(null);
    setIsSort(false);
  }

  function handleTogglePortfolio(projectId: string, included: boolean) {
    setTogglingId(projectId);
    togglePortfolioMutation.mutate(
      { type: "project", entityId: projectId, included },
      { onSettled: () => setTogglingId(null) }
    );
  }

  async function handleBatchDelete() {
    setBatchAction("delete");
    const ids = selectedIdList;
    const results = await Promise.allSettled(ids.map((id) => orpcClient.projects.delete({ id })));

    await invalidateProjectsListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);
    setBatchDeleteDialogOpen(false);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Deleted ${succeeded} project(s).`);
      clearSelection();
    } else {
      toast.error(`Deleted ${succeeded}, ${failed} failed.`);
    }
  }

  async function handleBatchAddToPortfolio() {
    setBatchAction("portfolio");
    const items = projects.filter((proj) => selectedIds?.[proj.id] && !proj.portfolioEntryId);

    if (items.length === 0) {
      toast("All selected items are already in portfolio.");
      setBatchAction(null);
      return;
    }

    const results = await Promise.allSettled(
      items.map((proj) =>
        orpcClient.portfolio.toggle({ type: "project", entityId: proj.id, included: true })
      )
    );

    await invalidateProjectsListQueries(queryClient);
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryKey() });

    setBatchAction(null);

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    if (failed === 0) {
      toast.success(`Added ${succeeded} project(s) to portfolio.`);
      clearSelection();
    } else {
      toast.error(`Added ${succeeded} to portfolio, ${failed} failed.`);
    }
  }

  const containerRef = useRef<HTMLUListElement | null>(null);

  const { handleNext, handlePrev } = useItemsNavigation<ProjectOutput>({
    items: projects,
    openedItem,
    isItemOpen,
    setOpenedItem,
    setIsItemOpen,
    containerRef
  });

  const isAnyOpen = isAnyOpened(isItemOpen);

  const [batchAction, setBatchAction] = useState<"delete" | "portfolio" | null>(null);

  const selectedIdList = selectedIdsFromState(selectedIds);
  const selectedCount = selectedIdList.length;
  const projectIds = projects.map((p) => p.id);
  const allVisibleSelected = areAllVisibleSelected(selectedIds, projectIds);
  const batchSelectActive = isBatchSelectActive(selectedIds);
  const isBatchLoading = batchAction !== null;
  const isDeleting = batchAction === "delete";
  const isAddingToPortfolio = batchAction === "portfolio";

  useEffect(() => {
    if (!projectsQuery.isLoading && projects.length === 0) {
      if (openedItem) {
        setOpenedItem(null);
        setIsItemOpen(null);
      }
      if (selectedIds) clearSelection();
    }
  }, [
    projectsQuery.isLoading,
    projects.length,
    openedItem,
    setOpenedItem,
    setIsItemOpen,
    selectedIds,
    clearSelection
  ]);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  // Host wins the panel (any kind). Dirty page form is discarded without confirm.
  const hostOwnsPanel = useEntityPanelHostActive();
  if (hostOwnsPanel && dialogOpen) setDialogOpen(false);
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);
  const [detectReposProjectId, setDetectReposProjectId] = useState<string | null>(null);
  const [detectReposDialogOpen, setDetectReposDialogOpen] = useState(false);
  /** Bumps on each menu open so the dialog remounts with fresh repo prefill. */
  const [detectReposSession, setDetectReposSession] = useState(0);
  const detectReposProject = detectReposProjectId
    ? (projects.find((p) => p.id === detectReposProjectId) ?? null)
    : null;

  function openDialog(id: string | null) {
    setEditingProjectId(id);
    setDialogOpen(true);
  }

  /**
   * Existing list rows only. If a job is already running → toast;
   * if ready with results → reopen review; otherwise open repos dialog.
   */
  function handleDetectStacksFromMenu(project: ProjectOutput) {
    const job = getDetectJobState();
    if (job.status === "running" || job.status === "ready") {
      startDetectStacksJob({
        projectId: project.id,
        repos: project.repos ?? []
      });
      return;
    }
    setDetectReposProjectId(project.id);
    setDetectReposSession((n) => n + 1);
    setDetectReposDialogOpen(true);
  }

  const emptyState = (
    <ItemsEmpty
      icon={<FolderKanbanIcon aria-hidden />}
      title="No projects yet"
      description="Add your first project to showcase your work."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Project" }} />}
    />
  );

  function renderList() {
    if (projectsQuery.isLoading) return <ListSkeleton />;
    if (projects.length === 0) return emptyState;

    const list = (
      <SortableList
        items={pendingOrder ?? projects}
        onReorder={handleReorder}
        sortable
        disabled={reorderMutation.isPending || !isSort}
        siblingsDimOnHover
        containerClassName="space-y-2"
      >
        {(project, dragHandleProps) => (
          <ListItem
            selected={isItemOpen?.[project.id] ?? false}
            onSelect={() => openItem(project.id, project)}
            dragHandleProps={dragHandleProps}
            isSort={isSort}
            isBatchSelected={isIdSelected(selectedIds, project.id)}
            batchSelectActive={batchSelectActive}
            onToggleSelect={() => toggleSelect(project.id)}
            onMouseEnter={() => {
              void queryClient.ensureQueryData(
                orpcQueryClient.projects.get.queryOptions({ input: { id: project.id } })
              );
            }}
            onEdit={() => openDialog(project.id)}
            onDelete={() => deleteMutation.mutate({ id: project.id })}
            isDeleting={deleteMutation.isPending}
            onTogglePortfolio={() => handleTogglePortfolio(project.id, !project.portfolioEntryId)}
            isTogglingPortfolio={togglingId === project.id}
            inPortfolio={!!project.portfolioEntryId}
            extraMenuItems={
              <MenuItem
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  handleDetectStacksFromMenu(project);
                }}
              >
                <SparklesIcon className="size-4" aria-hidden />
                Detect stacks
              </MenuItem>
            }
            deleteTitle="Delete this project?"
            deleteDescription="This will permanently delete this project and all its associated data."
            title={project.title}
            titleEnd={
              project.stacks.length > 0 ? (
                <>
                  {project.stacks.slice(0, 6).map((stack) => (
                    <Badge key={stack.id} variant="secondary" size="sm">
                      {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                      {stack.name}
                    </Badge>
                  ))}
                  {project.stacks.length > 6 ? (
                    <PreviewCard>
                      <PreviewCardTrigger render={<Badge variant="secondary" size="sm" />}>
                        +{project.stacks.length - 6}
                      </PreviewCardTrigger>
                      <PreviewCardPopup className="flex w-md flex-wrap gap-1 p-1">
                        {project.stacks.slice(6).map((stack) => (
                          <Badge key={stack.id} variant="secondary" size="sm">
                            {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                            {stack.name}
                          </Badge>
                        ))}
                      </PreviewCardPopup>
                    </PreviewCard>
                  ) : null}
                </>
              ) : undefined
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
          aria-hidden={!projectsQuery.hasNextPage}
        >
          {projectsQuery.isFetchingNextPage ? (
            <Spinner className="size-4 text-muted-foreground" />
          ) : null}
        </div>
        {totalCount != null && projects.length > 0 ? (
          <p className="pb-2 text-center text-xs text-muted-foreground">
            Showing {projects.length}
            {totalCount > projects.length ? ` of ${totalCount}` : ""} project
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
          title="Projects"
          description="Drag the handle to reorder. Use ← → to navigate, click to inspect."
          actions={
            <HeaderActions
              add={{ onAdd: () => openDialog(null), label: "Add Project" }}
              sort={{
                isSort,
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
            totalCount={projectIds.length}
            allVisibleSelected={allVisibleSelected}
            selectAllLabel={`Select all loaded (${projectIds.length})`}
            isDeleting={isDeleting}
            isLoading={isBatchLoading}
            isAddingToPortfolio={isAddingToPortfolio}
            onDeleteSelected={() => setBatchDeleteDialogOpen(true)}
            onAddSelectedToPortfolio={handleBatchAddToPortfolio}
            onSelectAll={() => selectAll(projectIds)}
            onClearSelection={clearSelection}
          />
        ) : null}

        {renderList()}

        <ItemsInspectHost
          open={isAnyOpen && !dialogOpen && !hostOwnsPanel}
          item={openedItem}
          title="Project"
          onOpenChange={(next) => {
            if (!next) {
              setOpenedItem(null);
              setIsItemOpen(null);
            }
          }}
        >
          {(item: ProjectOutput | null) =>
            item ? <ProjectInfoPanel project={item} onEdit={() => openDialog(item.id)} /> : null
          }
        </ItemsInspectHost>

        {dialogOpen && !hostOwnsPanel ? (
          <ProjectForm
            key={editingProjectId ?? "new"}
            initialData={
              editingProjectId ? (projects.find((p) => p.id === editingProjectId) ?? null) : null
            }
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          />
        ) : null}

        {detectReposProject ? (
          <DetectStacksReposDialog
            key={`${detectReposProject.id}-${detectReposSession}`}
            project={detectReposProject}
            open={detectReposDialogOpen}
            onOpenChange={setDetectReposDialogOpen}
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
              <AlertDialogTitle>Delete {selectedCount} project(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected projects and all their associated data.
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
