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
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onView?: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  isDeleting: boolean;
  onTogglePortfolio?: () => void;
  isTogglingPortfolio?: boolean;
  inPortfolio?: boolean;
  deleteTitle: string;
  deleteDescription: string;
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
  onMouseEnter,
  onView,
  onEdit,
  onDelete,
  isDeleting,
  onTogglePortfolio,
  isTogglingPortfolio,
  inPortfolio,
  deleteTitle,
  deleteDescription,
  title,
  titleStart,
  titleEnd,
  meta
}: ListItemProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  function handleDelete() {
    onDelete();
    setDeleteDialogOpen(false);
  }

  const bodyContent = children ?? (
    <div className="grid gap-5 md:max-w-3/4 md:grid-cols-[20rem_1fr]">
      <CardTitle className="flex items-center gap-2 self-center text-sm">
        {inPortfolio !== undefined ? (
          <span
            className={cn(
              "size-1 animate-pulse rounded-full",
              inPortfolio ? "bg-success" : "bg-destructive"
            )}
          />
        ) : null}
        {titleStart}
        <h3 className="truncate">{title}</h3>
        {titleEnd}
      </CardTitle>
      {meta ? <CardDescription className="text-sm">{meta}</CardDescription> : null}
    </div>
  );

  return (
    <>
      <Card
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        data-selected={selected}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        onMouseEnter={onMouseEnter}
        className={cn(
          "mx-3 cursor-pointer transition-all duration-200",
          "data-selected:scale-[1.01] data-selected:opacity-100",
          "group-hover:opacity-60 hover:scale-[1.01] hover:opacity-100",
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
            <div className="flex items-center self-center">
              <Checkbox
                checked={isBatchSelected ?? false}
                onCheckedChange={onToggleSelect}
                className={cn(
                  "transition-opacity",
                  isBatchSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
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
          <ListItemActionButtons
            classNames={{ wrapper: "col-span-full md:col-span-1 ms-auto" }}
            view={onView ? { onAction: onView, isLoading: false } : undefined}
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
            delete={{
              onAction: () => setDeleteDialogOpen(true),
              isLoading: isDeleting
            }}
          />
        </CardHeader>
      </Card>

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
    </>
  );
}
