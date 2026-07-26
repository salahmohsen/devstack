"use client";

import {
  ArrowUpDownIcon,
  BookmarkPlusIcon,
  CheckIcon,
  GitMergeIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
  X,
  XIcon
} from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator, GroupText } from "@tsu-stack/ui/components/group";
import { IconMorph, IconShake } from "@tsu-stack/ui/components/icon-motion";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger
} from "@tsu-stack/ui/components/tooltip";

type OrganizeConfig = {
  isRunning: boolean;
  currentStep: string | null;
  onStart: () => void;
  onCancel: () => void;
};

type BatchConfig = {
  selectedCount: number;
  totalCount: number;
  isBatchLoading: boolean;
  isDeleting?: boolean;
  isAddingToPortfolio?: boolean;
  onDeleteSelected: () => void;
  onAddSelectedToPortfolio?: () => void;
  onMerge?: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

type HeaderActionProps = {
  add?: {
    onAdd?: () => void;
    label?: string;
    isLoading?: boolean;
  };
  organize?: OrganizeConfig;
  batch?: BatchConfig;
  sort?: {
    isSort: boolean;
    isSortPending: boolean;
    onSortStart: () => void;
    onSortSave: () => void;
    onSortRestore: () => void;
    onSortCancel: () => void;
  };
};

export function HeaderActions({ add, organize, batch, sort }: HeaderActionProps) {
  const { isSort, isSortPending, onSortStart, onSortSave, onSortRestore, onSortCancel } =
    sort ?? {};

  return (
    <div className="flex gap-2">
      {isSort ? (
        <Group>
          <Button onClick={onSortSave} loading={isSortPending}>
            <CheckIcon />
            Save
          </Button>
          <GroupSeparator />
          <Button onClick={onSortRestore}>
            <RotateCcwIcon />
            Restore default
          </Button>
          <GroupSeparator />
          <Button aria-label="Cancel sort" size="icon" onClick={onSortCancel}>
            <X aria-hidden="true" />
          </Button>
        </Group>
      ) : batch && batch.selectedCount > 0 ? (
        <Group>
          <Button
            onClick={batch.onDeleteSelected}
            disabled={batch.isBatchLoading}
            loading={batch.isDeleting}
            variant="destructive"
          >
            <IconShake mode="hover">
              <Trash2Icon />
            </IconShake>
            Delete ({batch.selectedCount})
          </Button>
          {batch.onAddSelectedToPortfolio ? (
            <>
              <GroupSeparator />
              <Button
                onClick={batch.onAddSelectedToPortfolio}
                disabled={batch.isBatchLoading}
                loading={batch.isAddingToPortfolio}
                variant="secondary"
              >
                <BookmarkPlusIcon />
                Add to portfolio
              </Button>
            </>
          ) : null}
          {batch.onMerge ? (
            <>
              <GroupSeparator />
              <Button onClick={batch.onMerge} disabled={batch.isBatchLoading} variant="secondary">
                <GitMergeIcon />
                Merge ({batch.selectedCount})
              </Button>
            </>
          ) : null}
          <GroupSeparator />
          {batch.selectedCount < batch.totalCount ? (
            <Button onClick={batch.onSelectAll} disabled={batch.isBatchLoading} variant="secondary">
              <CheckIcon />
              Select all ({batch.totalCount})
            </Button>
          ) : (
            <Button onClick={batch.onClearSelection} variant="secondary">
              <X />
              Deselect all
            </Button>
          )}
        </Group>
      ) : (
        <>
          {organize?.isRunning ? (
            <Group>
              <GroupText aria-live="polite" className="cursor-default gap-2" role="status">
                <Spinner />
                <span className="max-w-45 min-w-fit shimmer truncate text-sm font-medium text-foreground">
                  {organize.currentStep ?? "Organizing"}
                </span>
              </GroupText>
              <GroupSeparator />
              <TooltipProvider delay={0}>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        aria-label="Cancel organize"
                        onClick={organize.onCancel}
                        size="icon"
                        variant="outline"
                      />
                    }
                  >
                    <XIcon aria-hidden="true" />
                  </TooltipTrigger>
                  <TooltipPopup>Cancel</TooltipPopup>
                </Tooltip>
              </TooltipProvider>
            </Group>
          ) : organize ? (
            <Button onClick={organize.onStart} variant="outline">
              <SparklesIcon aria-hidden="true" />
              Organize
            </Button>
          ) : null}
          {onSortStart && (
            <Button onClick={onSortStart} variant="outline">
              <ArrowUpDownIcon />
              Reorder
            </Button>
          )}
          {add?.onAdd && (
            <Button onClick={add.onAdd} loading={add.isLoading}>
              <IconMorph
                mode="hover"
                iconA={<PlusIcon aria-hidden />}
                iconB={<CheckIcon aria-hidden className="text-primary-foreground" />}
              />
              {add.label ?? "Add"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
