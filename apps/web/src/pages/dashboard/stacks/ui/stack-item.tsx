import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core/portfolio";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent, CardFrame } from "@tsu-stack/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

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

  const togglePortfolioMutation = useMutation(
    orpcQueryClient.portfolio.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.portfolio.stacks.list.queryKey()
        });
        toast.success(variables.included ? "Added to portfolio." : "Removed from portfolio.");
      },
      onError: () => {
        toast.error("Failed to update portfolio.");
      }
    })
  );

  function handleDelete() {
    deleteMutation.mutate({ id: stack.id });
  }

  function handleTogglePortfolio() {
    togglePortfolioMutation.mutate({
      type: "stack",
      entityId: stack.id,
      included: !stack.portfolioEntryId
    });
  }

  return (
    <>
      <Card
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
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
        className={cn(
          "group relative aspect-square cursor-pointer overflow-hidden py-0!",
          "**:transition-all **:duration-200"
        )}
        {...props}
      >
        <CardContent
          data-selected={selected}
          className="flex h-full translate-y-4 scale-100 flex-col items-center justify-center gap-3 p-4 data-selected:translate-y-0 data-selected:scale-90"
        >
          {stack.icon ? (
            <Icon
              nameIcon={stack.icon}
              propsIcon={{ className: "size-14 shrink-0 rounded object-contain" }}
            />
          ) : (
            <Package className="size-14 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          )}
          <p
            className="warp-break-words line-clamp-2 block max-w-full text-center text-sm font-medium data-selected:hidden"
            data-selected={selected}
            title={stack.name}
          >
            {stack.name}
          </p>
        </CardContent>

        <CardFrame
          className="mx-auto flex w-[calc(100%-10px)] translate-y-16 justify-center p-1.5 data-selected:-translate-y-2"
          data-selected={selected}
        >
          <ListItemActionButtons
            edit={{
              onAction: () => onEdit(stack.id),
              isLoading: false
            }}
            togglePortfolio={{
              onAction: handleTogglePortfolio,
              initialValue: !!stack.portfolioEntryId,
              isLoading: togglePortfolioMutation.isPending
            }}
            delete={{
              onAction: () => setDeleteDialogOpen(true),
              isLoading: deleteMutation.isPending
            }}
          />
        </CardFrame>
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
