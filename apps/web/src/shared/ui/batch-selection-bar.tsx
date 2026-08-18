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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconShake } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

import { setMobileDockHidden } from "@/shared/lib/mobile-dock-visibility";

const FLOAT_EASE = [0.22, 1, 0.36, 1] as const;

export type BatchSelectionBarProps = {
  selectedCount: number;
  /** Visible set size (current filter / list). Used for Select all label. */
  totalCount: number;
  allVisibleSelected?: boolean;
  isDeleting?: boolean;
  isLoading?: boolean;
  onDeleteSelected: () => void;
  /**
   * Label for the select-all control. Defaults to `Select all (N)`.
   * Infinite lists should pass e.g. `Select all loaded (N)`.
   */
  selectAllLabel?: string;
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
  /**
   * `floating` — fixed bottom-center card (default for dashboard multi-select).
   * `inline` — compact group for embedding next to filters.
   */
  variant?: "floating" | "inline";
  /** Accessible name for the control group. */
  "aria-label"?: string;
};

/**
 * Compact batch actions for multi-select lists.
 * Default `variant="floating"` renders a fixed bottom-center action card.
 * Use `variant="inline"` when embedding next to filters.
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
  selectAllLabel,
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
  variant = "floating",
  "aria-label": ariaLabel = "Batch selection"
}: BatchSelectionBarProps) {
  const reduceMotion = useReducedMotion();
  const open = selectedCount > 0;

  // Floating batch bar and mobile dock share the bottom — hide the dock while selecting.
  useEffect(() => {
    const hideDock = variant === "floating" && open;
    setMobileDockHidden(hideDock);
    return () => {
      setMobileDockHidden(false);
    };
  }, [variant, open]);

  const busy = isLoading || isDeleting || isAddingToPortfolio || isRestoring;
  const DeleteIcon = deleteUsesBanIcon ? BanIcon : Trash2Icon;
  const resolvedSelectAllLabel = selectAllLabel ?? `Select all (${totalCount})`;

  const actions = (
    <Group aria-label={ariaLabel} className={cn("shrink-0", variant === "inline" && className)}>
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
          {resolvedSelectAllLabel}
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

  if (variant === "inline") {
    if (!open) return null;
    return actions;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.section
          key="batch-selection-bar"
          aria-label={ariaLabel}
          className={cn(
            "pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4",
            "pb-[max(0px,env(safe-area-inset-bottom,0px))]",
            className
          )}
          initial={reduceMotion ? false : { opacity: 0, y: 16, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={
            reduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: 12, filter: "blur(2px)", transition: { duration: 0.15 } }
          }
          transition={{ duration: 0.2, ease: FLOAT_EASE }}
        >
          <div
            className={cn(
              "pointer-events-auto relative max-w-[calc(100vw-2rem)] overflow-x-auto rounded-2xl border border-border/80 bg-card p-2 text-card-foreground shadow-lg",
              "not-dark:bg-clip-padding",
              "before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/6%)]",
              "dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"
            )}
          >
            {actions}
          </div>
        </motion.section>
      ) : null}
    </AnimatePresence>
  );
}
