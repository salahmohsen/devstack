"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput, stripTrailingSlashes } from "@tsu-stack/core";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
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
import { FrameDescription, FrameTitle } from "@tsu-stack/ui/components/frame";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";

import { HeaderActions } from "@/shared/ui/header-actions";
import { Icon } from "@/shared/ui/icon";
import { ListItem } from "@/shared/ui/list-item";
import { Markdown } from "@/shared/ui/markdown";
import { SortableList } from "@/shared/ui/sortable-list";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

import {
  ItemInfoPanel,
  ItemsEmpty,
  ItemsNavProvider,
  ListSkeleton,
  PageHeader,
  PageLayout,
  isAnyOpened,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useProjectStore } from "@/pages/dashboard/projects/_lib/project.slice";
import { ProjectForm } from "@/pages/dashboard/projects/ui/project-form";

export function ProjectsPage() {
  const projectsQuery = useQuery(orpcQueryClient.projects.list.queryOptions());
  const queryClient = useQueryClient();

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

  const projects = useMemo<ProjectOutput[]>(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<ProjectOutput[] | null>(null);

  const deleteMutation = useMutation(
    orpcQueryClient.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
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
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
        });
        toast.success(variables.included ? "Added to portfolio." : "Removed from portfolio.");
      },
      onError: () => {
        toast.error("Failed to update portfolio.");
      }
    })
  );

  const reorderMutation = useMutation(
    orpcQueryClient.projects.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.projects.list.queryKey();
        await queryClient.cancelQueries({ queryKey: listKey });

        const previous = queryClient.getQueryData(listKey);

        const nextSort = new Map(input.items.map((it) => [it.id, it.sortOrder]));

        queryClient.setQueryData(listKey, (old) => {
          if (!old) return old;
          const reordered = old
            .map((proj) => {
              const sortOrder = nextSort.get(proj.id);
              return sortOrder === undefined ? proj : { ...proj, sortOrder };
            })
            .toSorted((a, b) => a.sortOrder - b.sortOrder);
          return reordered;
        });

        return { previous };
      },
      onError: (_error, _input, context) => {
        if (context?.previous !== undefined) {
          queryClient.setQueryData(orpcQueryClient.projects.list.queryKey(), context.previous);
        }
        toast.error("Failed to update order.");
      },
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        void queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
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

  function handleStartSort() {
    setPendingOrder(projects);
    setIsSort(true);
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
    setBatchDeleteDialogOpen(false);
    const ids = selectedIdsEntries.map(([id]) => id);
    const results = await Promise.allSettled(ids.map((id) => orpcClient.projects.delete({ id })));

    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.projects.list.queryKey() });
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

    setBatchAction(null);

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

    await queryClient.invalidateQueries({ queryKey: orpcQueryClient.projects.list.queryKey() });
    await queryClient.invalidateQueries({ queryKey: getPortfolioListQueryOptions().queryKey });

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

  const selectedIdsEntries = Object.entries(selectedIds ?? {}).filter(([, v]) => v);
  const selectedCount = selectedIdsEntries.length;
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
  const [batchDeleteDialogOpen, setBatchDeleteDialogOpen] = useState(false);

  function openDialog(id: string | null) {
    setEditingProjectId(id);
    setDialogOpen(true);
  }

  const emptyState = (
    <ItemsEmpty
      title="No projects yet"
      description="Add your first project to showcase your work."
      action={<HeaderActions add={{ onAdd: () => openDialog(null), label: "Add Project" }} />}
    />
  );

  function renderList() {
    if (projectsQuery.isLoading) return <ListSkeleton />;
    if (projects.length === 0) return emptyState;

    return (
      <SortableList
        items={pendingOrder ?? projects}
        onReorder={handleReorder}
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
            isBatchSelected={selectedIds?.[project.id] ?? false}
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
            deleteTitle="Delete this project?"
            deleteDescription="This will permanently delete this project and all its associated data."
            title={project.title}
            meta={
              project.stacks.length > 0 ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {project.stacks.slice(0, 3).map((stack) => (
                    <Badge key={stack.id} variant="secondary" size="lg">
                      {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                      {stack.name}
                    </Badge>
                  ))}
                  {project.stacks.length > 3 && (
                    <PreviewCard>
                      <PreviewCardTrigger render={<Badge variant="secondary" size="lg" />}>
                        +{project.stacks.length - 3}
                      </PreviewCardTrigger>
                      <PreviewCardPopup className="flex w-md flex-wrap gap-1 p-1">
                        {project.stacks.slice(3).map((stack) => (
                          <Badge key={stack.id} variant="secondary" size="lg">
                            {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                            {stack.name}
                          </Badge>
                        ))}
                      </PreviewCardPopup>
                    </PreviewCard>
                  )}
                </div>
              ) : null
            }
          />
        )}
      </SortableList>
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
                isSortPending: reorderMutation.isPending,
                onSortStart: handleStartSort,
                onSortSave: handleSaveSort,
                onSortRestore: handleRestoreDefault,
                onSortCancel: handleCancelSort
              }}
              batch={{
                selectedCount,
                totalCount: projects.length,
                isBatchLoading,
                isDeleting,
                isAddingToPortfolio,
                onDeleteSelected: () => setBatchDeleteDialogOpen(true),
                onAddSelectedToPortfolio: handleBatchAddToPortfolio,
                onSelectAll: () => selectAll(projects.map((p) => p.id)),
                onClearSelection: clearSelection
              }}
            />
          }
        />

        {renderList()}

        <ItemsInfoPanel open={isAnyOpen} item={openedItem}>
          {(item: ProjectOutput | null) => {
            if (!item) return null;
            const projectLink = `${stripTrailingSlashes(ENV_WEB_ISOMORPHIC.VITE_WEB_URL)}/${item.title}`;
            return (
              <ItemInfoPanel
                title={
                  <div className="flex items-center justify-between gap-2">
                    <FrameTitle className="text-lg">{item.title}</FrameTitle>
                    <a
                      href={projectLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ExternalLink className="size-4" strokeWidth={2.25} />
                    </a>
                  </div>
                }
                description={
                  <>
                    <FrameDescription>
                      {item.isPresent ? `${item.year} — Present` : item.year}
                    </FrameDescription>
                    {item.experienceId ? (
                      <FrameDescription className="text-xs">
                        Linked to an experience
                      </FrameDescription>
                    ) : null}
                  </>
                }
              >
                <div className="space-y-4">
                  {item.summary ? (
                    <div className="rounded-md border border-border/60 bg-muted/30 p-3">
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        Summary
                      </p>
                      <Markdown>{item.summary}</Markdown>
                    </div>
                  ) : null}
                  {item.description ? (
                    <Markdown>{item.description}</Markdown>
                  ) : (
                    <p className="text-sm text-muted-foreground">No description.</p>
                  )}
                  {item.repos.length > 0 || item.demoUrl ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.repos.map((repo) => (
                        <Badge
                          key={repo}
                          variant="secondary"
                          size="lg"
                          render={
                            <Link
                              to={`/repos/${repo.split("/").at(-1)}` as NavigateOptions["to"]}
                              aria-label={`Open repository ${repo}`}
                            >
                              <svg
                                className="mr-1 size-3"
                                viewBox="0 0 496 512"
                                fill="currentColor"
                              >
                                <path d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3 .3-5.3-1.3-5.3-3.6 0-2 2.3-3.6 5.2-3.6 3 0 5.3 1.6 5.3 3.6zm-30.8-1.5c-2.7 1.4-5.3-.2-5.3-2.6 0-2 2.3-3.6 5.2-3.6 3 .3 5.3 1.3 5.3 3.6 0 2-2.3 3.6-5.2 3.6zM256 32C132.3 32 32 132.3 32 256c0 101.6 65.3 187.7 156.4 217.7 11.5 2.1 15.8-5 15.8-11.1 0-5.5-.2-19.9-.3-39.1-63.6 13.8-77-15.5-77-15.5-10.4-26.4-25.5-33.4-25.5-33.4-20.8-14.3 1.6-14 1.6-14 23 1.6 35.1 23.7 35.1 23.7 20.4 35 53.5 24.9 66.5 19 2.1-14.7 8-24.9 14.5-30.6-50.8-5.8-104.2-25.4-104.2-113 0-24.9 8.9-45.3 23.5-61.3-2.4-5.8-10.1-29 2.2-60.5 0 0 19.2-6.2 63 23.4 18.3-5.1 37.9-7.7 57.4-7.8 19.5.1 39.2 2.6 57.4 7.8 43.8-30 63-23.4 63-23.4 12.3 31.5 4.6 54.7 2.2 60.5 14.6 16 23.5 36.4 23.5 61.3 0 87.9-53.5 107.2-104.4 113 8.2 7.1 15.6 21 15.6 42.4 0 30.6-.3 55.3-.3 62.8 0 6.1 4.2 13.3 15.8 11.1C430.7 443.7 496 357.6 496 256 496 132.3 395.7 32 272 32z" />
                              </svg>
                              {repo.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                            </Link>
                          }
                        />
                      ))}
                      {item.demoUrl ? (
                        <Badge
                          variant="secondary"
                          size="lg"
                          render={
                            <a
                              href={item.demoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Open demo for ${item.title}`}
                            >
                              <svg
                                className="mr-1 size-3"
                                viewBox="0 0 512 512"
                                fill="currentColor"
                              >
                                <path d="M410.3 231.1l19.7-19.7 42.4-42.4c7.8-7.8 7.8-20.5 0-28.3L433.9 161.2c-7.8-7.8-20.5-7.8-28.3 0l-22.6 22.6-28.3-28.3 22.6-22.6c19.6-19.6 51.2-19.6 70.8 0l42.4 42.4c19.6 19.6 19.6 51.2 0 70.8zm-69.1-69.1l-22.6 22.6-50.5-50.5 22.6-22.6c7.8-7.8 20.5-7.8 28.3 0l42.4 42.4c7.8 7.8 7.8 20.5 0 28.3zM338.1 285.9l-50.5-50.5L309.6 213.4l50.5 50.5zM271.8 229.1l-122.6-122.6c-19.6-19.6-51.2-19.6-70.8 0l-14.1 14.1c-7.8 7.8-7.8 20.5 0 28.3l42.4 42.4c7.8 7.8 20.5 7.8 28.3 0l14.1-14.1 9.9 9.9-14.1 14.1c-19.6 19.6-19.6 51.2 0 70.8l14.1 14.1 14.1-14.1c-19.6-19.6-19.6-51.2 0-70.8l-9.9-9.9zm-17.7 56.1l-42.4-42.4-59.9 59.9-14.1 14.1c-7.8 7.8-7.8 20.5 0 28.3l42.4 42.4c7.8 7.8 20.5 7.8 28.3 0l74-74 14.1-14.1c-7.8-7.8-20.5-7.8-28.3 0z" />
                              </svg>
                              Demo
                            </a>
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {item.stacks.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.stacks.slice(0, 3).map((stack) => (
                        <Badge key={stack.id} variant="secondary" size="lg">
                          {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                          {stack.name}
                        </Badge>
                      ))}
                      {item.stacks.length > 3 && (
                        <PreviewCard>
                          <PreviewCardTrigger render={<Badge variant="secondary" size="lg" />}>
                            +{item.stacks.length - 3}
                          </PreviewCardTrigger>
                          <PreviewCardPopup className="flex w-md flex-wrap gap-1 p-1">
                            {item.stacks.slice(3).map((stack) => (
                              <Badge key={stack.id} variant="secondary" size="lg">
                                {stack.icon ? <Icon icon={stack.icon} name={stack.name} /> : null}
                                {stack.name}
                              </Badge>
                            ))}
                          </PreviewCardPopup>
                        </PreviewCard>
                      )}
                    </div>
                  ) : null}
                </div>
              </ItemInfoPanel>
            );
          }}
        </ItemsInfoPanel>

        <ProjectForm
          key={editingProjectId ?? "new"}
          initialData={
            editingProjectId ? (projects.find((p) => p.id === editingProjectId) ?? null) : null
          }
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
        <AlertDialog open={batchDeleteDialogOpen} onOpenChange={setBatchDeleteDialogOpen}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {selectedCount} project(s)?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the selected projects and all their associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" disabled={isDeleting} />}
                onClick={handleBatchDelete}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </PageLayout>
    </ItemsNavProvider>
  );
}
