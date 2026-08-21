import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, SquareCheckIcon, SquareIcon, Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core";
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

import { invalidateProjectsListQueries } from "@/shared/lib/invalidate-projects-list";
import { invalidateStacksListQueries } from "@/shared/lib/invalidate-stacks-list";
import { Icon } from "@/shared/ui/icon";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

import { getPortfolioListQueryKey } from "@/features/portfolio";

import { ItemGridCard, type ItemGridDragHandleProps } from "@/widgets/items-page";

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
  dragHandleProps?: ItemGridDragHandleProps;
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
        toast.success("Skill deleted.");
        setDeleteDialogOpen(false);
      },
      onError: () => {
        toast.error("Failed to delete skill.");
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

  const sharedActionProps = {
    select: {
      selected: isChecked,
      onToggle: () => onToggleSelect(stack.id)
    },
    togglePortfolio: {
      onAction: handleTogglePortfolio,
      initialValue: !!stack.portfolioEntryId,
      isLoading: togglePortfolioMutation.isPending
    },
    toggleFeatured: {
      onAction: handleToggleFeatured,
      initialValue: !!stack.isFeatured,
      isLoading: featuredMutation.isPending
    },
    delete: {
      onAction: () => setDeleteDialogOpen(true),
      isLoading: deleteMutation.isPending
    }
  } as const;

  const compactActionButtons = (
    <ListItemActionButtons
      {...sharedActionProps}
      compact
      edit={{
        onAction: () => onEdit(stack.id),
        isLoading: false
      }}
      editInMenu
    />
  );

  const wideActionButtons = (
    <ListItemActionButtons
      {...sharedActionProps}
      edit={{
        onAction: () => onEdit(stack.id),
        isLoading: false
      }}
    />
  );

  const card = (
    <ItemGridCard
      id={stack.id}
      name={stack.name}
      isOpen={isOpen}
      isChecked={isChecked}
      batchSelectActive={batchSelectActive}
      isSort={isSort}
      dragHandleProps={dragHandleProps}
      onOpen={() => onOpen(stack.id, stack)}
      onPrefetch={onPrefetch ? () => onPrefetch(stack.id) : undefined}
      onToggleSelect={() => onToggleSelect(stack.id)}
      mark={
        <Icon
          icon={stack.icon}
          className="size-full rounded object-contain"
          fallbackToLetter
          letterClassName="size-full text-xs @[12rem]:text-xl"
          name={stack.name}
        />
      }
      badges={
        stack.type || stack.isFeatured || usageCount > 0 ? (
          <StackIdentityBadges
            type={stack.type}
            isFeatured={stack.isFeatured}
            projectCount={usageCount}
          />
        ) : null
      }
      compactActions={compactActionButtons}
      wideActions={wideActionButtons}
    />
  );

  const deleteDialog = (
    <ConfirmDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      title="Delete this skill?"
      description={`"${stack.name}" will be removed from all projects that use it.`}
      confirmLabel="Delete skill"
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
