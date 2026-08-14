import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, GripVertical, Pencil, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core";
import { Card, CardContent } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuItem,
  ContextMenuPopup,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubPopup,
  ContextMenuSubTrigger,
  ContextMenuTrigger
} from "@tsu-stack/ui/components/context-menu";
import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { IconShake } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { Icon } from "@/shared/ui/icon";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

import { getPortfolioListQueryKey } from "@/features/portfolio";

import { StackIdentityBadges } from "@/pages/dashboard/stacks/ui/stack-type-badge";

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
        await invalidateProjectsListQueries(queryClient);
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

  const featuredMutation = useMutation(
    orpcQueryClient.stacks.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        await invalidateStacksListQueries(queryClient);
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryKey()
        });
        toast.success(
          variables.data.isFeatured ? "Featured on profile." : "Removed from featured."
        );
      },
      onError: () => {
        toast.error("Failed to update featured.");
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

  function handleToggleFeatured() {
    featuredMutation.mutate({
      id: stack.id,
      data: { isFeatured: !stack.isFeatured }
    });
  }

  // Card is the interactive surface (sort mode disables activation).
  // oxlint-disable jsx-a11y/prefer-tag-over-role
  const card = (
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
        "group relative aspect-square cursor-pointer overflow-visible py-0!",
        // Only transition interactive chrome — not every descendant (** → all)
        "transition-[box-shadow,transform] duration-200",
        "h-50 w-full max-w-full shrink-0",
        isSort && "cursor-grab active:cursor-grabbing",
        isOpen && "ring-1 ring-primary/40"
      )}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-2xl)-1px)]">
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
          {stack.type || stack.isFeatured || usageCount > 0 ? (
            <div className="flex max-w-full flex-wrap items-center justify-center gap-1">
              <StackIdentityBadges
                type={stack.type}
                isFeatured={stack.isFeatured}
                projectCount={usageCount}
              />
            </div>
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
              toggleFeatured={{
                onAction: handleToggleFeatured,
                initialValue: !!stack.isFeatured,
                isLoading: featuredMutation.isPending
              }}
              delete={{
                onAction: () => setDeleteDialogOpen(true),
                isLoading: deleteMutation.isPending
              }}
            />
          </div>
        ) : null}
      </div>
    </Card>
  );
  // oxlint-enable jsx-a11y/prefer-tag-over-role

  const deleteDialog = (
    <Dialog
      open={deleteDialogOpen}
      onOpenChange={(open) => {
        if (!open && deleteMutation.isPending) return;
        setDeleteDialogOpen(open);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this stack?</DialogTitle>
          <DialogDescription>
            {`"${stack.name}" will be removed from all projects that use it.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogCancel disabled={deleteMutation.isPending}>Cancel</DialogCancel>
          <DialogAction
            variant="destructive"
            loading={deleteMutation.isPending}
            onClick={handleDelete}
          >
            Delete
          </DialogAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (isSort) {
    return (
      <>
        {card}
        {deleteDialog}
      </>
    );
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger className="block w-full outline-none">{card}</ContextMenuTrigger>
        <ContextMenuPopup className="min-w-44">
          <ContextMenuItem
            closeOnClick
            onClick={() => {
              onOpen(stack.id, stack);
            }}
          >
            <Eye aria-hidden />
            View
          </ContextMenuItem>
          <ContextMenuItem
            closeOnClick
            onClick={() => {
              onEdit(stack.id);
            }}
          >
            <Pencil aria-hidden />
            Edit
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>Add to</ContextMenuSubTrigger>
            <ContextMenuSubPopup>
              <ContextMenuCheckboxItem
                variant="switch"
                checked={Boolean(stack.portfolioEntryId)}
                disabled={togglePortfolioMutation.isPending}
                onCheckedChange={() => {
                  handleTogglePortfolio();
                }}
              >
                Portfolio
              </ContextMenuCheckboxItem>
              <ContextMenuCheckboxItem
                variant="switch"
                checked={Boolean(stack.isFeatured)}
                disabled={featuredMutation.isPending}
                onCheckedChange={() => {
                  handleToggleFeatured();
                }}
              >
                Featured
              </ContextMenuCheckboxItem>
            </ContextMenuSubPopup>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            closeOnClick
            disabled={deleteMutation.isPending}
            onClick={() => {
              setDeleteDialogOpen(true);
            }}
          >
            <IconShake mode="hover">
              <Trash2 className="text-destructive" />
            </IconShake>
            Delete
          </ContextMenuItem>
        </ContextMenuPopup>
      </ContextMenu>
      {deleteDialog}
    </>
  );
});
