"use client";

import {
  BanIcon,
  BookmarkPlusIcon,
  CheckIcon,
  GitMergeIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconShake } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

export type BatchSelectionBarProps = {
  selectedCount: number;
  /** Visible set size (current filter / list). Used for Select all label. */
  totalCount: number;
  allVisibleSelected?: boolean;
  isDeleting?: boolean;
  isLoading?: boolean;
  onDeleteSelected: () => void;
  /** Defaults to “Delete”. Use “Dismiss” for soft-archive bulk actions. */
  deleteLabel?: string;
  deleteVariant?: "destructive" | "outline" | "secondary";
  /** When true, use Ban icon instead of Trash (e.g. dismiss). */
  deleteUsesBanIcon?: boolean;
  onSelectAll: () => void;
  onClearSelection: () => void;
  /** Optional extra primary action (e.g. Add to portfolio). */
  onAddSelectedToPortfolio?: () => void;
  isAddingToPortfolio?: boolean;
  /** Optional bulk restore (e.g. dismissed → New jobs). */
  onRestoreSelected?: () => void;
  isRestoring?: boolean;
  restoreLabel?: string;
  onMerge?: () => void;
  className?: string;
  /** Accessible name for the control group. */
  "aria-label"?: string;
};

/**
 * Compact batch actions for multi-select lists.
 * Prefer placing next to list filters (`justify-between`), not in a crowded page header.
 * Renders nothing when `selectedCount === 0`.
 *
 * Selection must never open/close item detail panels — keep that on row body clicks only.
 */
export function BatchSelectionBar({
  selectedCount,
  totalCount,
  allVisibleSelected = false,
  isDeleting = false,
  isLoading = false,
  onDeleteSelected,
  deleteLabel = "Delete",
  deleteVariant = "destructive",
  deleteUsesBanIcon = false,
  onSelectAll,
  onClearSelection,
  onAddSelectedToPortfolio,
  isAddingToPortfolio = false,
  onRestoreSelected,
  isRestoring = false,
  restoreLabel = "Restore",
  onMerge,
  className,
  "aria-label": ariaLabel = "Batch selection"
}: BatchSelectionBarProps) {
  if (selectedCount <= 0) return null;

  const busy = isLoading || isDeleting || isAddingToPortfolio || isRestoring;
  const DeleteIcon = deleteUsesBanIcon ? BanIcon : Trash2Icon;

  return (
    <Group aria-label={ariaLabel} className={cn("shrink-0", className)}>
      <Button
        type="button"
        size="sm"
        variant={deleteVariant}
        loading={isDeleting}
        disabled={busy && !isDeleting}
        onClick={onDeleteSelected}
      >
        <IconShake mode="hover">
          <DeleteIcon className="size-4" aria-hidden />
        </IconShake>
        {deleteLabel} ({selectedCount})
      </Button>
      {onRestoreSelected ? (
        <>
          <GroupSeparator />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isRestoring}
            disabled={busy && !isRestoring}
            onClick={onRestoreSelected}
          >
            <RotateCcwIcon className="size-4" aria-hidden />
            {restoreLabel} ({selectedCount})
          </Button>
        </>
      ) : null}
      {onAddSelectedToPortfolio ? (
        <>
          <GroupSeparator />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            loading={isAddingToPortfolio}
            disabled={busy && !isAddingToPortfolio}
            onClick={onAddSelectedToPortfolio}
          >
            <BookmarkPlusIcon className="size-4" aria-hidden />
            Add to portfolio
          </Button>
        </>
      ) : null}
      {onMerge ? (
        <>
          <GroupSeparator />
          <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onMerge}>
            <GitMergeIcon className="size-4" aria-hidden />
            Merge ({selectedCount})
          </Button>
        </>
      ) : null}
      <GroupSeparator />
      {!allVisibleSelected ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy || totalCount === 0}
          onClick={onSelectAll}
        >
          <CheckIcon className="size-4" aria-hidden />
          Select all ({totalCount})
        </Button>
      ) : null}
      {!allVisibleSelected ? <GroupSeparator /> : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={busy}
        onClick={onClearSelection}
      >
        <XIcon className="size-4" aria-hidden />
        Deselect
      </Button>
    </Group>
  );
}
