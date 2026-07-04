import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Edit, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ExperienceOutput } from "@tsu-stack/core/portfolio";
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
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

type ExperienceItemProps = {
  experience: ExperienceOutput;
  dragHandleProps?: DragHandleProps;
  onEdit?: (id: string) => void;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
};

function formatRange(fromDate: string | null, toDate: string | null): string {
  if (!fromDate) return "Ongoing";
  const start = safeFormat(fromDate, "MMM yyyy");
  if (!toDate) return `${start} — Present`;
  const end = safeFormat(toDate, "MMM yyyy");
  return `${start} — ${end}`;
}

function safeFormat(value: string, pattern: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : format(date, pattern);
}

export function ExperienceItem({
  experience,
  dragHandleProps,
  onEdit,
  onMouseEnter
}: ExperienceItemProps) {
  const queryClient = useQueryClient();

  const { selectItem, isItemSelected } = useExperienceStore();
  const selected = isItemSelected?.[experience.id] ?? false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation(
    orpcQueryClient.portfolio.experiences.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.experiences.list.queryKey()
        });
        toast.success("Experience deleted.");
      }
    })
  );

  function handleDelete() {
    deleteMutation.mutate({ id: experience.id });
    setDeleteDialogOpen(false);
  }

  return (
    <>
      <Card
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        aria-pressed={selected}
        data-selected={selected}
        onClick={() => selectItem(experience.id, experience)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectItem(experience.id, experience);
          }
        }}
        onMouseEnter={onMouseEnter}
        className={cn(
          "cursor-pointer transition-all duration-200",
          // Spotlight: when any sibling is hovered, the others dim to
          // 90% while the hovered/selected item itself stays at 100%.
          "group-hover:opacity-60 hover:opacity-100 data-selected:opacity-100",
          // Scale up the active item — hovered or selected.
          "hover:scale-[1.01] data-selected:scale-[1.01]"
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
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
              <div className="min-w-0">
                <CardTitle className="truncate">{experience.title}</CardTitle>
                <div className="flex gap-5">
                  <p className="mt-0.5 text-sm text-muted-foreground">{experience.organization}</p>
                  <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                    {formatRange(experience.fromDate, experience.toDate)}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onEdit?.(experience.id);
                }}
                aria-label="Edit experience"
                onMouseEnter={() =>
                  void queryClient.prefetchQuery(
                    orpcQueryClient.portfolio.experiences.get.queryOptions({
                      input: { id: experience.id }
                    })
                  )
                }
              >
                <Edit />
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 />
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

type ExperienceItemAddButtonProps = {
  onAdd?: () => void;
};

export function ExperienceItemAddButton({ onAdd }: ExperienceItemAddButtonProps) {
  return (
    <Button onClick={onAdd}>
      <Plus />
      Add Experience
    </Button>
  );
}
