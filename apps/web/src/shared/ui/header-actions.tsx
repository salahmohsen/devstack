"use client";

import {
  ArrowUpDownIcon,
  BookmarkPlusIcon,
  CheckIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  X
} from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

type BatchConfig = {
  selectedCount: number;
  totalCount: number;
  isBatchLoading: boolean;
  isDeleting?: boolean;
  isAddingToPortfolio?: boolean;
  onDeleteSelected: () => void;
  onAddSelectedToPortfolio?: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
};

type HeaderActionProps = {
  add?: {
    onAdd?: () => void;
    label?: string;
    isLoading?: boolean;
  };
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

export function HeaderActions({ add, batch, sort }: HeaderActionProps) {
  const { isSort, isSortPending, onSortStart, onSortSave, onSortRestore, onSortCancel } =
    sort ?? {};

  const renderAdd = add?.onAdd && (
    <Button onClick={add.onAdd} loading={add.isLoading}>
      <PlusIcon />
      {add.label ?? "Add"}
    </Button>
  );

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
            <Trash2Icon />
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
          {onSortStart && (
            <Button onClick={onSortStart} variant="secondary">
              <ArrowUpDownIcon />
              Reorder
            </Button>
          )}
          {renderAdd}
        </>
      )}
    </div>
  );
}
