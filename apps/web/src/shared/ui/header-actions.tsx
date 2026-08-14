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
  X
} from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { IconMorph, IconShake } from "@tsu-stack/ui/components/icon-motion";

import { AiFlowTrigger } from "@/shared/ui/ai-flow-trigger";

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
          {organize ? (
            <AiFlowTrigger
              idleLabel="Organize"
              icon={<SparklesIcon aria-hidden />}
              running={organize.isRunning}
              stepLabel={organize.currentStep}
              runningFallback="Organizing"
              onStart={organize.onStart}
              onCancel={organize.onCancel}
              size="default"
              layout="default"
            />
          ) : null}
          {onSortStart && (
            <Button onClick={onSortStart} variant="outline" size="default">
              <ArrowUpDownIcon />
              Reorder
            </Button>
          )}
          {add?.onAdd && (
            <Button onClick={add.onAdd} loading={add.isLoading} size="default">
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
