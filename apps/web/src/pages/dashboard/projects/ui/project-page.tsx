"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core/portfolio";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";

import { SortableList } from "@/shared/ui/sortable-list";

import {
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
import { ProjectInfo } from "@/pages/dashboard/projects/ui/project-info";
import { ProjectItem } from "@/pages/dashboard/projects/ui/project-item";
import { ProjectItemAddButton } from "@/pages/dashboard/projects/ui/project-item-add-button";

export function ProjectsPage() {
  const projectsQuery = useQuery(orpcQueryClient.portfolio.projects.list.queryOptions());
  const queryClient = useQueryClient();

  const { itemInfo, isItemSelected, setItemInfo, setItemSelected } = useProjectStore();

  const projects = useMemo<ProjectOutput[]>(() => projectsQuery.data ?? [], [projectsQuery.data]);

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
      onSettled: () => {
        void queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
      }
    })
  );

  function handleReorder(newOrder: ProjectOutput[]) {
    reorderMutation.mutate({
      items: newOrder.map((proj, index) => {
        return { id: proj.id, sortOrder: index };
      })
    });
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

  // Clear the side-panel selection when the list goes empty (e.g. after
  // deleting the last project) so the panel doesn't show a stale item.
  useEffect(() => {
    if (!projectsQuery.isLoading && projects.length === 0 && itemInfo) {
      setItemInfo(null);
      setItemSelected(null);
    }
  }, [projectsQuery.isLoading, projects.length, itemInfo, setItemInfo, setItemSelected]);

  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  const openDialog = useCallback((id: string | null) => {
    setEditingProjectId(id);
    setDialogKey((k) => k + 1);
    setDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const emptyState = (
    <ItemsEmpty
      title="No projects yet"
      description="Add your first project to showcase your work."
      action={<ProjectItemAddButton onAdd={() => openDialog(null)} />}
    />
  );

  function renderList() {
    if (projectsQuery.isLoading) return <ListSkeleton />;
    if (projects.length === 0) return emptyState;

    return (
      <SortableList
        items={projects}
        onReorder={handleReorder}
        disabled={reorderMutation.isPending}
        siblingsDimOnHover
      >
        {(project, dragHandleProps) => (
          <ProjectItem
            project={project}
            dragHandleProps={dragHandleProps}
            onEdit={openDialog}
            onMouseEnter={() => {
              void queryClient.ensureQueryData(
                orpcQueryClient.portfolio.projects.get.queryOptions({ input: { id: project.id } })
              );
            }}
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
          actions={<ProjectItemAddButton onAdd={() => openDialog(null)} />}
        />

        {renderList()}

        <ItemsInfoPanel open={isAnySelected} item={itemInfo}>
          {(item: ProjectOutput) => <ProjectInfo project={item} />}
        </ItemsInfoPanel>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent key={dialogKey} className="min-w-6xl">
            <DialogHeader>
              <DialogTitle>{editingProjectId ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>
                {editingProjectId
                  ? "Update your project details."
                  : "Add a new project to your portfolio."}
              </DialogDescription>
            </DialogHeader>
            <ProjectForm
              id={editingProjectId ?? undefined}
              onSuccess={closeDialog}
              onClose={closeDialog}
            />
          </DialogContent>
        </Dialog>
      </PageLayout>
    </ItemsNavProvider>
  );
}
