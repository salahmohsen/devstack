import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ExperienceOutput } from "@tsu-stack/core/portfolio";
import { Link } from "@tsu-stack/i18n/tanstack-start/components/link";
import {
  ArchiveIcon,
  Delete01Icon,
  EditIcon,
  GripVerticalIcon,
  PlusSignIcon
} from "@tsu-stack/icons";
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

import { useExperienceStore } from "./_lib/experience.slice";

type DragHandleProps = {
  ref: React.Ref<HTMLButtonElement>;
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

type ExperienceItemProps = {
  experience: ExperienceOutput;
  dragHandleProps?: DragHandleProps;
};

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = format(new Date(fromDate), "MMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = format(new Date(toDate), "MMM yyyy");
  return `${start} — ${end}`;
}

export function ExperienceItem({ experience, dragHandleProps }: ExperienceItemProps) {
  const queryClient = useQueryClient();

  const { selectItem, isItemSelected } = useExperienceStore();
  const selected = isItemSelected?.[experience.id] ?? false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation(
    orpc.portfolio.experiences.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience deleted.");
      }
    })
  );

  const toggleArchivedMutation = useMutation(
    orpc.portfolio.experiences.toggleArchived.mutationOptions({
      onSuccess: async (updated) => {
        await queryClient.invalidateQueries({
          queryKey: orpc.portfolio.experiences.list.queryKey()
        });
        toast.success(updated.isArchived ? "Experience archived." : "Experience restored to live.");
      },
      onError: () => {
        toast.error("Failed to update archive state.");
      }
    })
  );

  function handleDelete() {
    deleteMutation.mutate({ id: experience.id });
    setDeleteDialogOpen(false);
  }

  function handleToggleArchived(event: React.MouseEvent) {
    event.stopPropagation();
    toggleArchivedMutation.mutate({ id: experience.id });
  }

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        data-selected={selected}
        onClick={() => selectItem(experience.id, experience)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectItem(experience.id, experience);
          }
        }}
        className={cn(
          "cursor-pointer transition-colors",
          selected ? "ring-2 ring-ring" : "hover:bg-muted/40"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2">
              {dragHandleProps ? (
                <button
                  ref={dragHandleProps.ref}
                  {...dragHandleProps.attributes}
                  {...dragHandleProps.listeners}
                  type="button"
                  aria-label="Drag to reorder"
                  className={dragHandleProps.className}
                >
                  <GripVerticalIcon />
                </button>
              ) : null}
              <div className="min-w-0">
                <CardTitle className="truncate">{experience.title}</CardTitle>
                <p className="mt-0.5 text-sm text-muted-foreground">{experience.organization}</p>
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {formatRange(experience.fromDate, experience.toDate)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                render={
                  <Link
                    to="/dashboard/experiences/$experienceId"
                    params={{ experienceId: experience.id }}
                  />
                }
                onClick={(event: React.MouseEvent) => event.stopPropagation()}
                aria-label="Edit experience"
              >
                <EditIcon />
              </Button>
              <Button
                variant="outline"
                onClick={handleToggleArchived}
                disabled={toggleArchivedMutation.isPending}
                aria-label={experience.isArchived ? "Unarchive experience" : "Archive experience"}
              >
                <ArchiveIcon />
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Delete01Icon />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this experience?</DialogTitle>
            <DialogDescription>
              This will permanently delete this experience and all its associated projects.
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

export function ExperienceItemAddButton() {
  return (
    <Button render={<Link to="/dashboard/experiences/new" />}>
      <PlusSignIcon />
      Add Experience
    </Button>
  );
}
