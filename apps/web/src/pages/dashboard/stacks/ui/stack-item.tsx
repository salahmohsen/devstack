import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, GripVertical, Pencil, SquareCheckIcon, SquareIcon, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core";
import { Card, CardContent } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
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

  const showLeadingOverlay =
    Boolean(isSort && dragHandleProps) || (!isSort && (isChecked || batchSelectActive));

  // Compact (<12rem container): horizontal icon+name band.
  // Wide (@[12rem]): square poster with centered icon + badges.
  // Container is the grid cell (`@container` on stacks-page wrappers).
  const identityLayoutClassName = cn(
    "flex min-h-0 flex-1",
    "flex-row items-center gap-2.5 py-3 pe-3",
    showLeadingOverlay ? "ps-8" : "ps-3",
    "@[12rem]:flex-col @[12rem]:items-center @[12rem]:justify-center @[12rem]:gap-2 @[12rem]:p-4 @[12rem]:pt-8"
  );

  const identityBody = (
    <>
      <Icon
        icon={stack.icon}
        className="size-9 shrink-0 rounded object-contain @[12rem]:size-14"
        fallbackToLetter
        letterClassName="size-9 text-sm @[12rem]:size-14 @[12rem]:text-xl"
        name={stack.name}
      />
      <p
        className={cn(
          "min-w-0 flex-1 truncate text-left text-sm font-medium",
          "@[12rem]:line-clamp-2 @[12rem]:block @[12rem]:max-w-full @[12rem]:flex-none @[12rem]:text-center @[12rem]:wrap-break-word"
        )}
        title={stack.name}
      >
        {stack.name}
      </p>
      {stack.type || stack.isFeatured || usageCount > 0 ? (
        <div className="hidden max-w-full flex-wrap items-center justify-center gap-1 @[12rem]:flex">
          <StackIdentityBadges
            type={stack.type}
            isFeatured={stack.isFeatured}
            projectCount={usageCount}
          />
        </div>
      ) : null}
    </>
  );

  const card = (
    <Card
      data-item-id={stack.id}
      data-selected={isOpen}
      className={cn(
        // content-visibility skips layout/paint for off-screen cards in long grids
        "[contain-intrinsic-size:auto_7.5rem] [content-visibility:auto]",
        "@[12rem]:aspect-square @[12rem]:[contain-intrinsic-size:12.5rem]",
        "group relative w-full max-w-full shrink-0 overflow-hidden py-0!",
        "motion-safe:transition-shadow motion-safe:duration-150",
        isSort && "cursor-grab active:cursor-grabbing",
        isOpen && "ring-1 ring-primary/40"
      )}
    >
      <div className="relative flex h-full flex-col">
        {isSort && dragHandleProps ? (
          <div
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className={cn("absolute top-2 left-3 z-20", dragHandleProps.className)}
          >
            <GripVertical className="size-4" aria-hidden />
          </div>
        ) : null}
        <div data-batch-select className="absolute top-2 left-3 z-10">
          {!isSort && (isChecked || batchSelectActive) ? (
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggleSelect(stack.id)}
              aria-label={`Select ${stack.name}`}
            />
          ) : null}
        </div>
        {isSort ? (
          <CardContent className={cn("p-0", identityLayoutClassName)}>{identityBody}</CardContent>
        ) : (
          <>
            <button
              type="button"
              aria-pressed={isOpen}
              aria-label={`View details for ${stack.name}`}
              className={cn(
                identityLayoutClassName,
                "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
              onClick={() => {
                onOpen(stack.id, stack);
              }}
              onMouseEnter={
                onPrefetch
                  ? () => {
                      onPrefetch(stack.id);
                    }
                  : undefined
              }
            >
              {identityBody}
            </button>
            <div
              className={cn(
                "flex h-10 shrink-0 items-center justify-center px-2 pb-2",
                "motion-safe:transition-opacity motion-safe:duration-150",
                isOpen || batchSelectActive
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              )}
            >
              <ListItemActionButtons
                edit={{
                  onAction: () => onEdit(stack.id),
                  isLoading: false
                }}
                select={{
                  selected: isChecked,
                  onToggle: () => onToggleSelect(stack.id)
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
          </>
        )}
      </div>
    </Card>
  );

  const deleteDialog = (
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Delete this stack?"
      description={`"${stack.name}" will be removed from all projects that use it.`}
      confirmLabel="Delete stack"
      confirmVariant="destructive"
      confirmLoading={deleteMutation.isPending}
      onConfirm={handleDelete}
    />
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
          <ContextMenuItem closeOnClick onClick={() => onToggleSelect(stack.id)}>
            {isChecked ? <SquareCheckIcon aria-hidden /> : <SquareIcon aria-hidden />}
            {isChecked ? "Deselect" : "Select"}
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
