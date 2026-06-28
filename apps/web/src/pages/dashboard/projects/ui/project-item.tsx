import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Edit, ExternalLink, GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProjectOutput } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useProjectStore } from "@/pages/dashboard/projects/_lib/project.slice";

type DragHandleProps = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

type ProjectItemProps = {
  project: ProjectOutput;
  dragHandleProps?: DragHandleProps;
};

export function ProjectItem({ project, dragHandleProps }: ProjectItemProps) {
  const queryClient = useQueryClient();

  const { selectItem, isItemSelected } = useProjectStore();
  const selected = isItemSelected?.[project.id] ?? false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation(
    orpc.portfolio.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.projects.list.queryKey()
        });
        toast.success("Project deleted.");
      },
      onError: () => {
        toast.error("Failed to delete project.");
      }
    })
  );

  function handleDelete() {
    deleteMutation.mutate({ id: project.id });
    setDeleteDialogOpen(false);
  }

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        data-selected={selected}
        onClick={() => selectItem(project.id, project)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectItem(project.id, project);
          }
        }}
        className={cn(
          "cursor-pointer rounded-sm bg-transparent ring-0 transition-all duration-200",
          // Spotlight: when any sibling is hovered, the others dim to
          // 90% while the hovered/selected item itself stays at 100%.
          "group-hover:opacity-90 hover:opacity-100 data-selected:opacity-100",
          // Scale up the active item — hovered or selected.
          "hover:scale-[1.01] data-selected:scale-[1.01]",
          selected ? "ring-2 ring-ring" : "hover:bg-muted/40"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex w-full min-w-0 items-center gap-2">
              {dragHandleProps ? (
                <button
                  type="button"
                  aria-label="Drag to reorder"
                  className={dragHandleProps.className}
                  {...dragHandleProps.attributes}
                  {...dragHandleProps.listeners}
                >
                  <GripVertical />
                </button>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate">
                      {project.title}
                      {project.githubUrl ? (
                        <a
                          href={project.githubUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Open ${project.title} on GitHub`}
                          onClick={(event) => event.stopPropagation()}
                          className="ms-1.5 inline-flex align-middle text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" strokeWidth={2.25} />
                        </a>
                      ) : null}
                    </CardTitle>
                    <p className="mt-0.5 text-sm text-muted-foreground">{project.year}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      render={
                        <Link
                          to="/dashboard/projects/$projectId"
                          params={{ projectId: project.id }}
                        />
                      }
                      onClick={(event: React.MouseEvent) => event.stopPropagation()}
                      aria-label="Edit project"
                    >
                      <Edit />
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteDialogOpen(true);
                      }}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete project"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this project?</DialogTitle>
            <DialogDescription>
              This will permanently delete this project and all its associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setDeleteDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={deleteMutation.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
