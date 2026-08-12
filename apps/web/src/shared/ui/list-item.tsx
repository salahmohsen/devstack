"use client";

import { GripVertical } from "lucide-react";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
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

import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";

type DragHandleProps = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

type ListItemProps = {
  selected: boolean;
  onSelect: () => void;
  className?: string;
  dragHandleProps?: DragHandleProps;
  isSort?: boolean;
  isBatchSelected?: boolean;
  onToggleSelect?: () => void;
  /**
   * When true, always show the batch checkbox (e.g. at least one row is selected).
   * When false, the checkbox is hover-revealed unless the row is selected.
   */
  batchSelectActive?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onView?: () => void;
  /** Override default “View” label on the action strip (e.g. “View listing”). */
  viewLabel?: string;
  onEdit?: () => void;
  /** When set, replaces default view/edit/delete action strip. */
  actions?: React.ReactNode;
  onDelete?: () => void;
  isDeleting?: boolean;
  onTogglePortfolio?: () => void;
  isTogglingPortfolio?: boolean;
  inPortfolio?: boolean;
  deleteTitle?: string;
  deleteDescription?: string;
} & (
  | {
      children: React.ReactNode;
      title?: never;
      titleStart?: never;
      titleEnd?: never;
      meta?: never;
    }
  | {
      children?: never;
      title: string;
      titleStart?: React.ReactNode;
      titleEnd?: React.ReactNode;
      meta?: React.ReactNode;
    }
);

export function ListItem({
  selected,
  onSelect,
  children,
  className,
  dragHandleProps,
  isSort = false,
  isBatchSelected,
  onToggleSelect,
  batchSelectActive = false,
  onMouseEnter,
  onView,
  viewLabel,
  onEdit,
  actions,
  onDelete,
  isDeleting = false,
  onTogglePortfolio,
  isTogglingPortfolio,
  inPortfolio,
  deleteTitle = "Delete this item?",
  deleteDescription = "This cannot be undone.",
  title,
  titleStart,
  titleEnd,
  meta
}: ListItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const showDefaultActions = actions === undefined;

  function handleDelete() {
    onDelete?.();
    setDeleteDialogOpen(false);
  }

  const bodyContent = children ?? (
    <div className="grid gap-5 md:max-w-3/4 md:grid-cols-[20rem_1fr]">
      <CardTitle className="flex min-w-0 flex-col gap-1.5 self-center text-sm">
        <div className="flex min-w-0 items-center gap-2">
          {inPortfolio !== undefined ? (
            <span
              className={cn(
                "size-1 shrink-0 animate-pulse rounded-full",
                inPortfolio ? "bg-success" : "bg-destructive"
              )}
            />
          ) : null}
          {titleStart}
          <h3 className="min-w-0 truncate">{title}</h3>
        </div>
        {titleEnd ? (
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">{titleEnd}</div>
        ) : null}
      </CardTitle>
      {meta ? <CardDescription className="text-sm">{meta}</CardDescription> : null}
    </div>
  );

  function handleCardActivate(event: React.SyntheticEvent) {
    // Multi-select checkbox must never open/close the side panel.
    const target = event.target;
    if (target instanceof Element && target.closest("[data-slot=checkbox], [data-batch-select]")) {
      return;
    }
    onSelect();
  }

  return (
    <>
      <Card
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        data-selected={selected}
        onClick={handleCardActivate}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          if (
            event.target instanceof Element &&
            event.target.closest("[data-slot=checkbox], [data-batch-select]")
          ) {
            return;
          }
          event.preventDefault();
          onSelect();
        }}
        onMouseEnter={onMouseEnter}
        className={cn(
          "group mx-3 cursor-pointer transition-all duration-200",
          "data-selected:scale-[1.01] data-selected:opacity-100",
          "hover:scale-[1.01] hover:opacity-100",
          className
        )}
      >
        <CardHeader
          className={cn(
            "grid-cols-[auto_1fr] items-center py-3",
            isSort
              ? "md:grid-cols-[auto_auto_1fr_auto]"
              : onToggleSelect
                ? "md:grid-cols-[auto_1fr_auto]"
                : "md:grid-cols-[1fr_auto]"
          )}
        >
          {onToggleSelect ? (
            // role=presentation: stopPropagation only; checkbox is the control
            // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- stopPropagation shell
            <div
              data-batch-select
              role="presentation"
              className="flex items-center self-center"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={isBatchSelected ?? false}
                onCheckedChange={() => {
                  onToggleSelect();
                }}
                className={cn(
                  "transition-opacity",
                  isBatchSelected || batchSelectActive
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                )}
              />
            </div>
          ) : null}
          {dragHandleProps && isSort ? (
            <button
              type="button"
              aria-label="Drag to reorder"
              className={cn("shrink", dragHandleProps.className)}
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical />
            </button>
          ) : null}
          {bodyContent}
          {showDefaultActions ? (
            <ListItemActionButtons
              classNames={{ wrapper: "col-span-full md:col-span-1 ms-auto" }}
              view={
                onView
                  ? {
                      onAction: onView,
                      isLoading: false,
                      label: viewLabel,
                      ariaLabel: viewLabel
                    }
                  : undefined
              }
              edit={onEdit ? { onAction: onEdit, isLoading: false } : undefined}
              togglePortfolio={
                onTogglePortfolio
                  ? {
                      onAction: onTogglePortfolio,
                      isLoading: isTogglingPortfolio ?? false,
                      initialValue: inPortfolio ?? false
                    }
                  : undefined
              }
              delete={
                onDelete
                  ? {
                      onAction: () => setDeleteDialogOpen(true),
                      isLoading: isDeleting
                    }
                  : undefined
              }
            />
          ) : (
            <div
              role="presentation"
              className="col-span-full ms-auto flex shrink-0 items-center gap-1.5 md:col-span-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {actions}
            </div>
          )}
        </CardHeader>
      </Card>

      {showDefaultActions && onDelete ? (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{deleteTitle}</DialogTitle>
              <DialogDescription>{deleteDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setDeleteDialogOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button disabled={isDeleting} onClick={handleDelete} variant="destructive">
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
