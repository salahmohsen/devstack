import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type StackOutput } from "@tsu-stack/core";
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

import { Icon } from "@/shared/ui/icon";
import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

import { getPortfolioListQueryOptions } from "@/features/portfolio";

import { useStackStore } from "@/pages/dashboard/stacks/_lib/stack.slice";

const TYPE_LABELS: Record<string, string> = {
  framework: "Framework",
  language: "Language",
  database: "Database",
  ui: "UI",
  auth: "Auth",
  deployment: "Deploy",
  testing: "Testing",
  ai: "AI",
  tooling: "Tooling",
  storage: "Storage",
  other: "Other"
};

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

type StackItemProps = React.ComponentProps<"div"> & { size?: "default" | "sm" } & {
  stack: StackOutput;
  onEdit: (id: string) => void;
  dragHandleProps?: {
    attributes: Record<string, unknown>;
    listeners: Record<string, unknown> | undefined;
    className: string;
  };
  isSort?: boolean;
};

export function StackItem({ stack, onEdit, dragHandleProps, isSort, ...props }: StackItemProps) {
  const queryClient = useQueryClient();
  const { openItem, isItemOpen, selectedIds, toggleSelect } = useStackStore();
  const selected = isItemOpen?.[stack.id] ?? false;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const usageCount = stack.projectCount ?? 0;

  const deleteMutation = useMutation(
    orpcQueryClient.stacks.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.stacks.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: orpcQueryClient.projects.list.queryKey()
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
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
          queryKey: orpcQueryClient.portfolio.list.queryOptions({ input: {} }).queryKey
        });
        await queryClient.invalidateQueries({
          queryKey: getPortfolioListQueryOptions().queryKey
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
        /* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role, jsx-a11y/interactive-supports-focus */
        role="button"
        aria-pressed={selected}
        aria-label={`View details for ${stack.name}`}
        data-item-id={stack.id}
        data-selected={selected}
        onClick={isSort ? undefined : () => openItem(stack.id, stack)}
        onKeyDown={
          isSort
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openItem(stack.id, stack);
                }
              }
        }
        className={cn(
          "group relative aspect-square cursor-pointer overflow-hidden py-0!",
          "**:transition-all **:duration-200",
          // Fixed footprint so selection / side-panel width changes don't reflow the grid
          "h-50 w-full max-w-full shrink-0",
          isSort && "cursor-grab active:cursor-grabbing",
          selected && "ring-1 ring-primary/40"
        )}
        {...props}
      >
        {isSort && dragHandleProps && (
          <div
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            className={cn("absolute top-2 left-3 z-20", dragHandleProps.className)}
          >
            <GripVertical className="size-4" />
          </div>
        )}
        <div
          role="presentation"
          className="absolute top-2 left-3 z-10"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {!isSort && (
            <Checkbox
              checked={selectedIds?.[stack.id] ?? false}
              onCheckedChange={() => toggleSelect(stack.id)}
              className={cn(
                "transition-opacity",
                selectedIds?.[stack.id] ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            />
          )}
        </div>
        <CardContent
          data-selected={selected}
          className={cn(
            "flex h-full flex-col items-center justify-center gap-2 p-4",
            !isSort && "translate-y-4 scale-100 data-selected:translate-y-0 data-selected:scale-90"
          )}
        >
          {stack.type && (
            <Badge
              variant={TYPE_VARIANTS[stack.type] ?? "outline"}
              size="sm"
              className="absolute top-2 right-2 z-10"
            >
              {TYPE_LABELS[stack.type] ?? stack.type}
            </Badge>
          )}
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
          {usageCount > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              {usageCount} {usageCount === 1 ? "project" : "projects"}
            </p>
          )}
        </CardContent>
        {!isSort && (
          <div
            className="mx-auto translate-y-9 data-selected:-translate-y-2"
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
          </div>
        )}
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
