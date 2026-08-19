"use client";

import { GripVertical } from "lucide-react";
import { useState } from "react";

import { Card, CardDescription, CardHeader, CardTitle } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  ContextMenu,
  ContextMenuPopup,
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
import { cn } from "@tsu-stack/ui/lib/utils";

import { ListItemActionButtons } from "@/shared/ui/list-item-action-buttons";
import { listItemContextSlots, type ListItemMenuSlots } from "@/shared/ui/list-item-menu-slots";
import { ListItemOverflowMenu } from "@/shared/ui/list-item-overflow-menu";

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
   * When true, batch edit mode is on (at least one row selected).
   * Checkbox column is reserved only while this is true.
   */
  batchSelectActive?: boolean;
  /**
   * `active-only` (default): checkbox only after batch mode starts (Select from ▾ / right-click).
   * `hover-or-active`: overlay checkbox on hover before batch mode (legacy).
   */
  batchCheckboxVisibility?: "hover-or-active" | "active-only";
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onView?: () => void;
  /** Override default “View” label on the action strip (e.g. “View listing”). */
  viewLabel?: string;
  /** Custom control replacing the default View button in the action strip. */
  viewSlot?: React.ReactNode;
  onEdit?: () => void;
  /** When set, replaces default view/edit/delete action strip. */
  actions?: React.ReactNode;
  /**
   * Extra overflow items for ▾ and right-click (slot-based). Prefer this so both menus match.
   */
  renderExtraMenuItems?: (slots: ListItemMenuSlots) => React.ReactNode;
  /**
   * @deprecated Menu-only extras. Prefer `renderExtraMenuItems`.
   */
  extraMenuItems?: React.ReactNode;
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
  batchCheckboxVisibility = "active-only",
  onMouseEnter,
  onView,
  viewLabel,
  viewSlot,
  onEdit,
  actions,
  renderExtraMenuItems,
  extraMenuItems,
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
  const showBatchColumn = Boolean(onToggleSelect && batchSelectActive);
  const showHoverCheckbox =
    Boolean(onToggleSelect) && !batchSelectActive && batchCheckboxVisibility === "hover-or-active";

  const selectConfig = onToggleSelect
    ? {
        selected: Boolean(isBatchSelected),
        onToggle: onToggleSelect
      }
    : undefined;

  const viewConfig =
    !viewSlot && onView
      ? {
          onAction: onView,
          isLoading: false,
          label: viewLabel,
          ariaLabel: viewLabel
        }
      : undefined;

  const editConfig = onEdit ? { onAction: onEdit, isLoading: false } : undefined;

  const togglePortfolioConfig = onTogglePortfolio
    ? {
        onAction: onTogglePortfolio,
        isLoading: isTogglingPortfolio ?? false,
        initialValue: inPortfolio ?? false
      }
    : undefined;

  const deleteConfig = onDelete
    ? {
        onAction: () => setDeleteDialogOpen(true),
        isLoading: isDeleting
      }
    : undefined;

  const resolvedExtra = renderExtraMenuItems ?? (extraMenuItems ? () => extraMenuItems : undefined);

  function handleDelete() {
    onDelete?.();
  }

  const bodyContent = children ? (
    <div className="min-w-0">{children}</div>
  ) : (
    <div className={cn("grid min-w-0 gap-5 md:max-w-3/4", meta && "md:grid-cols-[20rem_1fr]")}>
      <CardTitle className="flex min-w-0 flex-col gap-1.5 self-center text-sm">
        <div className="flex min-w-0 items-center gap-2">
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

  const card = (
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
        "group mx-3 cursor-pointer [contain-intrinsic-size:auto_4.5rem] [content-visibility:auto]",
        "transition-[transform,opacity] duration-200",
        "data-selected:scale-[1.01] data-selected:opacity-100",
        "hover:scale-[1.01] hover:opacity-100",
        className
      )}
    >
      <CardHeader
        className={cn(
          // Override card-header’s default two-row template; keep actions in a
          // trailing column so mobile does not full-bleed them under content.
          // Checkbox column only while batch mode is active — no idle left gap.
          "relative grid-rows-[auto] items-center gap-x-2 px-3 py-3 md:gap-x-3 md:px-6",
          isSort
            ? showBatchColumn
              ? "grid-cols-[auto_auto_minmax(0,1fr)_auto]"
              : "grid-cols-[auto_minmax(0,1fr)_auto]"
            : showBatchColumn
              ? "grid-cols-[auto_minmax(0,1fr)_auto]"
              : "grid-cols-[minmax(0,1fr)_auto]"
        )}
      >
        {showHoverCheckbox ? (
          // Overlay — does not reserve layout space before batch mode.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- stopPropagation shell
          <div
            data-batch-select
            role="presentation"
            className="absolute top-1/2 left-3 z-10 flex -translate-y-1/2 items-center opacity-0 transition-opacity group-hover:opacity-100 has-focus-visible:opacity-100 md:left-6"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isBatchSelected ?? false}
              onCheckedChange={() => {
                onToggleSelect?.();
              }}
            />
          </div>
        ) : null}
        {showBatchColumn ? (
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
                onToggleSelect?.();
              }}
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
            classNames={{ wrapper: "ms-auto hidden shrink-0 self-start md:flex" }}
            view={viewConfig}
            viewSlot={viewSlot}
            edit={editConfig}
            select={selectConfig}
            renderExtraMenuItems={resolvedExtra}
            togglePortfolio={togglePortfolioConfig}
            delete={deleteConfig}
          />
        ) : (
          <div
            role="presentation"
            className="ms-auto flex shrink-0 items-center gap-1.5 self-start"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {actions}
          </div>
        )}
      </CardHeader>
    </Card>
  );

  const showContextMenu = showDefaultActions && Boolean(onToggleSelect);

  return (
    <>
      {showContextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger className="block w-full outline-none">{card}</ContextMenuTrigger>
          <ContextMenuPopup className="min-w-44">
            <ListItemOverflowMenu
              slots={listItemContextSlots}
              select={selectConfig}
              view={viewConfig}
              edit={editConfig}
              togglePortfolio={togglePortfolioConfig}
              delete={deleteConfig}
              renderExtraMenuItems={resolvedExtra}
            />
          </ContextMenuPopup>
        </ContextMenu>
      ) : (
        card
      )}

      {showDefaultActions && onDelete ? (
        <Dialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            if (!open && isDeleting) return;
            setDeleteDialogOpen(open);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{deleteTitle}</DialogTitle>
              <DialogDescription>{deleteDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogCancel disabled={isDeleting}>Cancel</DialogCancel>
              <DialogAction variant="destructive" loading={isDeleting} onClick={handleDelete}>
                Delete
              </DialogAction>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
