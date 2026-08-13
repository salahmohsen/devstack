import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { formatStackTypeLabel, type StackOutput } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardContent } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { cn } from "@tsu-stack/ui/lib/utils";

import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { Icon } from "@/shared/ui/icon";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

import { getPortfolioListQueryKey } from "@/features/portfolio";

const TYPE_VARIANTS: Record<
  string,
  "default" | "secondary" | "outline" | "info" | "success" | "warning" | "error"
> = {
  framework: "default",
  language: "info",
  database: "success",
  ui: "secondary",
  auth: "warning",
  deployment: "outline",
  testing: "error",
  ai: "info",
  tooling: "secondary",
  storage: "success",
  other: "outline"
};

export type StackItemProps = {
  stack: StackOutput;
  /** Multi-select checkbox state — pass from parent so memo can skip siblings. */
  isChecked: boolean;
  /** When true, always show checkboxes (any card selected). */
  batchSelectActive?: boolean;
  /** Side-panel open for this card. */
  isOpen: boolean;
  isSort?: boolean;
  onEdit: (id: string) => void;
  onOpen: (id: string, stack: StackOutput) => void;
  onToggleSelect: (id: string) => void;
  onPrefetch?: (id: string) => void;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
    className: string;
  };
};

/**
 * Grid card for one stack. Memoized — parent must pass primitive selection flags
 * so selecting/opening one item does not re-render the whole grid.
 */
export const StackItem = memo(function StackItem({
  stack,
  isChecked,
  batchSelectActive = false,
  isOpen,
  isSort = false,
  onEdit,
  onOpen,
  onToggleSelect,
  onPrefetch,
  dragHandleProps
}: StackItemProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const usageCount = stack.projectCount ?? 0;

  const deleteMutation = useMutation(
    orpcQueryClient.stacks.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateStacksListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
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
    orpcQueryClient.portfolio.toggle.mutationOptions({
      onSuccess: async (_data, variables) => {
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        await invalidateStacksListQueries(queryClient);
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
      {/* Card is the interactive surface (sort mode disables activation). */}
      {/* oxlint-disable jsx-a11y/prefer-tag-over-role */}
      <Card
        role="button"
        tabIndex={isSort ? -1 : 0}
        aria-pressed={isOpen}
        aria-label={`View details for ${stack.name}`}
        data-item-id={stack.id}
        data-selected={isOpen}
        onClick={
          isSort
            ? undefined
            : (event) => {
                if (
                  event.target instanceof Element &&
                  event.target.closest("[data-slot=checkbox], [data-batch-select]")
                ) {
                  return;
                }
                onOpen(stack.id, stack);
              }
        }
        onMouseEnter={
          isSort || !onPrefetch
            ? undefined
            : () => {
                onPrefetch(stack.id);
              }
        }
        onKeyDown={
          isSort
            ? undefined
            : (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                if (
                  event.target instanceof Element &&
                  event.target.closest("[data-slot=checkbox], [data-batch-select]")
                ) {
                  return;
                }
                event.preventDefault();
                onOpen(stack.id, stack);
              }
        }
        className={cn(
          // content-visibility skips layout/paint for off-screen cards in long grids
          "[contain-intrinsic-size:12.5rem] [content-visibility:auto]",
          "group relative aspect-square cursor-pointer overflow-hidden py-0!",
          // Only transition interactive chrome — not every descendant (** → all)
          "transition-[box-shadow,transform] duration-200",
          "h-50 w-full max-w-full shrink-0",
          isSort && "cursor-grab active:cursor-grabbing",
          isOpen && "ring-1 ring-primary/40"
        )}
      >
        {isSort && dragHandleProps ? (
          <div
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className={cn("absolute top-2 left-3 z-20", dragHandleProps.className)}
          >
            <GripVertical className="size-4" />
          </div>
        ) : null}
        <div
          data-batch-select
          role="presentation"
          className="absolute top-2 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {!isSort ? (
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggleSelect(stack.id)}
              className={cn(
                "transition-opacity duration-150",
                isChecked || batchSelectActive
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
              )}
            />
          ) : null}
        </div>
        <CardContent
          data-selected={isOpen}
          className={cn(
            "flex h-full flex-col items-center justify-center gap-2 p-4 transition-transform duration-200",
            !isSort && "translate-y-4 scale-100 data-selected:translate-y-0 data-selected:scale-90"
          )}
        >
          {stack.type ? (
            <Badge
              variant={TYPE_VARIANTS[stack.type] ?? "outline"}
              size="sm"
              className="absolute top-2 right-2 z-10"
            >
              {formatStackTypeLabel(stack.type)}
            </Badge>
          ) : null}
          <Icon
            icon={stack.icon}
            className="size-14 shrink-0 rounded object-contain"
            fallbackToLetter
            letterClassName="size-14 text-xl"
            name={stack.name}
          />
          <p
            className="warp-break-words line-clamp-2 block max-w-full text-center text-sm font-medium"
            title={stack.name}
          >
            {stack.name}
          </p>
          {usageCount > 0 ? (
            <p className="text-center text-xs text-muted-foreground">
              {usageCount} {usageCount === 1 ? "project" : "projects"}
            </p>
          ) : null}
        </CardContent>
        {!isSort ? (
          <div
            className="mx-auto translate-y-9 transition-transform duration-200 data-selected:-translate-y-2"
            data-selected={isOpen}
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
          </div>
        ) : null}
      </Card>
      {/* oxlint-enable jsx-a11y/prefer-tag-over-role */}

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
});
