import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Package, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon-picker";

import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";

type StackItemProps = React.ComponentProps<"div"> & { size?: "default" | "sm" } & {
  stack: StackOutput;
  onEdit: (id: string) => void;
};

export function StackItem({ stack, onEdit, ...props }: StackItemProps) {
  const queryClient = useQueryClient();
  const { selectItem, isItemSelected } = useStackStore();
  const selected = isItemSelected?.[stack.id] ?? false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteMutation = useMutation(
    orpcQueryClient.portfolio.stacks.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.projects.list.queryKey()
        });
        toast.success("Stack deleted.");
        setDeleteDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to delete stack.");
      }
    })
  );

  function handleDelete() {
    deleteMutation.mutate({ id: stack.id });
  }

  return (
    <>
      <Card
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        aria-label={`View details for ${stack.name}`}
        data-item-id={stack.id}
        data-selected={selected}
        onClick={() => selectItem(stack.id, stack)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectItem(stack.id, stack);
          }
        }}
        size="sm"
        className={cn(
          "group border-px relative aspect-square cursor-pointer rounded-sm border-border bg-transparent py-0!",
          "transition-all duration-200",
          "hover:border-border hover:bg-muted data-selected:border-foreground data-selected:bg-muted"
        )}
        {...props}
      >
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-4">
          {stack.icon ? (
            <Icon
              nameIcon={stack.icon}
              propsIcon={{ className: "size-14 shrink-0 rounded object-contain" }}
            />
          ) : (
            <Package className="size-14 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          )}
          <p
            className="warp-break-words line-clamp-2 max-w-full text-center text-sm font-medium"
            title={stack.name}
          >
            {stack.name}
          </p>
        </CardContent>

        <div
          className={cn(
            "pointer-events-none absolute flex size-full items-center justify-center gap-1",
            "opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:backdrop-blur-xs",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          )}
        >
          <Button
            variant="secondary"
            onClick={(event: React.MouseEvent) => {
              event.stopPropagation();
              onEdit(stack.id);
            }}
            aria-label={`Edit ${stack.name}`}
          >
            <Edit />
          </Button>
          <Button
            variant="destructive"
            onClick={(event) => {
              event.stopPropagation();
              setDeleteDialogOpen(true);
            }}
            aria-label={`Delete ${stack.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this stack?</DialogTitle>
            <DialogDescription>
              {`"${stack.name}" will be removed from all projects that use it.`}
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
