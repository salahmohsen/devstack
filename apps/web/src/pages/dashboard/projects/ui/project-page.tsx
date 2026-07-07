"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaGithub, FaLink } from "react-icons/fa";
import { toast } from "sonner";

import { orpcClient, orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core";
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
                <div className="flex flex-wrap gap-1.5">
                  {project.stacks.map((stack) => (
                    <Badge key={stack.id} variant="secondary" size="lg">
                      {stack.icon ? <Icon nameIcon={stack.icon} /> : null}
                      {stack.name}
                    </Badge>
                  ))}
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
            const projectLink = `${ENV_WEB_ISOMORPHIC.VITE_WEB_URL.replace(/\/$/, "")}/${item.title}`;
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
                              <FaGithub className="mr-1 size-3" />
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
                              <FaLink className="mr-1 size-3" />
                              Demo
                            </a>
                          }
                        />
                      ) : null}
                    </div>
                  ) : null}
                  {item.stacks.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.stacks.map((stack) => (
                        <Badge key={stack.id} variant="secondary" size="lg">
                          {stack.icon ? <Icon nameIcon={stack.icon} /> : null}
                          {stack.name}
                        </Badge>
                      ))}
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
