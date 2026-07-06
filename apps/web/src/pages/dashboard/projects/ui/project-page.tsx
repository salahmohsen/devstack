"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, type NavigateOptions } from "@tanstack/react-router";
import { CalendarIcon, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaGithub, FaLink } from "react-icons/fa";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core/portfolio";
import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";
import { Badge } from "@tsu-stack/ui/components/badge";
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
  isAnyItemSelected,
  useItemsNavigation
} from "@/widgets/items-page";
import { ItemsInfoPanel } from "@/widgets/layout";

import { useProjectStore } from "@/pages/dashboard/projects/_lib/project.slice";
import { ProjectForm } from "@/pages/dashboard/projects/ui/project-form";

export function ProjectsPage() {
  const projectsQuery = useQuery(orpcQueryClient.portfolio.projects.list.queryOptions());
  const queryClient = useQueryClient();

  const { itemInfo, isItemSelected, setItemInfo, setItemSelected, selectItem } = useProjectStore();

  const projects = useMemo<ProjectOutput[]>(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const [isSort, setIsSort] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<ProjectOutput[] | null>(null);

  const deleteMutation = useMutation(
    orpcQueryClient.portfolio.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
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
    orpcQueryClient.portfolio.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
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
    orpcQueryClient.portfolio.projects.reorder.mutationOptions({
      onMutate: async (input) => {
        const listKey = orpcQueryClient.portfolio.projects.list.queryKey();
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
          queryClient.setQueryData(
            orpcQueryClient.portfolio.projects.list.queryKey(),
            context.previous
          );
        }
        toast.error("Failed to update order.");
      },
      onSuccess: () => {
        setPendingOrder(null);
        setIsSort(false);
      },
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
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

  const containerRef = useRef<HTMLUListElement | null>(null);

  const { handleNext, handlePrev } = useItemsNavigation<ProjectOutput>({
    items: projects,
    itemInfo,
    isItemSelected,
    setItemInfo,
    setItemSelected,
    containerRef
  });

  const isAnySelected = isAnyItemSelected(isItemSelected);

  useEffect(() => {
    if (!projectsQuery.isLoading && projects.length === 0 && itemInfo) {
      setItemInfo(null);
      setItemSelected(null);
    }
  }, [projectsQuery.isLoading, projects.length, itemInfo, setItemInfo, setItemSelected]);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = useCallback((id: string | null) => {
    setEditingProjectId(id);
    setDialogOpen(true);
  }, []);

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
            selected={isItemSelected?.[project.id] ?? false}
            onSelect={() => selectItem(project.id, project)}
            dragHandleProps={dragHandleProps}
            isSort={isSort}
            onMouseEnter={() => {
              void queryClient.ensureQueryData(
                orpcQueryClient.portfolio.projects.get.queryOptions({ input: { id: project.id } })
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
            titleEnd={
              project.repos.length > 0 ? (
                <a
                  href={project.repos[0]}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${project.title} on GitHub`}
                  onClick={(event) => event.stopPropagation()}
                  className="ms-1.5 inline-flex align-middle text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="size-3.5" strokeWidth={2.25} />
                </a>
              ) : null
            }
            meta={
              <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                <CalendarIcon size={14} /> {project.year}
              </p>
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
            />
          }
        />

        {renderList()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
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
      </PageLayout>
    </ItemsNavProvider>
  );
}
